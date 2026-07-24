import { expect, test } from '@playwright/test';
import {
	createOrder,
	gatewayUrl,
	newIdempotencyKey,
	registerAndLogin,
	sku1Body,
} from './helpers/api';

test.describe('Order Idempotency-Key (API)', () => {
	test('same key + same body returns the same order id', async ({ request }) => {
		const auth = await registerAndLogin(request, 'e2e-idem');
		const key = newIdempotencyKey();

		const first = await createOrder(request, auth.accessToken, sku1Body, key);
		expect(first.status(), await first.text()).toBe(201);
		const orderA = await first.json();

		const second = await createOrder(request, auth.accessToken, sku1Body, key);
		expect(second.status(), await second.text()).toBe(201);
		const orderB = await second.json();

		expect(orderB.id).toBe(orderA.id);

		const list = await request.get(`${gatewayUrl}/api/v1/orders`, {
			headers: { Authorization: `Bearer ${auth.accessToken}` },
		});
		expect(list.ok()).toBeTruthy();
		const orders = (await list.json()) as Array<{ id: string }>;
		const matches = orders.filter((o) => o.id === orderA.id);
		expect(matches).toHaveLength(1);
	});

	test('same key + different body returns 422', async ({ request }) => {
		const auth = await registerAndLogin(request, 'e2e-idem-mismatch');
		const key = newIdempotencyKey();

		const first = await createOrder(request, auth.accessToken, sku1Body, key);
		expect(first.status()).toBe(201);

		const otherBody = {
			currency: 'USD',
			items: [
				{
					productId: 'sku-1',
					productName: 'Demo Widget',
					quantity: 2,
					unitPrice: 19.99,
				},
			],
		};

		const second = await createOrder(request, auth.accessToken, otherBody, key);
		expect(second.status(), await second.text()).toBe(422);
	});
});
