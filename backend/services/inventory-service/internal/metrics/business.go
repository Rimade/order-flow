package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var (
	ReservationsTotal = promauto.NewCounterVec(
		prometheus.CounterOpts{
			Name: "inventory_reservations_total",
			Help: "Inventory reservation outcomes",
		},
		[]string{"result"}, // reserved | rejected
	)

	CompensationsTotal = promauto.NewCounter(
		prometheus.CounterOpts{
			Name: "inventory_compensations_total",
			Help: "Stock released after payment.failed",
		},
	)
)
