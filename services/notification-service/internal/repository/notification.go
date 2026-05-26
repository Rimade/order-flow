package repository

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type NotificationRepository struct {
	pool *pgxpool.Pool
}

func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{pool: pool}
}

func (r *NotificationRepository) Ping(ctx context.Context) error {
	return r.pool.Ping(ctx)
}

func (r *NotificationRepository) IsMessageProcessed(ctx context.Context, messageID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(
		ctx,
		`SELECT EXISTS(SELECT 1 FROM notification_deliveries WHERE message_id = $1)`,
		messageID,
	).Scan(&exists)

	return exists, err
}

func (r *NotificationRepository) SaveDelivery(
	ctx context.Context,
	messageID string,
	orderID string,
	paymentID string,
	channel string,
	notificationType string,
	status string,
	lastError string,
) error {
	_, err := r.pool.Exec(
		ctx,
		`INSERT INTO notification_deliveries (
			id, message_id, order_id, payment_id, channel, notification_type, status, last_error, delivered_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $7 = 'DELIVERED' THEN NOW() ELSE NULL END)
		 ON CONFLICT (message_id) DO NOTHING`,
		uuid.NewString(),
		messageID,
		orderID,
		paymentID,
		channel,
		notificationType,
		status,
		nullIfEmpty(lastError),
	)

	return err
}

func nullIfEmpty(value string) any {
	if value == "" {
		return nil
	}

	return value
}
