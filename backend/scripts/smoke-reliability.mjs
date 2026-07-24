#!/usr/bin/env node
/**
 * Local/CI-optional reliability smoke against a running gateway stack.
 *
 * Usage:
 *   node backend/scripts/smoke-reliability.mjs
 *   E2E_PAYMENT_FAIL=1 node backend/scripts/smoke-reliability.mjs
 *
 * Needs: gateway :3000, auth, order (+ Redis idempotency), inventory, payment.
 */
const gateway = (process.env.GATEWAY_URL || 'http://localhost:3000').replace(
  /\/$/,
  '',
);

const sku1Body = {
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

async function json(res) {
  const text = await res.text();
  try {
    return { status: res.status, body: text ? JSON.parse(text) : null, text };
  } catch {
    return { status: res.status, body: null, text };
  }
}

async function main() {
  const email = `smoke-rel-${Date.now()}@orderflow.test`;
  const password = 'Password1!';

  let res = await fetch(`${gateway}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  let parsed = await json(res);
  if (parsed.status >= 400) {
    throw new Error(`register failed: ${parsed.status} ${parsed.text}`);
  }

  res = await fetch(`${gateway}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  parsed = await json(res);
  if (!parsed.body?.accessToken) {
    throw new Error(`login failed: ${parsed.status} ${parsed.text}`);
  }
  const token = parsed.body.accessToken;

  const key = crypto.randomUUID();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Idempotency-Key': key,
  };

  res = await fetch(`${gateway}/api/v1/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(sku1Body),
  });
  const first = await json(res);
  if (first.status !== 201) {
    throw new Error(`create#1 failed: ${first.status} ${first.text}`);
  }

  res = await fetch(`${gateway}/api/v1/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(sku1Body),
  });
  const second = await json(res);
  if (second.status !== 201) {
    throw new Error(`create#2 failed: ${second.status} ${second.text}`);
  }
  if (second.body.id !== first.body.id) {
    throw new Error(
      `idempotency broken: ${first.body.id} vs ${second.body.id}`,
    );
  }
  console.log('OK idempotency replay', first.body.id);

  const mismatchBody = {
    ...sku1Body,
    items: [{ ...sku1Body.items[0], quantity: 2 }],
  };
  res = await fetch(`${gateway}/api/v1/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(mismatchBody),
  });
  const mismatch = await json(res);
  if (mismatch.status !== 422) {
    throw new Error(`expected 422 on body mismatch, got ${mismatch.status}`);
  }
  console.log('OK idempotency fingerprint mismatch → 422');

  if (process.env.E2E_PAYMENT_FAIL === '1') {
    res = await fetch(`${gateway}/api/v1/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sku1Body),
    });
    const created = await json(res);
    if (created.status !== 201) {
      throw new Error(`payfail create failed: ${created.status}`);
    }

    const orderId = created.body.id;
    const deadline = Date.now() + 60_000;
    let status = created.body.status;
    while (Date.now() < deadline) {
      res = await fetch(`${gateway}/api/v1/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const order = await json(res);
      status = order.body?.status;
      if (status === 'FAILED') {
        console.log('OK payment-fail → FAILED', orderId);
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    throw new Error(`payment-fail timeout, last status=${status}`);
  }

  console.log('Skip payment-fail (set E2E_PAYMENT_FAIL=1 to enable)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
