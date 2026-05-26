package domain

type InventoryReservedEvent struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Data       struct {
		OrderID      string `json:"orderId"`
		TotalAmount  string `json:"totalAmount"`
		Currency     string `json:"currency"`
		Reservations []struct {
			ProductID string `json:"productId"`
			Quantity  int    `json:"quantity"`
		} `json:"reservations"`
	} `json:"data"`
}

type PaymentSucceededEvent struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Data       struct {
		PaymentID string `json:"paymentId"`
		OrderID   string `json:"orderId"`
		Amount    string `json:"amount"`
		Currency  string `json:"currency"`
	} `json:"data"`
}

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
