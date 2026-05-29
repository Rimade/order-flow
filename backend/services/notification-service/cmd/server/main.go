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

	"orderflow/notification-service/internal/bootstrap"
	"orderflow/notification-service/internal/config"
	"orderflow/notification-service/internal/consumer"
	httpserver "orderflow/notification-service/internal/http"
	"orderflow/notification-service/internal/repository"
	"orderflow/notification-service/internal/service"
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

	repo := repository.NewNotificationRepository(pool)
	notificationService := service.NewNotificationService(repo, logger)
	rabbitConsumer, err := consumer.NewRabbitConsumer(cfg, notificationService, logger)
	if err != nil {
		logger.Error("rabbitmq connection failed", "error", err)
		os.Exit(1)
	}
	defer rabbitConsumer.Close()

	httpServer := httpserver.NewServer(port, repo, logger)

	go func() {
		if err = rabbitConsumer.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
			logger.Error("rabbitmq consumer stopped", "error", err)
			stop()
		}
	}()

	go func() {
		if err = httpServer.Start(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Error("http server stopped", "error", err)
			stop()
		}
	}()

	logger.Info("notification-service started", "port", port, "broker", "rabbitmq")
	<-ctx.Done()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = httpServer.Shutdown(shutdownCtx)
}
