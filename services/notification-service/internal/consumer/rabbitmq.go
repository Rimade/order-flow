package consumer

import (
	"context"
	"log/slog"

	amqp "github.com/rabbitmq/amqp091-go"
	"orderflow/notification-service/internal/config"
	"orderflow/notification-service/internal/service"
)

type RabbitConsumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	queue   string
	service *service.NotificationService
	logger  *slog.Logger
}

func NewRabbitConsumer(
	cfg config.Config,
	notificationService *service.NotificationService,
	logger *slog.Logger,
) (*RabbitConsumer, error) {
	conn, err := amqp.Dial(cfg.RabbitMQURL)
	if err != nil {
		return nil, err
	}

	channel, err := conn.Channel()
	if err != nil {
		_ = conn.Close()
		return nil, err
	}

	if err = channel.Qos(10, 0, false); err != nil {
		_ = channel.Close()
		_ = conn.Close()
		return nil, err
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
		return nil, err
	}

	if _, err = channel.QueueDeclare(
		cfg.RabbitMQQueue,
		true,
		false,
		false,
		false,
		nil,
	); err != nil {
		_ = channel.Close()
		_ = conn.Close()
		return nil, err
	}

	if err = channel.QueueBind(
		cfg.RabbitMQQueue,
		cfg.RabbitMQBindingKey,
		cfg.RabbitMQExchange,
		false,
		nil,
	); err != nil {
		_ = channel.Close()
		_ = conn.Close()
		return nil, err
	}

	return &RabbitConsumer{
		conn:    conn,
		channel: channel,
		queue:   cfg.RabbitMQQueue,
		service: notificationService,
		logger:  logger,
	}, nil
}

func (c *RabbitConsumer) Run(ctx context.Context) error {
	deliveries, err := c.channel.Consume(
		c.queue,
		"notification-service",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return err
	}

	for {
		select {
		case <-ctx.Done():
			return nil
		case delivery, ok := <-deliveries:
			if !ok {
				return nil
			}

			if err = c.service.HandleMessage(ctx, delivery.Body); err != nil {
				c.logger.Error("notification processing failed", "error", err)
				_ = delivery.Nack(false, true)
				continue
			}

			if err = delivery.Ack(false); err != nil {
				return err
			}
		}
	}
}

func (c *RabbitConsumer) Close() error {
	if c.channel != nil {
		_ = c.channel.Close()
	}

	if c.conn != nil {
		return c.conn.Close()
	}

	return nil
}
