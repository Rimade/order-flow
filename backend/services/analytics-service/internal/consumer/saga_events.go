package consumer

import (
	"context"
	"io"
	"log/slog"
	"sync"

	"github.com/segmentio/kafka-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"orderflow/analytics-service/internal/config"
	"orderflow/analytics-service/internal/service"
	"orderflow/shared-observability/telemetry"
)

type SagaEventsConsumer struct {
	readers []*kafka.Reader
	service *service.AnalyticsService
	logger  *slog.Logger
}

func NewSagaEventsConsumer(
	cfg config.Config,
	analytics *service.AnalyticsService,
	logger *slog.Logger,
) *SagaEventsConsumer {
	readers := make([]*kafka.Reader, 0, len(cfg.Topics()))
	for _, topic := range cfg.Topics() {
		readers = append(readers, kafka.NewReader(kafka.ReaderConfig{
			Brokers:        cfg.KafkaBrokers,
			GroupID:        cfg.KafkaConsumerGroup,
			Topic:          topic,
			MinBytes:       1,
			MaxBytes:       10e6,
			CommitInterval: 0,
		}))
	}

	return &SagaEventsConsumer{
		readers: readers,
		service: analytics,
		logger:  logger,
	}
}

func (c *SagaEventsConsumer) Run(ctx context.Context) error {
	errCh := make(chan error, len(c.readers))
	var wg sync.WaitGroup

	for _, reader := range c.readers {
		wg.Add(1)
		go func(r *kafka.Reader) {
			defer wg.Done()
			if err := c.loop(ctx, r); err != nil {
				errCh <- err
			}
		}(reader)
	}

	done := make(chan struct{})
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-ctx.Done():
		<-done
		return nil
	case err := <-errCh:
		return err
	case <-done:
		return nil
	}
}

func (c *SagaEventsConsumer) loop(ctx context.Context, reader *kafka.Reader) error {
	topic := reader.Config().Topic

	for {
		message, err := reader.FetchMessage(ctx)
		if err != nil {
			if ctx.Err() != nil || err == io.EOF {
				return nil
			}
			return err
		}

		msgCtx := telemetry.ExtractContext(ctx, message.Headers)
		tracer := otel.Tracer("analytics-service")
		msgCtx, span := tracer.Start(msgCtx, "kafka.consume "+topic)
		span.SetAttributes(
			attribute.String("messaging.destination", topic),
			attribute.Int("kafka.partition", message.Partition),
			attribute.Int64("kafka.offset", message.Offset),
		)

		if err = c.service.HandleMessage(msgCtx, message.Value); err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
			c.logger.Error(
				"failed to process analytics event",
				"topic", topic,
				"error", err,
				"partition", message.Partition,
				"offset", message.Offset,
			)
			span.End()
			continue
		}

		span.End()

		if err = reader.CommitMessages(ctx, message); err != nil {
			return err
		}
	}
}

func (c *SagaEventsConsumer) Close() error {
	var first error
	for _, reader := range c.readers {
		if err := reader.Close(); err != nil && first == nil {
			first = err
		}
	}
	return first
}
