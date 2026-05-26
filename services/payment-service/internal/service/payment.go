package service

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
	"orderflow/payment-service/internal/config"
	"orderflow/payment-service/internal/domain"
	"orderflow/payment-service/internal/producer"
	"orderflow/payment-service/internal/rabbitmq"
	"orderflow/payment-service/internal/repository"
)

type PaymentService struct {
	repo   *repository.PaymentRepository
	cfg    config.Config
	logger *slog.Logger
}

func NewPaymentService(
	repo *repository.PaymentRepository,
	cfg config.Config,
	logger *slog.Logger,
) *PaymentService {
	return &PaymentService{repo: repo, cfg: cfg, logger: logger}
}

func (s *PaymentService) HandleInventoryReserved(ctx context.Context, payload []byte) error {
	var event domain.InventoryReservedEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		s.logger.Error("invalid inventory.reserved payload", "error", err)
		return nil
	}

	if event.EventType != "inventory.reserved" {
		s.logger.Warn("skip unknown event type", "eventType", event.EventType)
		return nil
	}

	processed, err := s.repo.IsEventProcessed(ctx, event.EventID)
	if err != nil {
		return err
	}
	if processed {
		s.logger.Info("skip duplicate event", "eventId", event.EventID)
		return nil
	}

	status := "FAILED"
	if s.cfg.PaymentSimulateSuccess {
		status = "SUCCEEDED"
	}

	if status == "SUCCEEDED" {
		return s.processSucceeded(ctx, event)
	}

	return s.processFailed(ctx, event)
}

func (s *PaymentService) processSucceeded(
	ctx context.Context,
	event domain.InventoryReservedEvent,
) error {
	paymentID := uuid.NewString()
	kafkaEvent := producer.BuildSucceededEvent(
		paymentID,
		event.Data.OrderID,
		event.Data.TotalAmount,
		event.Data.Currency,
	)

	kafkaPayload, err := json.Marshal(kafkaEvent)
	if err != nil {
		return err
	}

	notification := rabbitmq.NotificationMessage{
		MessageID: uuid.NewString(),
		Type:      "payment.succeeded",
		OrderID:   event.Data.OrderID,
		PaymentID: paymentID,
		Channel:   "email",
		Amount:    event.Data.TotalAmount,
		Currency:  event.Data.Currency,
	}

	_, err = s.repo.ProcessPaymentWithOutbox(
		ctx,
		paymentID,
		event.EventID,
		event.Data.OrderID,
		event.Data.TotalAmount,
		event.Data.Currency,
		"SUCCEEDED",
		s.cfg.KafkaPaymentSucceededTopic,
		kafkaEvent.EventType,
		kafkaEvent.EventID,
		kafkaPayload,
		"notification.payment.succeeded",
		notification,
	)
	if err != nil {
		return err
	}

	s.logger.Info("payment recorded (outbox)", "orderId", event.Data.OrderID, "paymentId", paymentID)
	return nil
}

func (s *PaymentService) processFailed(
	ctx context.Context,
	event domain.InventoryReservedEvent,
) error {
	paymentID := uuid.NewString()
	kafkaEvent := producer.BuildFailedEvent(paymentID, event.Data.OrderID, "payment_declined")
	kafkaEvent.EventID = uuid.NewString()

	kafkaPayload, err := json.Marshal(kafkaEvent)
	if err != nil {
		return err
	}

	notification := rabbitmq.NotificationMessage{
		MessageID: uuid.NewString(),
		Type:      "payment.failed",
		OrderID:   event.Data.OrderID,
		PaymentID: paymentID,
		Channel:   "email",
		Reason:    "payment_declined",
	}

	createdPaymentID, err := s.repo.ProcessPaymentWithOutbox(
		ctx,
		paymentID,
		event.EventID,
		event.Data.OrderID,
		event.Data.TotalAmount,
		event.Data.Currency,
		"FAILED",
		s.cfg.KafkaPaymentFailedTopic,
		kafkaEvent.EventType,
		kafkaEvent.EventID,
		kafkaPayload,
		"notification.payment.failed",
		notification,
	)
	if err != nil {
		return err
	}

	s.logger.Warn("payment failed (outbox)", "orderId", event.Data.OrderID, "paymentId", createdPaymentID)
	return nil
}
