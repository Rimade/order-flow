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

	"orderflow/analytics-service/internal/bootstrap"
	"orderflow/analytics-service/internal/config"
	"orderflow/analytics-service/internal/consumer"
	httpserver "orderflow/analytics-service/internal/http"
	"orderflow/analytics-service/internal/repository"
	"orderflow/analytics-service/internal/service"
	"orderflow/shared-observability/telemetry"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))

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
		serviceName = "analytics-service"
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

	repo := repository.NewAnalyticsRepository(pool)
	analyticsService := service.NewAnalyticsService(repo, logger)
	sagaConsumer := consumer.NewSagaEventsConsumer(cfg, analyticsService, logger)
	defer sagaConsumer.Close()

	httpServer := httpserver.NewServer(port, repo, analyticsService, logger)

	go func() {
		if err = sagaConsumer.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error("kafka consumer stopped", "error", err)
			stop()
		}
	}()

	go func() {
		if err = httpServer.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server stopped", "error", err)
			stop()
		}
	}()

	logger.Info("analytics-service started", "port", port, "topics", cfg.Topics())
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(shutdownCtx)

	if err = shutdownTelemetry(shutdownCtx); err != nil {
		logger.Error("telemetry shutdown failed", "error", err)
	}
}
