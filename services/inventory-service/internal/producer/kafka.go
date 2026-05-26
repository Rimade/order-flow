package producer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"
	"orderflow/inventory-service/internal/config"
	"orderflow/inventory-service/internal/domain"
	"orderflow/shared-observability/telemetry"
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
		Balancer:     &kafka.LeastBytes{},
	}
	defer writer.Close()

	headers := telemetry.InjectKafkaHeaders(ctx, []kafka.Header{
		{Key: "event-type", Value: []byte(eventType)},
		{Key: "event-id", Value: []byte(eventID)},
	})

	return writer.WriteMessages(ctx, kafka.Message{
		Key:     []byte(key),
		Value:   body,
		Headers: headers,
	})
}

func BuildReservedEvent(
	orderID string,
	totalAmount string,
	currency string,
	reservations []domain.ReservationItem,
) domain.InventoryReservedEvent {
	event := domain.InventoryReservedEvent{
		EventID:    uuid.NewString(),
		EventType:  "inventory.reserved",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.OrderID = orderID
	event.Data.TotalAmount = totalAmount
	event.Data.Currency = currency
	event.Data.Reservations = reservations

	return event
}

func BuildRejectedEvent(
	orderID string,
	reason string,
	productID string,
) domain.InventoryRejectedEvent {
	event := domain.InventoryRejectedEvent{
		EventID:    uuid.NewString(),
		EventType:  "inventory.rejected",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.OrderID = orderID
	event.Data.Reason = reason
	event.Data.ProductID = productID

	return event
}
