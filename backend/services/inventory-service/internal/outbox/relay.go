package outbox

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"orderflow/inventory-service/internal/config"
	"orderflow/inventory-service/internal/producer"
	sharedoutbox "orderflow/shared-observability/outbox"
)

type Relay struct {
	pool        *pgxpool.Pool
	producer    *producer.KafkaProducer
	dlq         *sharedoutbox.DlqPublisher
	cfg         config.Config
	logger      *slog.Logger
	serviceName string
}

func NewRelay(
	pool *pgxpool.Pool,
	producer *producer.KafkaProducer,
	cfg config.Config,
	logger *slog.Logger,
) *Relay {
	serviceName := "inventory-service"
	return &Relay{
		pool:        pool,
		producer:    producer,
		dlq: sharedoutbox.NewDlqPublisher(
			producer,
			serviceName,
			cfg.OutboxDLQTopic,
			logger,
		),
		cfg:         cfg,
		logger:      logger,
		serviceName: serviceName,
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
	ID         string
	Topic      string
	MessageKey string
	EventType  string
	Payload    []byte
	RetryCount int
}

type deadLetter struct {
	message   pendingMessage
	lastError string
	retry     int
}

func (r *Relay) dispatchBatch(ctx context.Context) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	rows, err := tx.Query(ctx, `
		SELECT id, topic, message_key, event_type, payload::text, retry_count
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
			&message.Topic,
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

	deadLetters := make([]deadLetter, 0)

	for _, message := range messages {
		var payload any
		if err = json.Unmarshal(message.Payload, &payload); err != nil {
			if r.markFailedTx(ctx, tx, message, err) {
				deadLetters = append(deadLetters, deadLetter{
					message:   message,
					lastError: err.Error(),
					retry:     message.RetryCount + 1,
				})
			}
			continue
		}

		if err = r.producer.PublishRaw(
			ctx,
			message.Topic,
			message.MessageKey,
			message.EventType,
			message.ID,
			payload,
		); err != nil {
			if r.markFailedTx(ctx, tx, message, err) {
				deadLetters = append(deadLetters, deadLetter{
					message:   message,
					lastError: err.Error(),
					retry:     message.RetryCount + 1,
				})
			}
			continue
		}

		if _, err = tx.Exec(ctx, `
			UPDATE outbox_messages
			SET status = 'PUBLISHED', published_at = NOW(), last_error = NULL
			WHERE id = $1
		`, message.ID); err != nil {
			return err
		}

		r.logger.Info("outbox published", "eventType", message.EventType, "id", message.ID)
	}

	if err = tx.Commit(ctx); err != nil {
		return err
	}

	for _, letter := range deadLetters {
		r.dlq.Publish(ctx, sharedoutbox.DeadLetterInput{
			OutboxID:          letter.message.ID,
			MessageKey:        letter.message.MessageKey,
			OriginalEventType: letter.message.EventType,
			Payload:           letter.message.Payload,
			LastError:         letter.lastError,
			RetryCount:        letter.retry,
			OriginalTopic:     letter.message.Topic,
		})
	}

	return nil
}

func (r *Relay) markFailedTx(
	ctx context.Context,
	tx pgx.Tx,
	message pendingMessage,
	cause error,
) bool {
	nextRetry := message.RetryCount + 1
	status := "PENDING"
	becameFailed := false
	if nextRetry >= r.cfg.OutboxMaxRetries {
		status = "FAILED"
		becameFailed = true
	}

	_, err := tx.Exec(ctx, `
		UPDATE outbox_messages
		SET retry_count = $2, last_error = $3, status = $4::outbox_status
		WHERE id = $1
	`, message.ID, nextRetry, cause.Error(), status)
	if err != nil {
		r.logger.Error("failed to update outbox retry", "id", message.ID, "error", err)
		return false
	}

	return becameFailed
}
