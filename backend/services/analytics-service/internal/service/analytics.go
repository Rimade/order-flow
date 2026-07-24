package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"orderflow/analytics-service/internal/domain"
	"orderflow/analytics-service/internal/repository"
)

var eventsProcessed = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "analytics_events_processed_total",
		Help: "Saga events recorded by analytics-service",
	},
	[]string{"event_type", "mapped_status"},
)

var eventsSkipped = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "analytics_events_skipped_total",
		Help: "Duplicate or unknown events skipped",
	},
	[]string{"reason"},
)

type AnalyticsService struct {
	repo   *repository.AnalyticsRepository
	logger *slog.Logger
}

func NewAnalyticsService(repo *repository.AnalyticsRepository, logger *slog.Logger) *AnalyticsService {
	return &AnalyticsService{repo: repo, logger: logger}
}

func (s *AnalyticsService) HandleMessage(ctx context.Context, payload []byte) error {
	var envelope domain.Envelope
	if err := json.Unmarshal(payload, &envelope); err != nil {
		eventsSkipped.WithLabelValues("bad_json").Inc()
		s.logger.Error("skip bad json payload", "error", err)
		return nil // permanent — do not block partition
	}

	if envelope.EventID == "" || envelope.EventType == "" {
		eventsSkipped.WithLabelValues("missing_fields").Inc()
		s.logger.Error("skip event without eventId/eventType")
		return nil
	}

	mappedStatus, ok := domain.MapEventTypeToStatus(envelope.EventType)
	if !ok {
		eventsSkipped.WithLabelValues("unknown_type").Inc()
		s.logger.Warn("skip unknown event type", "eventType", envelope.EventType)
		return nil
	}

	occurredAt, err := parseTime(envelope.OccurredAt)
	if err != nil {
		occurredAt = time.Now().UTC()
	}

	orderID, amount, currency, err := extractFields(envelope.EventType, envelope.Data)
	if err != nil {
		eventsSkipped.WithLabelValues("bad_data").Inc()
		s.logger.Error("skip bad event data", "eventType", envelope.EventType, "error", err)
		return nil
	}
	if orderID == "" {
		eventsSkipped.WithLabelValues("missing_order_id").Inc()
		s.logger.Error("skip event without orderId", "eventType", envelope.EventType)
		return nil
	}

	recorded, err := s.repo.RecordEvent(ctx, repository.RecordEventInput{
		EventID:      envelope.EventID,
		EventType:    envelope.EventType,
		OrderID:      orderID,
		OccurredAt:   occurredAt,
		MappedStatus: mappedStatus,
		Amount:       amount,
		Currency:     currency,
	})
	if err != nil {
		return err // transient (DB) — retry without commit
	}

	if !recorded {
		eventsSkipped.WithLabelValues("duplicate").Inc()
		return nil
	}

	eventsProcessed.WithLabelValues(envelope.EventType, mappedStatus).Inc()
	s.logger.Info(
		"analytics event recorded",
		"eventId", envelope.EventID,
		"eventType", envelope.EventType,
		"orderId", orderID,
		"status", mappedStatus,
	)
	return nil
}

func (s *AnalyticsService) Summary(ctx context.Context) (map[string]any, error) {
	totals, err := s.repo.SummaryTotals(ctx)
	if err != nil {
		return nil, err
	}

	eventCount, err := s.repo.EventCount(ctx)
	if err != nil {
		return nil, err
	}

	byStatus := make(map[string]int64, len(totals))
	for _, row := range totals {
		byStatus[row.Status] = row.Count
	}

	created := byStatus["PENDING"]
	confirmed := byStatus["CONFIRMED"]
	cancelled := byStatus["CANCELLED"]
	failed := byStatus["FAILED"]

	var cancelRate float64
	denom := created
	if denom > 0 {
		cancelRate = float64(cancelled) / float64(denom)
	}

	return map[string]any{
		"totalEvents": eventCount,
		"byStatus":    byStatus,
		"funnel": map[string]any{
			"created":    created,
			"confirmed":  confirmed,
			"cancelled":  cancelled,
			"failed":     failed,
			"cancelRate": cancelRate,
		},
	}, nil
}

func (s *AnalyticsService) OrdersByDay(ctx context.Context, days int) ([]repository.DailyStatusCount, error) {
	if days < 1 {
		days = 7
	}
	if days > 90 {
		days = 90
	}
	since := time.Now().UTC()
	y, m, d := since.Date()
	since = time.Date(y, m, d, 0, 0, 0, 0, time.UTC).AddDate(0, 0, -(days - 1))
	return s.repo.OrdersByDay(ctx, since)
}

func parseTime(value string) (time.Time, error) {
	if value == "" {
		return time.Time{}, fmt.Errorf("empty time")
	}
	formats := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02T15:04:05.000Z",
	}
	for _, format := range formats {
		if t, err := time.Parse(format, value); err == nil {
			return t.UTC(), nil
		}
	}
	return time.Time{}, fmt.Errorf("unsupported time: %s", value)
}

func extractFields(eventType string, data json.RawMessage) (orderID string, amount *string, currency *string, err error) {
	switch eventType {
	case "order.created":
		var d domain.OrderCreatedData
		if err = json.Unmarshal(data, &d); err != nil {
			return "", nil, nil, err
		}
		return d.OrderID, strPtr(d.TotalAmount), strPtr(d.Currency), nil
	case "inventory.reserved":
		var d domain.InventoryReservedData
		if err = json.Unmarshal(data, &d); err != nil {
			return "", nil, nil, err
		}
		return d.OrderID, strPtr(d.TotalAmount), strPtr(d.Currency), nil
	case "inventory.rejected":
		var d domain.InventoryRejectedData
		if err = json.Unmarshal(data, &d); err != nil {
			return "", nil, nil, err
		}
		return d.OrderID, nil, nil, nil
	case "payment.succeeded":
		var d domain.PaymentSucceededData
		if err = json.Unmarshal(data, &d); err != nil {
			return "", nil, nil, err
		}
		return d.OrderID, strPtr(d.Amount), strPtr(d.Currency), nil
	case "payment.failed":
		var d domain.PaymentFailedData
		if err = json.Unmarshal(data, &d); err != nil {
			return "", nil, nil, err
		}
		return d.OrderID, nil, nil, nil
	default:
		return "", nil, nil, fmt.Errorf("unsupported event type")
	}
}

func strPtr(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}
