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

	"orderflow/payment-service/internal/bootstrap"
	"orderflow/payment-service/internal/config"
	"orderflow/payment-service/internal/consumer"
	httpserver "orderflow/payment-service/internal/http"
	"orderflow/payment-service/internal/outbox"
	"orderflow/payment-service/internal/producer"
	"orderflow/payment-service/internal/rabbitmq"
	"orderflow/payment-service/internal/repository"
	"orderflow/payment-service/internal/service"
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

	repo := repository.NewPaymentRepository(pool)
	kafkaProducer := producer.NewKafkaProducer(cfg)
	defer kafkaProducer.Close()

	rabbitPublisher, err := rabbitmq.NewPublisher(cfg)
	if err != nil {
		logger.Error("rabbitmq connection failed", "error", err)
		os.Exit(1)
	}
	defer rabbitPublisher.Close()

	paymentService := service.NewPaymentService(repo, cfg, logger)
	inventoryConsumer := consumer.NewInventoryReservedConsumer(cfg, paymentService, logger)
	defer inventoryConsumer.Close()

	outboxRelay := outbox.NewRelay(pool, kafkaProducer, rabbitPublisher, cfg, logger)

	httpServer := httpserver.NewServer(port, repo, logger)

	go func() {
		outboxRelay.Run(ctx)
	}()

	go func() {
		if err = inventoryConsumer.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
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

	logger.Info("payment-service started", "port", port)
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(shutdownCtx)
}
