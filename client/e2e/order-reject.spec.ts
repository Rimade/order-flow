import { expect, test } from '@playwright/test';

const password = 'Password1!';

test.describe('Order saga failure (browser)', () => {
  test('register, create order sku-4, reach CANCELLED', async ({ page }) => {
    const email = `e2e-reject-${Date.now()}@orderflow.test`;

    await page.goto('/register');
    await page.getByTestId('register-email').fill(email);
    await page.getByTestId('register-password').fill(password);
    await page.getByTestId('register-submit').click();

    await expect(page).toHaveURL(/\/orders/);

    await page.getByTestId('create-order-reject').click();

    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/i);
    await expect(page.getByTestId('order-status')).toHaveText('Отменён');
  });
});
