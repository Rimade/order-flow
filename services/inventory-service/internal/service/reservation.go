package service

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"strings"

	"orderflow/inventory-service/internal/domain"
	"orderflow/inventory-service/internal/producer"
	"orderflow/inventory-service/internal/repository"
)

type ReservationService struct {
	repo     *repository.InventoryRepository
	producer *producer.KafkaProducer
	logger   *slog.Logger
}

func NewReservationService(
	repo *repository.InventoryRepository,
	producer *producer.KafkaProducer,
	logger *slog.Logger,
) *ReservationService {
	return &ReservationService{
		repo:     repo,
		producer: producer,
		logger:   logger,
	}
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

	reservations, err := s.repo.ReserveOrder(
		ctx,
		event.EventID,
		event.Data.OrderID,
		event.Data.Items,
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

		if markErr := s.repo.MarkEventProcessed(ctx, event.EventID, event.EventType); markErr != nil {
			return markErr
		}

		publishErr := s.producer.PublishRejected(ctx, event.Data.OrderID, reason, productID)
		if publishErr != nil {
			return publishErr
		}

		return nil
	}

	s.logger.Info(
		"inventory reserved",
		"orderId", event.Data.OrderID,
		"items", len(reservations),
	)

	return s.producer.PublishReserved(
		ctx,
		event.Data.OrderID,
		event.Data.TotalAmount,
		event.Data.Currency,
		reservations,
	)
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
