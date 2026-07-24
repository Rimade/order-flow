package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AnalyticsRepository struct {
	pool *pgxpool.Pool
}

func NewAnalyticsRepository(pool *pgxpool.Pool) *AnalyticsRepository {
	return &AnalyticsRepository{pool: pool}
}

func (r *AnalyticsRepository) Ping(ctx context.Context) error {
	return r.pool.Ping(ctx)
}

type RecordEventInput struct {
	EventID      string
	EventType    string
	OrderID      string
	OccurredAt   time.Time
	MappedStatus string
	Amount       *string
	Currency     *string
}

func (r *AnalyticsRepository) RecordEvent(ctx context.Context, in RecordEventInput) (bool, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	var exists bool
	if err = tx.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = $1)`,
		in.EventID,
	).Scan(&exists); err != nil {
		return false, err
	}
	if exists {
		return false, nil
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO order_events (event_id, event_type, order_id, occurred_at, mapped_status, amount, currency)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		in.EventID,
		in.EventType,
		in.OrderID,
		in.OccurredAt,
		in.MappedStatus,
		in.Amount,
		in.Currency,
	)
	if err != nil {
		return false, err
	}

	year, month, dayNum := in.OccurredAt.UTC().Date()
	day := time.Date(year, month, dayNum, 0, 0, 0, 0, time.UTC)
	_, err = tx.Exec(
		ctx,
		`INSERT INTO order_status_daily (day, status, count)
		 VALUES ($1, $2, 1)
		 ON CONFLICT (day, status) DO UPDATE SET count = order_status_daily.count + 1`,
		day,
		in.MappedStatus,
	)
	if err != nil {
		return false, err
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)`,
		in.EventID,
		in.EventType,
	)
	if err != nil {
		return false, err
	}

	if err = tx.Commit(ctx); err != nil {
		return false, err
	}

	return true, nil
}

type DailyStatusCount struct {
	Day    time.Time `json:"day"`
	Status string    `json:"status"`
	Count  int64     `json:"count"`
}

func (r *AnalyticsRepository) OrdersByDay(ctx context.Context, since time.Time) ([]DailyStatusCount, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT day, status, count
		 FROM order_status_daily
		 WHERE day >= $1
		 ORDER BY day ASC, status ASC`,
		since.UTC(),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]DailyStatusCount, 0)
	for rows.Next() {
		var row DailyStatusCount
		if err = rows.Scan(&row.Day, &row.Status, &row.Count); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

type StatusTotal struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

func (r *AnalyticsRepository) SummaryTotals(ctx context.Context) ([]StatusTotal, error) {
	rows, err := r.pool.Query(
		ctx,
		`SELECT status, COALESCE(SUM(count), 0)::bigint
		 FROM order_status_daily
		 GROUP BY status
		 ORDER BY status`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]StatusTotal, 0)
	for rows.Next() {
		var row StatusTotal
		if err = rows.Scan(&row.Status, &row.Count); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rows.Err()
}

func (r *AnalyticsRepository) EventCount(ctx context.Context) (int64, error) {
	var count int64
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM order_events`).Scan(&count)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return 0, nil
		}
		return 0, err
	}
	return count, nil
}
