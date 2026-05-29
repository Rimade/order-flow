import { expect, test } from '@playwright/test';

const password = 'Password1!';

test.describe('Catalog to order (browser)', () => {
	test('register, checkout sku-1 from catalog, reach CONFIRMED', async ({ page }) => {
		const email = `e2e-catalog-${Date.now()}@orderflow.test`;

		await page.goto('/register');
		await page.getByTestId('register-email').fill(email);
		await page.getByTestId('register-password').fill(password);
		await page.getByTestId('register-submit').click();

		await expect(page).toHaveURL(/\/orders/);

		await page.goto('/catalog');
		await expect(page.getByRole('heading', { name: 'Каталог' })).toBeVisible();

		await page.getByTestId('view-sku-1').click();
		await expect(page).toHaveURL(/\/catalog\/sku-1/);

		await page.getByTestId('catalog-checkout-open').click();
		await page.getByTestId('catalog-checkout-confirm').click();

		await expect(page).toHaveURL(/\/orders/);
		await page.getByTestId('create-order-from-catalog').click();

		await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/i);
		await expect(page.getByTestId('order-status')).toHaveText('Подтверждён');
	});
});
