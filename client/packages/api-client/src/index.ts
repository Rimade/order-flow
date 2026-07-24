import type { AuthTokens } from '@orderflow/auth';
import type { components } from './generated/schema';
import { request } from './http';
import { fetchMyOrders, fetchOrderDetails } from './graphql';

export { ApiError } from './http';
export type {
	OrderCatalogSnapshot,
	OrderDetails,
	OrderItemDetails,
} from './graphql';

export type OrderStatus = components['schemas']['OrderStatus'];
export type OrderItem = components['schemas']['OrderItem'];
export type Order = components['schemas']['Order'];
export type Product = components['schemas']['Product'];
export type CreateProductInput = components['schemas']['CreateProductBody'];
export type UpdateProductInput = components['schemas']['UpdateProductBody'];
export type CreateOrderItemInput = components['schemas']['CreateOrderItemInput'];
export type OutboxFailedMessage = components['schemas']['OutboxFailedMessage'];
export type AnalyticsSummary = components['schemas']['AnalyticsSummary'];
export type AnalyticsOrdersByDay = components['schemas']['AnalyticsOrdersByDay'];

export { watchOrderStatus, type OrderStatusEvent } from './order-status-sse';

export const api = {
	auth: {
		register: (email: string, password: string) =>
			request<AuthTokens>('/api/v1/auth/register', {
				method: 'POST',
				body: { email, password },
			}),
		login: (email: string, password: string) =>
			request<AuthTokens>('/api/v1/auth/login', {
				method: 'POST',
				body: { email, password },
			}),
		refresh: (refreshToken: string) =>
			request<AuthTokens>('/api/v1/auth/refresh', {
				method: 'POST',
				body: { refreshToken },
				skipRefresh: true,
			}),
		logout: (refreshToken: string) =>
			request<{ ok: true }>('/api/v1/auth/logout', {
				method: 'POST',
				body: { refreshToken },
				skipRefresh: true,
			}),
		me: () =>
			request<{ id: string; email: string }>('/api/v1/auth/me', {
				method: 'GET',
				auth: true,
			}),
	},
	catalog: {
		listProducts: () => request<Product[]>('/api/v1/catalog/products', { method: 'GET' }),
		getProduct: (sku: string) =>
			request<Product>(`/api/v1/catalog/products/${encodeURIComponent(sku)}`, {
				method: 'GET',
			}),
		createProduct: (body: CreateProductInput) =>
			request<Product>('/api/v1/catalog/products', {
				method: 'POST',
				auth: true,
				body,
			}),
		updateProduct: (sku: string, body: UpdateProductInput) =>
			request<Product>(`/api/v1/catalog/products/${encodeURIComponent(sku)}`, {
				method: 'PATCH',
				auth: true,
				body,
			}),
	},
	orders: {
		/** REST list — prefer `api.graphql.meOrders` for catalog enrichment */
		list: () => request<Order[]>('/api/v1/orders', { method: 'GET', auth: true }),
		/** REST get — prefer `api.graphql.order` for catalog enrichment */
		get: (id: string) => request<Order>(`/api/v1/orders/${id}`, { method: 'GET', auth: true }),
		create: (items: CreateOrderItemInput[], currency = 'USD') =>
			request<Order>('/api/v1/orders', {
				method: 'POST',
				auth: true,
				headers: {
					'Idempotency-Key':
						typeof crypto !== 'undefined' && 'randomUUID' in crypto
							? crypto.randomUUID()
							: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
				},
				body: { items, currency },
			}),
	},
	graphql: {
		meOrders: () => fetchMyOrders(),
		order: (id: string) => fetchOrderDetails(id),
	},
	ops: {
		listFailedOutbox: (limit = 50) =>
			request<OutboxFailedMessage[]>(
				`/api/v1/ops/outbox/failed?limit=${encodeURIComponent(String(limit))}`,
				{ method: 'GET', auth: true },
			),
		replayOutbox: (id: string) =>
			request<OutboxFailedMessage>(`/api/v1/ops/outbox/${encodeURIComponent(id)}/replay`, {
				method: 'POST',
				auth: true,
			}),
	},
	analytics: {
		summary: () =>
			request<AnalyticsSummary>('/api/v1/analytics/summary', {
				method: 'GET',
				auth: true,
			}),
		ordersByDay: (days = 7) =>
			request<AnalyticsOrdersByDay>(
				`/api/v1/analytics/orders-by-day?days=${encodeURIComponent(String(days))}`,
				{ method: 'GET', auth: true },
			),
	},
};
