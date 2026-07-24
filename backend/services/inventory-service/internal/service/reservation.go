package service

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"

	"orderflow/inventory-service/internal/config"
	"orderflow/inventory-service/internal/domain"
	"orderflow/inventory-service/internal/metrics"
	"orderflow/inventory-service/internal/repository"
)

type ReservationService struct {
	repo   *repository.InventoryRepository
	cfg    config.Config
	logger *slog.Logger
}

func NewReservationService(
	repo *repository.InventoryRepository,
	cfg config.Config,
	logger *slog.Logger,
) *ReservationService {
	return &ReservationService{repo: repo, cfg: cfg, logger: logger}
}

func (s *ReservationService) HandleOrderCreated(ctx context.Context, payload []byte) error {
	var event domain.OrderCreatedEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		s.logger.Error("invalid order.created payload", "error", err)
		return nil
	}

	if event.EventType != "order.created" {
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

	reservations, err := s.repo.ReserveOrderWithOutbox(
		ctx,
		event.EventID,
		event.Data.OrderID,
		event.Data.Items,
		event.Data.TotalAmount,
		event.Data.Currency,
		s.cfg.KafkaInventoryReservedTopic,
	)
	if err != nil {
		reason := "reservation_failed"
		productID := ""

		if errors.Is(err, repository.ErrInsufficientStock) || strings.Contains(err.Error(), "insufficient stock") {
			reason = "insufficient_stock"
			productID = extractProductID(err.Error())
		}

		s.logger.Warn(
			"inventory reservation rejected",
			"orderId", event.Data.OrderID,
			"reason", reason,
			"error", err,
		)

		if rejectErr := s.repo.RecordRejectionWithOutbox(
			ctx,
			event.EventID,
			event.Data.OrderID,
			reason,
			productID,
			s.cfg.KafkaInventoryRejectedTopic,
		); rejectErr != nil {
			return rejectErr
		}

		metrics.ReservationsTotal.WithLabelValues("rejected").Inc()
		return nil
	}

	metrics.ReservationsTotal.WithLabelValues("reserved").Inc()
	s.logger.Info(
		"inventory reserved (outbox)",
		"orderId", event.Data.OrderID,
		"items", len(reservations),
	)

	return nil
}

func extractProductID(message string) string {
	const marker = "product "
	index := strings.Index(message, marker)
	if index < 0 {
		return ""
	}

	rest := message[index+len(marker):]
	spaceIndex := strings.Index(rest, " ")
	if spaceIndex < 0 {
		return strings.TrimSpace(rest)
	}

	return rest[:spaceIndex]
}
