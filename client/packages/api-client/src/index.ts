import { clearAuthSession, getAuthHeaders } from '@orderflow/auth';
import { apiBaseUrl } from '@orderflow/config';
import type { AuthTokens } from '@orderflow/auth';

export class ApiError extends Error {
	constructor(
		readonly statusCode: number,
		message: string,
		readonly body?: unknown,
	) {
		super(message);
		this.name = 'ApiError';
	}
}

type RequestOptions = Omit<RequestInit, 'body'> & {
	body?: unknown;
	auth?: boolean;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
	const { body, auth = false, headers, ...rest } = options;
	const url = `${apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`;

	const response = await fetch(url, {
		...rest,
		headers: {
			'Content-Type': 'application/json',
			...(auth ? getAuthHeaders() : {}),
			...headers,
		},
		body: body !== undefined ? JSON.stringify(body) : undefined,
	});

	const text = await response.text();
	let data: unknown = undefined;
	if (text) {
		try {
			data = JSON.parse(text) as unknown;
		} catch {
			data = text;
		}
	}

	if (response.status === 401 && auth) {
		clearAuthSession();
		if (typeof window !== 'undefined') {
			window.location.assign('/login');
		}
	}

	if (!response.ok) {
		const message =
			typeof data === 'object' &&
			data !== null &&
			'message' in data &&
			(typeof (data as { message: unknown }).message === 'string' ||
				Array.isArray((data as { message: unknown }).message))
				? Array.isArray((data as { message: string[] }).message)
					? (data as { message: string[] }).message.join(', ')
					: String((data as { message: string }).message)
				: response.statusText || 'Request failed';
		throw new ApiError(response.status, message, data);
	}

	return data as T;
}

export type OrderStatus = 'PENDING' | 'PAYMENT_PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';

export type OrderItem = {
	id: string;
	productId: string;
	productName: string;
	quantity: number;
	unitPrice: string;
};

export type Order = {
	id: string;
	userId: string;
	status: OrderStatus;
	totalAmount: string;
	currency: string;
	createdAt: string;
	updatedAt: string;
	items: OrderItem[];
};

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrderItemInput = {
	productId: string;
	productName: string;
	quantity: number;
	unitPrice: number;
};

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
		me: () =>
			request<{ id: string; email: string }>('/api/v1/auth/me', {
				method: 'GET',
				auth: true,
			}),
	},
  catalog: {
    listProducts: () =>
      request<Product[]>('/api/v1/catalog/products', { method: 'GET' }),
    getProduct: (sku: string) =>
      request<Product>(`/api/v1/catalog/products/${encodeURIComponent(sku)}`, {
        method: 'GET',
      }),
  },
  orders: {
		list: () => request<Order[]>('/api/v1/orders', { method: 'GET', auth: true }),
		get: (id: string) => request<Order>(`/api/v1/orders/${id}`, { method: 'GET', auth: true }),
		create: (items: CreateOrderItemInput[], currency = 'USD') =>
			request<Order>('/api/v1/orders', {
				method: 'POST',
				auth: true,
				body: { items, currency },
			}),
	},
};
