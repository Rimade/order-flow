package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"orderflow/inventory-service/internal/domain"
	"orderflow/inventory-service/internal/producer"
)

var ErrInsufficientStock = errors.New("insufficient stock")

type InventoryRepository struct {
	pool *pgxpool.Pool
}

func NewInventoryRepository(pool *pgxpool.Pool) *InventoryRepository {
	return &InventoryRepository{pool: pool}
}

func (r *InventoryRepository) Ping(ctx context.Context) error {
	return r.pool.Ping(ctx)
}

func (r *InventoryRepository) MarkEventProcessed(
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

func (r *InventoryRepository) IsEventProcessed(ctx context.Context, eventID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM processed_events WHERE event_id = $1)`,
		eventID,
	).Scan(&exists)

	return exists, err
}

func (r *InventoryRepository) insertOutbox(
	ctx context.Context,
	tx pgx.Tx,
	outboxID string,
	aggregateID string,
	topic string,
	messageKey string,
	eventType string,
	payload []byte,
) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO outbox_messages (
			id, aggregate_id, event_type, topic, message_key, payload, status
		) VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'PENDING')`,
		outboxID,
		aggregateID,
		eventType,
		topic,
		messageKey,
		string(payload),
	)

	return err
}

func (r *InventoryRepository) ReserveOrderWithOutbox(
	ctx context.Context,
	sourceEventID string,
	orderID string,
	items []domain.OrderCreatedItem,
	totalAmount string,
	currency string,
	reservedTopic string,
) ([]domain.ReservationItem, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	reservations := make([]domain.ReservationItem, 0, len(items))

	for _, item := range items {
		var availableQty int
		err = tx.QueryRow(
			ctx,
			`SELECT available_qty FROM products WHERE product_id = $1 FOR UPDATE`,
			item.ProductID,
		).Scan(&availableQty)

		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("%w: product %s not found", ErrInsufficientStock, item.ProductID)
		}
		if err != nil {
			return nil, err
		}

		if availableQty < item.Quantity {
			return nil, fmt.Errorf(
				"%w: product %s requested %d available %d",
				ErrInsufficientStock,
				item.ProductID,
				item.Quantity,
				availableQty,
			)
		}

		_, err = tx.Exec(
			ctx,
			`UPDATE products
			 SET available_qty = available_qty - $2,
			     reserved_qty = reserved_qty + $2,
			     updated_at = NOW()
			 WHERE product_id = $1`,
			item.ProductID,
			item.Quantity,
		)
		if err != nil {
			return nil, err
		}

		reservationID := uuid.NewString()
		_, err = tx.Exec(
			ctx,
			`INSERT INTO reservations (id, order_id, product_id, quantity, status)
			 VALUES ($1, $2, $3, $4, 'ACTIVE')`,
			reservationID,
			orderID,
			item.ProductID,
			item.Quantity,
		)
		if err != nil {
			return nil, err
		}

		reservations = append(reservations, domain.ReservationItem{
			ProductID: item.ProductID,
			Quantity:  item.Quantity,
		})
	}

	_, err = tx.Exec(
		ctx,
		`INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)`,
		sourceEventID,
		"order.created",
	)
	if err != nil {
		return nil, err
	}

	reservedEvent := producer.BuildReservedEvent(orderID, totalAmount, currency, reservations)
	payload, err := json.Marshal(reservedEvent)
	if err != nil {
		return nil, err
	}

	if err = r.insertOutbox(
		ctx,
		tx,
		reservedEvent.EventID,
		orderID,
		reservedTopic,
		orderID,
		reservedEvent.EventType,
		payload,
	); err != nil {
		return nil, err
	}

	if err = tx.Commit(ctx); err != nil {
		return nil, err
	}

	return reservations, nil
}

func (r *InventoryRepository) RecordRejectionWithOutbox(
	ctx context.Context,
	sourceEventID string,
	orderID string,
	reason string,
	productID string,
	rejectedTopic string,
) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(
		ctx,
		`INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)`,
		sourceEventID,
		"order.created",
	)
	if err != nil {
		return err
	}

	rejectedEvent := producer.BuildRejectedEvent(orderID, reason, productID)
	payload, err := json.Marshal(rejectedEvent)
	if err != nil {
		return err
	}

	if err = r.insertOutbox(
		ctx,
		tx,
		rejectedEvent.EventID,
		orderID,
		rejectedTopic,
		orderID,
		rejectedEvent.EventType,
		payload,
	); err != nil {
		return err
	}

	return tx.Commit(ctx)
}
