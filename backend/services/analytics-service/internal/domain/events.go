package domain

import "encoding/json"

// Envelope matches Nest/Go Kafka producers in OrderFlow.
type Envelope struct {
	EventID    string          `json:"eventId"`
	EventType  string          `json:"eventType"`
	OccurredAt string          `json:"occurredAt"`
	Data       json.RawMessage `json:"data"`
}

type OrderCreatedData struct {
	OrderID     string `json:"orderId"`
	UserID      string `json:"userId"`
	Status      string `json:"status"`
	TotalAmount string `json:"totalAmount"`
	Currency    string `json:"currency"`
}

type InventoryReservedData struct {
	OrderID     string `json:"orderId"`
	TotalAmount string `json:"totalAmount"`
	Currency    string `json:"currency"`
}

type InventoryRejectedData struct {
	OrderID   string `json:"orderId"`
	Reason    string `json:"reason"`
	ProductID string `json:"productId"`
}

type PaymentSucceededData struct {
	PaymentID string `json:"paymentId"`
	OrderID   string `json:"orderId"`
	Amount    string `json:"amount"`
	Currency  string `json:"currency"`
}

type PaymentFailedData struct {
	PaymentID string `json:"paymentId"`
	OrderID   string `json:"orderId"`
	Reason    string `json:"reason"`
}

// MapEventTypeToStatus maps saga Kafka events to order lifecycle labels.
func MapEventTypeToStatus(eventType string) (string, bool) {
	switch eventType {
	case "order.created":
		return "PENDING", true
	case "inventory.reserved":
		return "PAYMENT_PENDING", true
	case "inventory.rejected":
		return "CANCELLED", true
	case "payment.succeeded":
		return "CONFIRMED", true
	case "payment.failed":
		return "FAILED", true
	default:
		return "", false
	}
}
