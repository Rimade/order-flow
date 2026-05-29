package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"orderflow/inventory-service/internal/bootstrap"
	"orderflow/inventory-service/internal/config"
	"orderflow/inventory-service/internal/consumer"
	httpserver "orderflow/inventory-service/internal/http"
	"orderflow/inventory-service/internal/outbox"
	"orderflow/inventory-service/internal/producer"
	"orderflow/inventory-service/internal/repository"
	"orderflow/inventory-service/internal/service"
	"orderflow/shared-observability/telemetry"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	port, err := cfg.PortInt()
	if err != nil {
		logger.Error("invalid port", "error", err)
		os.Exit(1)
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	serviceName := os.Getenv("OTEL_SERVICE_NAME")
	if serviceName == "" {
		serviceName = "inventory-service"
	}

	shutdownTelemetry, err := telemetry.Init(ctx, serviceName)
	if err != nil {
		logger.Error("telemetry init failed", "error", err)
		os.Exit(1)
	}

	pool, err := bootstrap.ConnectDatabase(ctx, cfg.DatabaseURL)
	if err != nil {
		logger.Error("database connection failed", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	if err = bootstrap.RunMigrations(ctx, pool); err != nil {
		logger.Error("database migration failed", "error", err)
		os.Exit(1)
	}

	repo := repository.NewInventoryRepository(pool)
	kafkaProducer := producer.NewKafkaProducer(cfg)
	defer kafkaProducer.Close()

	reservationService := service.NewReservationService(repo, cfg, logger)
	compensationService := service.NewCompensationService(repo, logger)

	orderConsumer := consumer.NewOrderCreatedConsumer(cfg, reservationService, logger)
	defer orderConsumer.Close()

	paymentFailedConsumer := consumer.NewPaymentFailedConsumer(cfg, compensationService, logger)
	defer paymentFailedConsumer.Close()

	outboxRelay := outbox.NewRelay(pool, kafkaProducer, cfg, logger)

	httpServer := httpserver.NewServer(port, repo, logger)

	go func() {
		outboxRelay.Run(ctx)
	}()

	go func() {
		if err = orderConsumer.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error("kafka consumer stopped", "error", err)
			stop()
		}
	}()

	go func() {
		if err = paymentFailedConsumer.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error("payment.failed consumer stopped", "error", err)
			stop()
		}
	}()

	go func() {
		if err = httpServer.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server stopped", "error", err)
			stop()
		}
	}()

	logger.Info("inventory-service started", "port", port)

	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err = httpServer.Shutdown(shutdownCtx); err != nil {
		logger.Error("http shutdown failed", "error", err)
	}

	if err = shutdownTelemetry(shutdownCtx); err != nil {
		logger.Error("telemetry shutdown failed", "error", err)
	}
}
