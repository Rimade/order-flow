import { APIRequestContext, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

export const gatewayUrl = (
	process.env.PLAYWRIGHT_GATEWAY_URL ?? 'http://localhost:3000'
).replace(/\/$/, '');

export const password = 'Password1!';

export type AuthTokens = {
	accessToken: string;
	refreshToken: string;
	user: { id: string; email: string };
};

export type OrderResponse = {
	id: string;
	status: string;
	items: Array<{ productId: string; quantity: number }>;
};

export const sku1Body = {
	currency: 'USD',
	items: [
		{
			productId: 'sku-1',
			productName: 'Demo Widget',
			quantity: 1,
			unitPrice: 19.99,
		},
	],
};

export async function registerAndLogin(
	request: APIRequestContext,
	emailPrefix: string,
): Promise<AuthTokens> {
	const email = `${emailPrefix}-${Date.now()}@orderflow.test`;

	const register = await request.post(`${gatewayUrl}/api/v1/auth/register`, {
		data: { email, password },
	});
	expect(register.ok(), await register.text()).toBeTruthy();

	const login = await request.post(`${gatewayUrl}/api/v1/auth/login`, {
		data: { email, password },
	});
	expect(login.ok(), await login.text()).toBeTruthy();
	return (await login.json()) as AuthTokens;
}

export async function createOrder(
	request: APIRequestContext,
	accessToken: string,
	body: unknown,
	idempotencyKey?: string,
) {
	const headers: Record<string, string> = {
		Authorization: `Bearer ${accessToken}`,
		'Content-Type': 'application/json',
	};
	if (idempotencyKey) {
		headers['Idempotency-Key'] = idempotencyKey;
	}

	return request.post(`${gatewayUrl}/api/v1/orders`, {
		headers,
		data: body,
	});
}

export async function getOrder(
	request: APIRequestContext,
	accessToken: string,
	orderId: string,
): Promise<OrderResponse> {
	const response = await request.get(`${gatewayUrl}/api/v1/orders/${orderId}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	expect(response.ok(), await response.text()).toBeTruthy();
	return (await response.json()) as OrderResponse;
}

export async function waitForOrderStatus(
	request: APIRequestContext,
	accessToken: string,
	orderId: string,
	expected: string,
	timeoutMs = 60_000,
): Promise<OrderResponse> {
	const started = Date.now();
	let last: OrderResponse | undefined;

	while (Date.now() - started < timeoutMs) {
		last = await getOrder(request, accessToken, orderId);
		if (last.status === expected) {
			return last;
		}
		await new Promise((r) => setTimeout(r, 1500));
	}

	throw new Error(
		`Order ${orderId} expected status ${expected}, last=${last?.status}`,
	);
}

export function newIdempotencyKey() {
	return randomUUID();
}
