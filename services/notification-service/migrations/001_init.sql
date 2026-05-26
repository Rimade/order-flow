CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY,
    message_id TEXT NOT NULL UNIQUE,
    order_id UUID NOT NULL,
    payment_id TEXT,
    channel TEXT NOT NULL,
    notification_type TEXT NOT NULL,
    status TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 1,
    last_error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS notification_deliveries_order_id_idx
    ON notification_deliveries (order_id);
