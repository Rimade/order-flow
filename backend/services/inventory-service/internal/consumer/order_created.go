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

		msgCtx := telemetry.ExtractContext(ctx, message.Headers)
		tracer := otel.Tracer("inventory-service")
		msgCtx, span := tracer.Start(msgCtx, "kafka.consume order.created")
		span.SetAttributes(
			attribute.Int("kafka.partition", message.Partition),
			attribute.Int64("kafka.offset", message.Offset),
		)

		if err = c.service.HandleOrderCreated(msgCtx, message.Value); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			c.logger.Error(
				"failed to process order.created",
				"error", err,
				"partition", message.Partition,
				"offset", message.Offset,
			)
			span.End()
			continue
		}

		span.End()

		if err = c.reader.CommitMessages(ctx, message); err != nil {
			return err
		}
	}
}

func (c *OrderCreatedConsumer) Close() error {
	return c.reader.Close()
}
