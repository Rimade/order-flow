package httpserver

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"orderflow/payment-service/internal/repository"
	"orderflow/shared-observability/metrics"
)

type Server struct {
	server *http.Server
	repo   *repository.PaymentRepository
	logger *slog.Logger
}

func NewServer(port int, repo *repository.PaymentRepository, logger *slog.Logger) *Server {
	s := &Server{
		repo:   repo,
		logger: logger,
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	metrics.RegisterHandler(mux)

	handler := metrics.Middleware(
		"payment-service",
		otelhttp.NewHandler(mux, "payment-service"),
	)

	s.server = &http.Server{
		Addr:              ":" + strconv.Itoa(port),
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}

	return s
}

func (s *Server) Start() error {
	s.logger.Info("http server listening", "addr", s.server.Addr)
	return s.server.ListenAndServe()
}

func (s *Server) Shutdown(ctx context.Context) error {
	return s.server.Shutdown(ctx)
}

func (s *Server) handleHealth(writer http.ResponseWriter, request *http.Request) {
	ctx, cancel := context.WithTimeout(request.Context(), 2*time.Second)
	defer cancel()

	status := http.StatusOK
	checks := map[string]string{"service": "up"}

	if err := s.repo.Ping(ctx); err != nil {
		status = http.StatusServiceUnavailable
		checks["database"] = "down"
	} else {
		checks["database"] = "up"
	}

	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	label := "error"
	if status == http.StatusOK {
		label = "ok"
	}

	_ = json.NewEncoder(writer).Encode(map[string]any{
		"status": label,
		"checks": checks,
	})
}
