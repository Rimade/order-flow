package producer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
	"orderflow/payment-service/internal/config"
	"orderflow/payment-service/internal/domain"
)

type KafkaProducer struct {
	succeededWriter *kafka.Writer
	failedWriter    *kafka.Writer
}

func NewKafkaProducer(cfg config.Config) *KafkaProducer {
	return &KafkaProducer{
		succeededWriter: &kafka.Writer{
			Addr:         kafka.TCP(cfg.KafkaBrokers...),
			Topic:        cfg.KafkaPaymentSucceededTopic,
			RequiredAcks: kafka.RequireAll,
		},
		failedWriter: &kafka.Writer{
			Addr:         kafka.TCP(cfg.KafkaBrokers...),
			Topic:        cfg.KafkaPaymentFailedTopic,
			RequiredAcks: kafka.RequireAll,
		},
	}
}

func (p *KafkaProducer) Close() error {
	if err := p.succeededWriter.Close(); err != nil {
		return err
	}

	return p.failedWriter.Close()
}

func (p *KafkaProducer) PublishSucceeded(
	ctx context.Context,
	paymentID string,
	orderID string,
	amount string,
	currency string,
) error {
	event := domain.PaymentSucceededEvent{
		EventID:    uuid.NewString(),
		EventType:  "payment.succeeded",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.PaymentID = paymentID
	event.Data.OrderID = orderID
	event.Data.Amount = amount
	event.Data.Currency = currency

	return p.publish(ctx, p.succeededWriter, orderID, event.EventType, event.EventID, event)
}

func (p *KafkaProducer) PublishFailed(
	ctx context.Context,
	paymentID string,
	orderID string,
	reason string,
) error {
	event := domain.PaymentFailedEvent{
		EventID:    uuid.NewString(),
		EventType:  "payment.failed",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.PaymentID = paymentID
	event.Data.OrderID = orderID
	event.Data.Reason = reason

	return p.publish(ctx, p.failedWriter, orderID, event.EventType, event.EventID, event)
}

func (p *KafkaProducer) publish(
	ctx context.Context,
	writer *kafka.Writer,
	key string,
	eventType string,
	eventID string,
	payload any,
) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	return writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(key),
		Value: body,
		Headers: []kafka.Header{
			{Key: "event-type", Value: []byte(eventType)},
			{Key: "event-id", Value: []byte(eventID)},
		},
	})
}
