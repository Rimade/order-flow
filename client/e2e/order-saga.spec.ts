import { expect, test } from '@playwright/test';

const password = 'Password1!';

test.describe('Order saga (browser)', () => {
  test('register, create order sku-1, reach CONFIRMED', async ({ page }) => {
    const email = `e2e-${Date.now()}@orderflow.test`;

    await page.goto('/register');

    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(password);
    await page.getByTestId('register-submit').click();

    await expect(page).toHaveURL(/\/orders/);
    await expect(page.getByRole('heading', { name: 'Заказы' })).toBeVisible();

    await page.getByTestId('create-order').click();

    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/i);
    await expect(page.getByTestId('order-status')).toHaveText('Подтверждён');
  });
});
