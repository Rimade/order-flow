package rabbitmq

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"
	"orderflow/payment-service/internal/config"
)

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

type Publisher struct {
	conn     *amqp.Connection
	channel  *amqp.Channel
	exchange string
}

func NewPublisher(cfg config.Config) (*Publisher, error) {
	conn, err := amqp.Dial(cfg.RabbitMQURL)
	if err != nil {
		return nil, fmt.Errorf("connect rabbitmq: %w", err)
	}

	channel, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, fmt.Errorf("open channel: %w", err)
	}

	if err = channel.ExchangeDeclare(
		cfg.RabbitMQExchange,
		"topic",
		true,
		false,
		false,
		false,
		nil,
	); err != nil {
		_ = channel.Close()
		_ = conn.Close()
		return nil, fmt.Errorf("declare exchange: %w", err)
	}

	return &Publisher{
		conn:     conn,
		channel:  channel,
		exchange: cfg.RabbitMQExchange,
	}, nil
}

func (p *Publisher) Close() error {
	if p.channel != nil {
		_ = p.channel.Close()
	}

	if p.conn != nil {
		return p.conn.Close()
	}

	return nil
}

func (p *Publisher) PublishPaymentSucceeded(
	ctx context.Context,
	orderID string,
	paymentID string,
	amount string,
	currency string,
) error {
	return p.publish(ctx, "notification.payment.succeeded", NotificationMessage{
		MessageID: uuid.NewString(),
		Type:      "payment.succeeded",
		OrderID:   orderID,
		PaymentID: paymentID,
		Channel:   "email",
		Amount:    amount,
		Currency:  currency,
	})
}

func (p *Publisher) PublishPaymentFailed(
	ctx context.Context,
	orderID string,
	paymentID string,
	reason string,
) error {
	return p.publish(ctx, "notification.payment.failed", NotificationMessage{
		MessageID: uuid.NewString(),
		Type:      "payment.failed",
		OrderID:   orderID,
		PaymentID: paymentID,
		Channel:   "email",
		Reason:    reason,
	})
}

func (p *Publisher) publish(
	ctx context.Context,
	routingKey string,
	message NotificationMessage,
) error {
	body, err := json.Marshal(message)
	if err != nil {
		return err
	}

	return p.channel.PublishWithContext(
		ctx,
		p.exchange,
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			MessageId:    message.MessageID,
			Timestamp:    time.Now().UTC(),
			Body:         body,
		},
	)
}
