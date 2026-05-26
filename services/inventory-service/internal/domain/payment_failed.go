package domain

type PaymentFailedEvent struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Data       struct {
		PaymentID string `json:"paymentId"`
		OrderID   string `json:"orderId"`
		Reason    string `json:"reason"`
	} `json:"data"`
}
