package outbox

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"orderflow/payment-service/internal/config"
	"orderflow/payment-service/internal/producer"
	"orderflow/payment-service/internal/rabbitmq"
)

type Relay struct {
	pool            *pgxpool.Pool
	kafkaProducer   *producer.KafkaProducer
	rabbitPublisher *rabbitmq.Publisher
	cfg             config.Config
	logger          *slog.Logger
}

func NewRelay(
	pool *pgxpool.Pool,
	kafkaProducer *producer.KafkaProducer,
	rabbitPublisher *rabbitmq.Publisher,
	cfg config.Config,
	logger *slog.Logger,
) *Relay {
	return &Relay{
		pool:            pool,
		kafkaProducer:   kafkaProducer,
		rabbitPublisher: rabbitPublisher,
		cfg:             cfg,
		logger:          logger,
	}
}

func (r *Relay) Run(ctx context.Context) {
	ticker := time.NewTicker(time.Duration(r.cfg.OutboxPollIntervalMs) * time.Millisecond)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			if err := r.dispatchBatch(ctx); err != nil {
				r.logger.Error("outbox dispatch batch failed", "error", err)
			}
		}
	}
}

type pendingMessage struct {
	ID          string
	Destination string
	Topic       *string
	RoutingKey  *string
	Exchange    *string
	MessageKey  string
	EventType   string
	Payload     []byte
	RetryCount  int
}

func (r *Relay) dispatchBatch(ctx context.Context) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, destination, topic, routing_key, exchange, message_key, event_type, payload::text, retry_count
		FROM outbox_messages
		WHERE status = 'PENDING'
		  AND retry_count < $1
		ORDER BY created_at ASC
		LIMIT $2
		FOR UPDATE SKIP LOCKED
	`, r.cfg.OutboxMaxRetries, r.cfg.OutboxBatchSize)
	if err != nil {
		return err
	}

	messages := make([]pendingMessage, 0)
	for rows.Next() {
		var message pendingMessage
		var payload string
		if scanErr := rows.Scan(
			&message.ID,
			&message.Destination,
			&message.Topic,
			&message.RoutingKey,
			&message.Exchange,
			&message.MessageKey,
			&message.EventType,
			&payload,
			&message.RetryCount,
		); scanErr != nil {
			rows.Close()
			return scanErr
		}
		message.Payload = []byte(payload)
		messages = append(messages, message)
	}
	rows.Close()

	if err = rows.Err(); err != nil {
		return err
	}

	for _, message := range messages {
		if err = r.publishMessage(ctx, message); err != nil {
			r.markFailedTx(ctx, tx, message, err)
			continue
		}

		if _, err = tx.Exec(ctx, `
			UPDATE outbox_messages
			SET status = 'PUBLISHED', published_at = NOW(), last_error = NULL
			WHERE id = $1
		`, message.ID); err != nil {
			return err
		}

		r.logger.Info(
			"outbox published",
			"destination", message.Destination,
			"eventType", message.EventType,
			"id", message.ID,
		)
	}

	return tx.Commit(ctx)
}

func (r *Relay) publishMessage(ctx context.Context, message pendingMessage) error {
	switch message.Destination {
	case "kafka":
		if message.Topic == nil {
			return errMissingTopic
		}

		var payload any
		if err := json.Unmarshal(message.Payload, &payload); err != nil {
			return err
		}

		return r.kafkaProducer.PublishRaw(
			ctx,
			*message.Topic,
			message.MessageKey,
			message.EventType,
			message.ID,
			payload,
		)
	case "rabbitmq":
		if message.RoutingKey == nil {
			return errMissingRoutingKey
		}

		var notification rabbitmq.NotificationMessage
		if err := json.Unmarshal(message.Payload, &notification); err != nil {
			return err
		}

		return r.rabbitPublisher.PublishNotification(ctx, *message.RoutingKey, notification)
	default:
		return errUnknownDestination
	}
}

func (r *Relay) markFailedTx(ctx context.Context, tx pgx.Tx, message pendingMessage, cause error) {
	nextRetry := message.RetryCount + 1
	status := "PENDING"
	if nextRetry >= r.cfg.OutboxMaxRetries {
		status = "FAILED"
	}

	_, err := tx.Exec(ctx, `
		UPDATE outbox_messages
		SET retry_count = $2, last_error = $3, status = $4::outbox_status
		WHERE id = $1
	`, message.ID, nextRetry, cause.Error(), status)
	if err != nil {
		r.logger.Error("failed to update outbox retry", "id", message.ID, "error", err)
	}
}

var (
	errMissingTopic      = errString("outbox kafka message missing topic")
	errMissingRoutingKey = errString("outbox rabbitmq message missing routing key")
	errUnknownDestination = errString("unknown outbox destination")
)

type errString string

func (e errString) Error() string {
	return string(e)
}
