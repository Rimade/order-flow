package domain_test

import (
	"testing"

	"orderflow/analytics-service/internal/domain"
)

func TestMapEventTypeToStatus(t *testing.T) {
	cases := map[string]string{
		"order.created":        "PENDING",
		"inventory.reserved":   "PAYMENT_PENDING",
		"inventory.rejected":   "CANCELLED",
		"payment.succeeded":    "CONFIRMED",
		"payment.failed":       "FAILED",
	}

	for eventType, want := range cases {
		got, ok := domain.MapEventTypeToStatus(eventType)
		if !ok || got != want {
			t.Fatalf("%s: got (%q, %v), want (%q, true)", eventType, got, ok, want)
		}
	}

	if _, ok := domain.MapEventTypeToStatus("unknown.event"); ok {
		t.Fatal("expected unknown event to be rejected")
	}
}
