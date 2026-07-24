CREATE TABLE IF NOT EXISTS processed_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fact log (idempotent by event_id)
CREATE TABLE IF NOT EXISTS order_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    order_id TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    mapped_status TEXT NOT NULL,
    amount TEXT,
    currency TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_events_day_status
    ON order_events ((occurred_at::date), mapped_status);

-- Counters: one row per (calendar day UTC, saga status label)
CREATE TABLE IF NOT EXISTS order_status_daily (
    day DATE NOT NULL,
    status TEXT NOT NULL,
    count BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (day, status)
);
