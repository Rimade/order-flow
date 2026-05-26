package dlq

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

const EventType = "outbox.dead_letter"

type Envelope struct {
	EventID    string `json:"eventId"`
	EventType  string `json:"eventType"`
	OccurredAt string `json:"occurredAt"`
	Data       Data   `json:"data"`
}

type Data struct {
	Service           string          `json:"service"`
	OutboxID          string          `json:"outboxId"`
	Destination       string          `json:"destination,omitempty"`
	OriginalTopic     string          `json:"originalTopic,omitempty"`
	RoutingKey        string          `json:"routingKey,omitempty"`
	MessageKey        string          `json:"messageKey"`
	OriginalEventType string          `json:"originalEventType"`
	Payload           json.RawMessage `json:"payload"`
	LastError         string          `json:"lastError"`
	RetryCount        int             `json:"retryCount"`
}

func NewEnvelope(
	serviceName string,
	outboxID string,
	messageKey string,
	originalEventType string,
	payload json.RawMessage,
	lastError string,
	retryCount int,
) Envelope {
	return Envelope{
		EventID:    uuid.NewString(),
		EventType:  EventType,
		OccurredAt: time.Now().UTC().Format(time.RFC3339),
		Data: Data{
			Service:           serviceName,
			OutboxID:          outboxID,
			MessageKey:        messageKey,
			OriginalEventType: originalEventType,
			Payload:           payload,
			LastError:         lastError,
			RetryCount:        retryCount,
		},
	}
}
