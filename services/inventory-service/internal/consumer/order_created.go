package consumer

import (
	"context"
	"io"
	"log/slog"

	"github.com/segmentio/kafka-go"
	"orderflow/inventory-service/internal/config"
	"orderflow/inventory-service/internal/service"
)

type OrderCreatedConsumer struct {
	reader  *kafka.Reader
	service *service.ReservationService
	logger  *slog.Logger
}

func NewOrderCreatedConsumer(
	cfg config.Config,
	reservationService *service.ReservationService,
	logger *slog.Logger,
) *OrderCreatedConsumer {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        cfg.KafkaBrokers,
		GroupID:        cfg.KafkaConsumerGroup,
		Topic:          cfg.KafkaOrderTopic,
		MinBytes:       1,
		MaxBytes:       10e6,
		CommitInterval: 0,
	})

	return &OrderCreatedConsumer{
		reader:  reader,
		service: reservationService,
		logger:  logger,
	}
}

func (c *OrderCreatedConsumer) Run(ctx context.Context) error {
	for {
		message, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil || err == io.EOF {
				return nil
			}
			return err
		}

		if err = c.service.HandleOrderCreated(ctx, message.Value); err != nil {
			c.logger.Error(
				"failed to process order.created",
				"error", err,
				"partition", message.Partition,
				"offset", message.Offset,
			)
			continue
		}

		if err = c.reader.CommitMessages(ctx, message); err != nil {
			return err
		}
	}
}

func (c *OrderCreatedConsumer) Close() error {
	return c.reader.Close()
}
