package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                         string
	DatabaseURL                  string
	KafkaBrokers                 []string
	KafkaConsumerGroup           string
	KafkaOrderCreatedTopic       string
	KafkaInventoryReservedTopic  string
	KafkaInventoryRejectedTopic  string
	KafkaPaymentSucceededTopic   string
	KafkaPaymentFailedTopic      string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	return Config{
		Port:                        getenv("PORT", "3007"),
		DatabaseURL:                 databaseURL,
		KafkaBrokers:                splitCSV(getenv("KAFKA_BROKERS", "localhost:9092")),
		KafkaConsumerGroup:          getenv("KAFKA_CONSUMER_GROUP", "analytics-service"),
		KafkaOrderCreatedTopic:      getenv("KAFKA_ORDER_CREATED_TOPIC", "order.created"),
		KafkaInventoryReservedTopic: getenv("KAFKA_INVENTORY_RESERVED_TOPIC", "inventory.reserved"),
		KafkaInventoryRejectedTopic: getenv("KAFKA_INVENTORY_REJECTED_TOPIC", "inventory.rejected"),
		KafkaPaymentSucceededTopic:  getenv("KAFKA_PAYMENT_SUCCEEDED_TOPIC", "payment.succeeded"),
		KafkaPaymentFailedTopic:     getenv("KAFKA_PAYMENT_FAILED_TOPIC", "payment.failed"),
	}, nil
}

func (c Config) PortInt() (int, error) {
	return strconv.Atoi(c.Port)
}

func (c Config) Topics() []string {
	return []string{
		c.KafkaOrderCreatedTopic,
		c.KafkaInventoryReservedTopic,
		c.KafkaInventoryRejectedTopic,
		c.KafkaPaymentSucceededTopic,
		c.KafkaPaymentFailedTopic,
	}
}

func getenv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
