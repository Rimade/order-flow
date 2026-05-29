package domain

type NotificationMessage struct {
	MessageID string `json:"messageId"`
	Type      string `json:"type"`
	OrderID   string `json:"orderId"`
	PaymentID string `json:"paymentId"`
	Channel   string `json:"channel"`
	Amount    string `json:"amount,omitempty"`
	Currency  string `json:"currency,omitempty"`
	Reason    string `json:"reason,omitempty"`
}
