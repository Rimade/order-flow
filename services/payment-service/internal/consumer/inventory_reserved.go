package consumer

import (
	"context"
	"io"
	"log/slog"

	"github.com/segmentio/kafka-go"
	"orderflow/payment-service/internal/config"
	"orderflow/payment-service/internal/service"
)

type InventoryReservedConsumer struct {
	reader  *kafka.Reader
	service *service.PaymentService
	logger  *slog.Logger
}

func NewInventoryReservedConsumer(
	cfg config.Config,
	paymentService *service.PaymentService,
	logger *slog.Logger,
) *InventoryReservedConsumer {
	return &InventoryReservedConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:  cfg.KafkaBrokers,
			GroupID:  cfg.KafkaConsumerGroup,
			Topic:    cfg.KafkaInventoryReservedTopic,
			MinBytes: 1,
			MaxBytes: 10e6,
		}),
		service: paymentService,
		logger:  logger,
	}
}

func (c *InventoryReservedConsumer) Run(ctx context.Context) error {
	for {
		message, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil || err == io.EOF {
				return nil
			}
			return err
		}

		if err = c.service.HandleInventoryReserved(ctx, message.Value); err != nil {
			c.logger.Error("failed to process inventory.reserved", "error", err)
			continue
		}

		if err = c.reader.CommitMessages(ctx, message); err != nil {
			return err
		}
	}
}

func (c *InventoryReservedConsumer) Close() error {
	return c.reader.Close()
}
