CREATE TABLE IF NOT EXISTS products (
    product_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    available_qty INT NOT NULL CHECK (available_qty >= 0),
    reserved_qty INT NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    product_id TEXT NOT NULL REFERENCES products (product_id),
    quantity INT NOT NULL CHECK (quantity > 0),
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS reservations_order_product_idx
    ON reservations (order_id, product_id);

CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO products (product_id, name, available_qty)
VALUES
    ('sku-1', 'Demo Product', 100),
    ('sku-2', 'Second Product', 50)
ON CONFLICT (product_id) DO NOTHING;
