package consumer

import (
	"context"
	"io"
	"log/slog"

	"github.com/segmentio/kafka-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"orderflow/payment-service/internal/config"
	"orderflow/payment-service/internal/service"
	"orderflow/shared-observability/telemetry"
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

		msgCtx := telemetry.ExtractContext(ctx, message.Headers)
		tracer := otel.Tracer("payment-service")
		msgCtx, span := tracer.Start(msgCtx, "kafka.consume inventory.reserved")
		span.SetAttributes(
			attribute.Int("kafka.partition", message.Partition),
			attribute.Int64("kafka.offset", message.Offset),
		)

		if err = c.service.HandleInventoryReserved(msgCtx, message.Value); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			c.logger.Error("failed to process inventory.reserved", "error", err)
			span.End()
			continue
		}

		span.End()

		if err = c.reader.CommitMessages(ctx, message); err != nil {
			return err
		}
	}
}

func (c *InventoryReservedConsumer) Close() error {
	return c.reader.Close()
}
