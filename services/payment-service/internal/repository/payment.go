package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type PaymentRepository struct {
	pool *pgxpool.Pool
}

func NewPaymentRepository(pool *pgxpool.Pool) *PaymentRepository {
	return &PaymentRepository{pool: pool}
}

func (r *PaymentRepository) Ping(ctx context.Context) error {
	return r.pool.Ping(ctx)
}

func (r *PaymentRepository) IsEventProcessed(ctx context.Context, eventID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = $1)`,
		eventID,
	).Scan(&exists)

	return exists, err
}

func (r *PaymentRepository) MarkEventProcessed(
	ctx context.Context,
	eventID string,
	eventType string,
) error {
	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)
		 ON CONFLICT (event_id) DO NOTHING`,
		eventID,
		eventType,
	)

	return err
}

func (r *PaymentRepository) CreatePayment(
	ctx context.Context,
	orderID string,
	amount string,
	currency string,
	status string,
) (string, error) {
	paymentID := uuid.NewString()

	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO payments (id, order_id, amount, currency, status)
		 VALUES ($1, $2, $3::numeric, $4, $5)`,
		paymentID,
		orderID,
		amount,
		currency,
		status,
	)
	if err != nil {
		return "", err
	}

	return paymentID, nil
}
