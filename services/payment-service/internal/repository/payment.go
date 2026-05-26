package repository

import (
	"context"
	"encoding/json"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"orderflow/payment-service/internal/rabbitmq"
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

type OutboxEntry struct {
	ID          string
	Destination string
	Topic       *string
	RoutingKey  *string
	MessageKey  string
	EventType   string
	Payload     []byte
}

func (r *PaymentRepository) ProcessPaymentWithOutbox(
	ctx context.Context,
	paymentID string,
	sourceEventID string,
	orderID string,
	amount string,
	currency string,
	status string,
	kafkaTopic string,
	kafkaEventType string,
	kafkaOutboxID string,
	kafkaPayload []byte,
	rabbitRoutingKey string,
	rabbitMessage rabbitmq.NotificationMessage,
) (string, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return "", err
	}
	defer tx.Rollback(ctx)

	_, err = tx.Exec(
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

	_, err = tx.Exec(
		ctx,
		`INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2)`,
		sourceEventID,
		"inventory.reserved",
	)
	if err != nil {
		return "", err
	}

	if err = r.insertOutbox(ctx, tx, OutboxEntry{
		ID:          kafkaOutboxID,
		Destination: "kafka",
		Topic:       &kafkaTopic,
		MessageKey:  orderID,
		EventType:   kafkaEventType,
		Payload:     kafkaPayload,
	}); err != nil {
		return "", err
	}

	rabbitPayload, err := json.Marshal(rabbitMessage)
	if err != nil {
		return "", err
	}

	if err = r.insertOutbox(ctx, tx, OutboxEntry{
		ID:          rabbitMessage.MessageID,
		Destination: "rabbitmq",
		RoutingKey:  &rabbitRoutingKey,
		MessageKey:  orderID,
		EventType:   rabbitMessage.Type,
		Payload:     rabbitPayload,
	}); err != nil {
		return "", err
	}

	if err = tx.Commit(ctx); err != nil {
		return "", err
	}

	return paymentID, nil
}

func (r *PaymentRepository) insertOutbox(ctx context.Context, tx pgx.Tx, entry OutboxEntry) error {
	_, err := tx.Exec(
		ctx,
		`INSERT INTO outbox_messages (
			id, aggregate_id, event_type, destination, topic, routing_key, message_key, payload, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, 'PENDING')`,
		entry.ID,
		entry.MessageKey,
		entry.EventType,
		entry.Destination,
		entry.Topic,
		entry.RoutingKey,
		entry.MessageKey,
		string(entry.Payload),
	)

	return err
}
