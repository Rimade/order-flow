package metrics

import (
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
)

var PaymentsTotal = promauto.NewCounterVec(
	prometheus.CounterOpts{
		Name: "payments_total",
		Help: "Payment outcomes recorded via outbox",
	},
	[]string{"result"}, // succeeded | failed
)
