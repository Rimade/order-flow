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
	brokers []string
}

func NewKafkaProducer(cfg config.Config) *KafkaProducer {
	return &KafkaProducer{brokers: cfg.KafkaBrokers}
}

func (p *KafkaProducer) Close() error {
	return nil
}

func (p *KafkaProducer) PublishRaw(
	ctx context.Context,
	topic string,
	key string,
	eventType string,
	eventID string,
	payload any,
) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal event: %w", err)
	}

	writer := &kafka.Writer{
		Addr:         kafka.TCP(p.brokers...),
		Topic:        topic,
		RequiredAcks: kafka.RequireAll,
	}
	defer writer.Close()

	return writer.WriteMessages(ctx, kafka.Message{
		Key:   []byte(key),
		Value: body,
		Headers: []kafka.Header{
			{Key: "event-type", Value: []byte(eventType)},
			{Key: "event-id", Value: []byte(eventID)},
		},
	})
}

func BuildSucceededEvent(
	paymentID string,
	orderID string,
	amount string,
	currency string,
) domain.PaymentSucceededEvent {
	event := domain.PaymentSucceededEvent{
		EventID:    uuid.NewString(),
		EventType:  "payment.succeeded",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.PaymentID = paymentID
	event.Data.OrderID = orderID
	event.Data.Amount = amount
	event.Data.Currency = currency

	return event
}

func BuildFailedEvent(
	paymentID string,
	orderID string,
	reason string,
) domain.PaymentFailedEvent {
	event := domain.PaymentFailedEvent{
		EventID:    uuid.NewString(),
		EventType:  "payment.failed",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.PaymentID = paymentID
	event.Data.OrderID = orderID
	event.Data.Reason = reason

	return event
}
