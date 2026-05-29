package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port              string
	DatabaseURL       string
	RabbitMQURL       string
	RabbitMQExchange  string
	RabbitMQQueue     string
	RabbitMQBindingKey string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	return Config{
		Port:               getenv("PORT", "3005"),
		DatabaseURL:        databaseURL,
		RabbitMQURL:        getenv("RABBITMQ_URL", "amqp://orderflow:orderflow@localhost:5672/"),
		RabbitMQExchange:   getenv("RABBITMQ_EXCHANGE", "orderflow.notifications"),
		RabbitMQQueue:      getenv("RABBITMQ_QUEUE", "notification-service.queue"),
		RabbitMQBindingKey: getenv("RABBITMQ_BINDING_KEY", "notification.#"),
	}, nil
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func (c Config) PortInt() (int, error) {
	return strconv.Atoi(c.Port)
}
