package domain

type OrderCreatedItem struct {
	ProductID   string `json:"productId"`
	ProductName string `json:"productName"`
	Quantity    int    `json:"quantity"`
	UnitPrice   string `json:"unitPrice"`
}

type OrderCreatedEvent struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Data       struct {
		OrderID     string             `json:"orderId"`
		UserID      string             `json:"userId"`
		Status      string             `json:"status"`
		TotalAmount string             `json:"totalAmount"`
		Currency    string             `json:"currency"`
		Items       []OrderCreatedItem `json:"items"`
	} `json:"data"`
}

type ReservationItem struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

type InventoryReservedEvent struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Data       struct {
		OrderID      string            `json:"orderId"`
		TotalAmount  string            `json:"totalAmount"`
		Currency     string            `json:"currency"`
		Reservations []ReservationItem `json:"reservations"`
	} `json:"data"`
}

type InventoryRejectedEvent struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Data       struct {
		OrderID   string `json:"orderId"`
		Reason    string `json:"reason"`
		ProductID string `json:"productId,omitempty"`
	} `json:"data"`
}
