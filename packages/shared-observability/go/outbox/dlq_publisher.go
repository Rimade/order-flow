package outbox

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"orderflow/shared-observability/dlq"
)

type RawPublisher interface {
	PublishRaw(
		ctx context.Context,
		topic string,
		key string,
		eventType string,
		eventID string,
		payload any,
	) error
}

type DlqPublisher struct {
	producer    RawPublisher
	serviceName string
	dlqTopic    string
	logger      *slog.Logger
}

func NewDlqPublisher(
	producer RawPublisher,
	serviceName string,
	dlqTopic string,
	logger *slog.Logger,
) *DlqPublisher {
	return &DlqPublisher{
		producer:    producer,
		serviceName: serviceName,
		dlqTopic:    dlqTopic,
		logger:      logger,
	}
}

type DeadLetterInput struct {
	OutboxID          string
	MessageKey        string
	OriginalEventType string
	Payload           []byte
	LastError         string
	RetryCount        int
	Destination       string
	OriginalTopic     string
	RoutingKey        string
}

func (p *DlqPublisher) Publish(ctx context.Context, input DeadLetterInput) {
	if p.dlqTopic == "" {
		return
	}

	envelope := dlq.NewEnvelope(
		p.serviceName,
		input.OutboxID,
		input.MessageKey,
		input.OriginalEventType,
		json.RawMessage(input.Payload),
		input.LastError,
		input.RetryCount,
	)
	envelope.Data.Destination = input.Destination
	envelope.Data.OriginalTopic = input.OriginalTopic
	envelope.Data.RoutingKey = input.RoutingKey

	if err := p.producer.PublishRaw(
		ctx,
		p.dlqTopic,
		input.MessageKey,
		dlq.EventType,
		uuid.NewString(),
		envelope,
	); err != nil {
		p.logger.Error(
			"failed to publish outbox dead letter",
			"outboxId", input.OutboxID,
			"error", err,
		)
		return
	}

	p.logger.Error(
		"outbox dead letter published",
		"topic", p.dlqTopic,
		"outboxId", input.OutboxID,
	)
}
