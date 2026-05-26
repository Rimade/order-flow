package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                        string
	DatabaseURL                 string
	KafkaBrokers                []string
	KafkaConsumerGroup          string
	KafkaInventoryReservedTopic string
	KafkaPaymentSucceededTopic  string
	KafkaPaymentFailedTopic     string
	PaymentSimulateSuccess      bool
	RabbitMQURL                 string
	RabbitMQExchange            string
	OutboxPollIntervalMs        int
	OutboxBatchSize             int
	OutboxMaxRetries            int
	OutboxDLQTopic              string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	simulateSuccess := true
	if value := os.Getenv("PAYMENT_SIMULATE_SUCCESS"); value != "" {
		parsed, err := strconv.ParseBool(value)
		if err != nil {
			return Config{}, fmt.Errorf("invalid PAYMENT_SIMULATE_SUCCESS: %w", err)
		}
		simulateSuccess = parsed
	}

	return Config{
		Port:                        getenv("PORT", "3004"),
		DatabaseURL:                 databaseURL,
		KafkaBrokers:                splitAndTrim(getenv("KAFKA_BROKERS", "localhost:9092")),
		KafkaConsumerGroup:          getenv("KAFKA_CONSUMER_GROUP", "payment-service"),
		KafkaInventoryReservedTopic: getenv("KAFKA_INVENTORY_RESERVED_TOPIC", "inventory.reserved"),
		KafkaPaymentSucceededTopic:  getenv("KAFKA_PAYMENT_SUCCEEDED_TOPIC", "payment.succeeded"),
		KafkaPaymentFailedTopic:     getenv("KAFKA_PAYMENT_FAILED_TOPIC", "payment.failed"),
		PaymentSimulateSuccess:      simulateSuccess,
		RabbitMQURL:                 getenv("RABBITMQ_URL", "amqp://orderflow:orderflow@localhost:5672/"),
		RabbitMQExchange:            getenv("RABBITMQ_EXCHANGE", "orderflow.notifications"),
		OutboxPollIntervalMs:        getenvInt("OUTBOX_POLL_INTERVAL_MS", 1000),
		OutboxBatchSize:             getenvInt("OUTBOX_BATCH_SIZE", 20),
		OutboxMaxRetries:            getenvInt("OUTBOX_MAX_RETRIES", 5),
		OutboxDLQTopic:              getenv("OUTBOX_DLQ_TOPIC", "dlq.outbox"),
	}, nil
}

func getenvInt(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}

	return parsed
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}

	return fallback
}

func splitAndTrim(value string) []string {
	parts := make([]string, 0)
	current := ""

	for _, char := range value {
		if char == ',' {
			if trimmed := trim(current); trimmed != "" {
				parts = append(parts, trimmed)
			}
			current = ""
			continue
		}
		current += string(char)
	}

	if trimmed := trim(current); trimmed != "" {
		parts = append(parts, trimmed)
	}

	return parts
}

func trim(value string) string {
	start := 0
	end := len(value)

	for start < end && (value[start] == ' ' || value[start] == '\t') {
		start++
	}

	for end > start && (value[end-1] == ' ' || value[end-1] == '\t') {
		end--
	}

	return value[start:end]
}

func (c Config) PortInt() (int, error) {
	return strconv.Atoi(c.Port)
}
