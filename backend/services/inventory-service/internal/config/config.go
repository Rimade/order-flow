package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                            string
	DatabaseURL                     string
	KafkaBrokers                    []string
	KafkaConsumerGroup              string
	KafkaOrderTopic                 string
	KafkaInventoryReservedTopic     string
	KafkaInventoryRejectedTopic     string
	KafkaPaymentFailedTopic         string
	KafkaPaymentFailedConsumerGroup string
	OutboxPollIntervalMs            int
	OutboxBatchSize                 int
	OutboxMaxRetries                int
	OutboxDLQTopic                  string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	port := getenv("PORT", "3003")
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	brokers := getenv("KAFKA_BROKERS", "localhost:9092")
	consumerGroup := getenv("KAFKA_CONSUMER_GROUP", "inventory-service")
	orderTopic := getenv("KAFKA_ORDER_TOPIC", "order.created")
	reservedTopic := getenv("KAFKA_INVENTORY_RESERVED_TOPIC", "inventory.reserved")
	rejectedTopic := getenv("KAFKA_INVENTORY_REJECTED_TOPIC", "inventory.rejected")

	return Config{
		Port:                        port,
		DatabaseURL:                 databaseURL,
		KafkaBrokers:                splitAndTrim(brokers),
		KafkaConsumerGroup:          consumerGroup,
		KafkaOrderTopic:             orderTopic,
		KafkaInventoryReservedTopic: reservedTopic,
		KafkaInventoryRejectedTopic: rejectedTopic,
		KafkaPaymentFailedTopic:     getenv("KAFKA_PAYMENT_FAILED_TOPIC", "payment.failed"),
		KafkaPaymentFailedConsumerGroup: getenv(
			"KAFKA_PAYMENT_FAILED_CONSUMER_GROUP",
			"inventory-service-compensation",
		),
		OutboxPollIntervalMs: getenvInt("OUTBOX_POLL_INTERVAL_MS", 1000),
		OutboxBatchSize:      getenvInt("OUTBOX_BATCH_SIZE", 20),
		OutboxMaxRetries:     getenvInt("OUTBOX_MAX_RETRIES", 5),
		OutboxDLQTopic:       getenv("OUTBOX_DLQ_TOPIC", "dlq.outbox"),
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
