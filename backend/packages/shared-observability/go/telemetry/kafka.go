package telemetry

import (
	"context"

	"github.com/segmentio/kafka-go"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/propagation"
)

func InjectKafkaHeaders(ctx context.Context, headers []kafka.Header) []kafka.Header {
	carrier := propagation.MapCarrier{}
	for _, header := range headers {
		carrier[header.Key] = string(header.Value)
	}

	otel.GetTextMapPropagator().Inject(ctx, carrier)

	result := make([]kafka.Header, 0, len(carrier))
	for key, value := range carrier {
		result = append(result, kafka.Header{Key: key, Value: []byte(value)})
	}

	return result
}

func ExtractContext(ctx context.Context, headers []kafka.Header) context.Context {
	carrier := propagation.MapCarrier{}
	for _, header := range headers {
		carrier[header.Key] = string(header.Value)
	}

	return otel.GetTextMapPropagator().Extract(ctx, carrier)
}
