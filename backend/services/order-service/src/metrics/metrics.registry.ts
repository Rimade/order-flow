import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

export const metricsRegistry = new Registry();

collectDefaultMetrics({ register: metricsRegistry });

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['service', 'method', 'path', 'status'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['service', 'method', 'path'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const ordersCreatedTotal = new Counter({
  name: 'orders_created_total',
  help: 'Orders successfully created',
  labelNames: ['service'],
  registers: [metricsRegistry],
});

export const ordersStatusTransitionsTotal = new Counter({
  name: 'orders_status_transitions_total',
  help: 'Order status transitions after saga events',
  labelNames: ['service', 'status'],
  registers: [metricsRegistry],
});
