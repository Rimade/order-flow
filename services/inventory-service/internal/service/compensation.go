package service

import (
	"context"
	"encoding/json"
	"log/slog"

	"orderflow/inventory-service/internal/domain"
	"orderflow/inventory-service/internal/repository"
)

type CompensationService struct {
	repo   *repository.InventoryRepository
	logger *slog.Logger
}

func NewCompensationService(
	repo *repository.InventoryRepository,
	logger *slog.Logger,
) *CompensationService {
	return &CompensationService{repo: repo, logger: logger}
}

func (s *CompensationService) HandlePaymentFailed(ctx context.Context, payload []byte) error {
	var event domain.PaymentFailedEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		s.logger.Error("invalid payment.failed payload", "error", err)
		return nil
	}

	if event.EventType != "payment.failed" {
		s.logger.Warn("skip unknown event type", "eventType", event.EventType)
		return nil
	}

	processed, err := s.repo.IsEventProcessed(ctx, event.EventID)
	if err != nil {
		return err
	}
	if processed {
		s.logger.Info("skip duplicate compensation event", "eventId", event.EventID)
		return nil
	}

	released, err := s.repo.ReleaseOrderReservations(ctx, event.EventID, event.Data.OrderID)
	if err != nil {
		return err
	}

	s.logger.Info(
		"inventory compensation completed",
		"orderId", event.Data.OrderID,
		"releasedLines", released,
	)

	return nil
}
