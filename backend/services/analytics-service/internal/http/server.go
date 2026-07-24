package httpserver

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"orderflow/analytics-service/internal/repository"
	"orderflow/analytics-service/internal/service"
	"orderflow/shared-observability/metrics"
)

type Server struct {
	server  *http.Server
	repo    *repository.AnalyticsRepository
	service *service.AnalyticsService
	logger  *slog.Logger
}

func NewServer(
	port int,
	repo *repository.AnalyticsRepository,
	analytics *service.AnalyticsService,
	logger *slog.Logger,
) *Server {
	s := &Server{repo: repo, service: analytics, logger: logger}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", s.handleHealth)
	mux.HandleFunc("GET /api/v1/analytics/summary", s.handleSummary)
	mux.HandleFunc("GET /api/v1/analytics/orders-by-day", s.handleOrdersByDay)
	metrics.RegisterHandler(mux)

	handler := metrics.Middleware(
		"analytics-service",
		otelhttp.NewHandler(mux, "analytics-service"),
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

	label := "error"
	if status == http.StatusOK {
		label = "ok"
	}

	writeJSON(writer, status, map[string]any{"status": label, "checks": checks})
}

func (s *Server) handleSummary(writer http.ResponseWriter, request *http.Request) {
	summary, err := s.service.Summary(request.Context())
	if err != nil {
		s.logger.Error("summary failed", "error", err)
		writeJSON(writer, http.StatusInternalServerError, map[string]string{"error": "summary failed"})
		return
	}
	writeJSON(writer, http.StatusOK, summary)
}

func (s *Server) handleOrdersByDay(writer http.ResponseWriter, request *http.Request) {
	days := 7
	if raw := request.URL.Query().Get("days"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil {
			days = parsed
		}
	}

	rows, err := s.service.OrdersByDay(request.Context(), days)
	if err != nil {
		s.logger.Error("orders-by-day failed", "error", err)
		writeJSON(writer, http.StatusInternalServerError, map[string]string{"error": "query failed"})
		return
	}

	items := make([]map[string]any, 0, len(rows))
	for _, row := range rows {
		items = append(items, map[string]any{
			"day":    row.Day.Format("2006-01-02"),
			"status": row.Status,
			"count":  row.Count,
		})
	}

	writeJSON(writer, http.StatusOK, map[string]any{
		"days":  days,
		"items": items,
	})
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}
