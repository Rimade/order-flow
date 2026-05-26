package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"orderflow/notification-service/internal/domain"
	"orderflow/notification-service/internal/repository"
)

type NotificationService struct {
	repo   *repository.NotificationRepository
	logger *slog.Logger
}

func NewNotificationService(
	repo *repository.NotificationRepository,
	logger *slog.Logger,
) *NotificationService {
	return &NotificationService{repo: repo, logger: logger}
}

func (s *NotificationService) HandleMessage(ctx context.Context, body []byte) error {
	var message domain.NotificationMessage
	if err := json.Unmarshal(body, &message); err != nil {
		s.logger.Error("invalid notification payload", "error", err)
		return nil
	}

	processed, err := s.repo.IsMessageProcessed(ctx, message.MessageID)
	if err != nil {
		return err
	}
	if processed {
		s.logger.Info("skip duplicate notification", "messageId", message.MessageID)
		return nil
	}

	if err = s.deliver(ctx, message); err != nil {
		saveErr := s.repo.SaveDelivery(
			ctx,
			message.MessageID,
			message.OrderID,
			message.PaymentID,
			message.Channel,
			message.Type,
			"FAILED",
			err.Error(),
		)
		if saveErr != nil {
			return saveErr
		}

		return err
	}

	return s.repo.SaveDelivery(
		ctx,
		message.MessageID,
		message.OrderID,
		message.PaymentID,
		message.Channel,
		message.Type,
		"DELIVERED",
		"",
	)
}

func (s *NotificationService) deliver(ctx context.Context, message domain.NotificationMessage) error {
	_ = ctx

	switch message.Type {
	case "payment.succeeded":
		s.logger.Info(
			"email sent (simulated)",
			"channel", message.Channel,
			"orderId", message.OrderID,
			"paymentId", message.PaymentID,
			"amount", message.Amount,
			"currency", message.Currency,
			"subject", fmt.Sprintf("Order %s paid successfully", message.OrderID),
		)
		return nil
	case "payment.failed":
		s.logger.Info(
			"email sent (simulated)",
			"channel", message.Channel,
			"orderId", message.OrderID,
			"paymentId", message.PaymentID,
			"reason", message.Reason,
			"subject", fmt.Sprintf("Payment failed for order %s", message.OrderID),
		)
		return nil
	default:
		s.logger.Warn("unknown notification type", "type", message.Type)
		return nil
	}
}
