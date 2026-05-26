package telemetry

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

func Init(ctx context.Context, serviceName string) (func(context.Context) error, error) {
	if !IsEnabled() {
		return func(context.Context) error { return nil }, nil
	}

	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		endpoint = "http://localhost:4318/v1/traces"
	}

	exporter, err := otlptracehttp.New(
		ctx,
		otlptracehttp.WithEndpointURL(endpoint),
	)
	if err != nil {
		return nil, fmt.Errorf("create otlp exporter: %w", err)
	}

	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(serviceName),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("create resource: %w", err)
	}

	provider := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter),
		sdktrace.WithResource(res),
	)

	otel.SetTracerProvider(provider)
	otel.SetTextMapPropagator(
		propagation.NewCompositeTextMapPropagator(
			propagation.TraceContext{},
			propagation.Baggage{},
		),
	)

	return func(shutdownCtx context.Context) error {
		shutdownCtx, cancel := context.WithTimeout(shutdownCtx, 5*time.Second)
		defer cancel()

		return provider.Shutdown(shutdownCtx)
	}, nil
}

func IsEnabled() bool {
	value := strings.ToLower(strings.TrimSpace(os.Getenv("OTEL_ENABLED")))
	return value == "1" || value == "true" || value == "yes"
}
