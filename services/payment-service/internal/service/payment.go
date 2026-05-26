package service

import (
	"context"
	"encoding/json"
	"log/slog"

	"orderflow/payment-service/internal/config"
	"orderflow/payment-service/internal/domain"
	"orderflow/payment-service/internal/producer"
	"orderflow/payment-service/internal/rabbitmq"
	"orderflow/payment-service/internal/repository"
)

type PaymentService struct {
	repo            *repository.PaymentRepository
	kafkaProducer   *producer.KafkaProducer
	rabbitPublisher *rabbitmq.Publisher
	cfg             config.Config
	logger          *slog.Logger
}

func NewPaymentService(
	repo *repository.PaymentRepository,
	kafkaProducer *producer.KafkaProducer,
	rabbitPublisher *rabbitmq.Publisher,
	cfg config.Config,
	logger *slog.Logger,
) *PaymentService {
	return &PaymentService{
		repo:            repo,
		kafkaProducer:   kafkaProducer,
		rabbitPublisher: rabbitPublisher,
		cfg:             cfg,
		logger:          logger,
	}
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

	paymentID, err := s.repo.CreatePayment(
		ctx,
		event.Data.OrderID,
		event.Data.TotalAmount,
		event.Data.Currency,
		status,
	)
	if err != nil {
		return err
	}

	if err = s.repo.MarkEventProcessed(ctx, event.EventID, event.EventType); err != nil {
		return err
	}

	if status == "SUCCEEDED" {
		s.logger.Info("payment succeeded", "orderId", event.Data.OrderID, "paymentId", paymentID)

		if err = s.kafkaProducer.PublishSucceeded(
			ctx,
			paymentID,
			event.Data.OrderID,
			event.Data.TotalAmount,
			event.Data.Currency,
		); err != nil {
			return err
		}

		return s.rabbitPublisher.PublishPaymentSucceeded(
			ctx,
			event.Data.OrderID,
			paymentID,
			event.Data.TotalAmount,
			event.Data.Currency,
		)
	}

	s.logger.Warn("payment failed", "orderId", event.Data.OrderID, "paymentId", paymentID)

	if err = s.kafkaProducer.PublishFailed(ctx, paymentID, event.Data.OrderID, "payment_declined"); err != nil {
		return err
	}

	return s.rabbitPublisher.PublishPaymentFailed(
		ctx,
		event.Data.OrderID,
		paymentID,
		"payment_declined",
	)
}
