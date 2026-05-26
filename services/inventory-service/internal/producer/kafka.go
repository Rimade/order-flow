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
)

type KafkaProducer struct {
	reservedWriter *kafka.Writer
	rejectedWriter *kafka.Writer
}

func NewKafkaProducer(cfg config.Config) *KafkaProducer {
	return &KafkaProducer{
		reservedWriter: &kafka.Writer{
			Addr:         kafka.TCP(cfg.KafkaBrokers...),
			Topic:        cfg.KafkaInventoryReservedTopic,
			RequiredAcks: kafka.RequireAll,
			Balancer:     &kafka.LeastBytes{},
		},
		rejectedWriter: &kafka.Writer{
			Addr:         kafka.TCP(cfg.KafkaBrokers...),
			Topic:        cfg.KafkaInventoryRejectedTopic,
			RequiredAcks: kafka.RequireAll,
			Balancer:     &kafka.LeastBytes{},
		},
	}
}

func (p *KafkaProducer) Close() error {
	reservedErr := p.reservedWriter.Close()
	rejectedErr := p.rejectedWriter.Close()

	if reservedErr != nil {
		return reservedErr
	}

	return rejectedErr
}

func (p *KafkaProducer) PublishReserved(
	ctx context.Context,
	orderID string,
	totalAmount string,
	currency string,
	reservations []domain.ReservationItem,
) error {
	event := domain.InventoryReservedEvent{
		EventID:    uuid.NewString(),
		EventType:  "inventory.reserved",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.OrderID = orderID
	event.Data.TotalAmount = totalAmount
	event.Data.Currency = currency
	event.Data.Reservations = reservations

	return p.publish(ctx, p.reservedWriter, orderID, event.EventType, event.EventID, event)
}

func (p *KafkaProducer) PublishRejected(
	ctx context.Context,
	orderID string,
	reason string,
	productID string,
) error {
	event := domain.InventoryRejectedEvent{
		EventID:    uuid.NewString(),
		EventType:  "inventory.rejected",
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
	}
	event.Data.OrderID = orderID
	event.Data.Reason = reason
	event.Data.ProductID = productID

	return p.publish(ctx, p.rejectedWriter, orderID, event.EventType, event.EventID, event)
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

	message := kafka.Message{
		Key:   []byte(key),
		Value: body,
		Headers: []kafka.Header{
			{Key: "event-type", Value: []byte(eventType)},
			{Key: "event-id", Value: []byte(eventID)},
		},
	}

	if err = writer.WriteMessages(ctx, message); err != nil {
		return fmt.Errorf("write kafka message: %w", err)
	}

	return nil
}
