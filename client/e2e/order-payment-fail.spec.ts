import { expect, test } from '@playwright/test';
import {
	createOrder,
	registerAndLogin,
	sku1Body,
	waitForOrderStatus,
} from './helpers/api';

/**
 * Requires payment-service with PAYMENT_SIMULATE_SUCCESS=false.
 * Inventory should compensate (release reserved stock) after payment.failed.
 *
 *   $env:E2E_PAYMENT_FAIL='1'; pnpm e2e -- order-payment-fail
 */
test.describe('Payment failure saga (API)', () => {
	test.beforeEach(() => {
		test.skip(
			process.env.E2E_PAYMENT_FAIL !== '1',
			'Set E2E_PAYMENT_FAIL=1 and PAYMENT_SIMULATE_SUCCESS=false on payment-service',
		);
	});

	test('order reaches FAILED after payment.failed', async ({ request }) => {
		const auth = await registerAndLogin(request, 'e2e-payfail');

		const created = await createOrder(request, auth.accessToken, sku1Body);
		expect(created.status(), await created.text()).toBe(201);
		const order = await created.json();

		const failed = await waitForOrderStatus(
			request,
			auth.accessToken,
			order.id,
			'FAILED',
		);
		expect(failed.status).toBe('FAILED');
	});
});
