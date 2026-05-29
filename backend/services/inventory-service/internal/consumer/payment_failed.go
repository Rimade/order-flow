package consumer

import (
	"context"
	"io"
	"log/slog"

	"github.com/segmentio/kafka-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"orderflow/inventory-service/internal/config"
	"orderflow/inventory-service/internal/service"
	"orderflow/shared-observability/telemetry"
)

type PaymentFailedConsumer struct {
	reader  *kafka.Reader
	service *service.CompensationService
	logger  *slog.Logger
}

func NewPaymentFailedConsumer(
	cfg config.Config,
	compensationService *service.CompensationService,
	logger *slog.Logger,
) *PaymentFailedConsumer {
	return &PaymentFailedConsumer{
		reader: kafka.NewReader(kafka.ReaderConfig{
			Brokers:  cfg.KafkaBrokers,
			GroupID:  cfg.KafkaPaymentFailedConsumerGroup,
			Topic:    cfg.KafkaPaymentFailedTopic,
			MinBytes: 1,
			MaxBytes: 10e6,
		}),
		service: compensationService,
		logger:  logger,
	}
}

func (c *PaymentFailedConsumer) Run(ctx context.Context) error {
	for {
		message, err := c.reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil || err == io.EOF {
				return nil
			}
			return err
		}

		msgCtx := telemetry.ExtractContext(ctx, message.Headers)
		tracer := otel.Tracer("inventory-service")
		msgCtx, span := tracer.Start(msgCtx, "kafka.consume payment.failed")
		span.SetAttributes(
			attribute.Int("kafka.partition", message.Partition),
			attribute.Int64("kafka.offset", message.Offset),
		)

		if err = c.service.HandlePaymentFailed(msgCtx, message.Value); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			c.logger.Error("failed to compensate payment.failed", "error", err)
			span.End()
			continue
		}

		span.End()

		if err = c.reader.CommitMessages(ctx, message); err != nil {
			return err
		}
	}
}

func (c *PaymentFailedConsumer) Close() error {
	return c.reader.Close()
}
