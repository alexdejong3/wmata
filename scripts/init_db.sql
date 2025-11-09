-- Example Postgres initialization script
-- Creates a sample table for demonstration
-- Subscriptions table
-- Stores phone numbers that should be notified for upcoming trains
CREATE TABLE IF NOT EXISTS subscriptions (
	id SERIAL PRIMARY KEY,
	phone_number VARCHAR(30) NOT NULL,
	station_code VARCHAR(10) NOT NULL,
	destination VARCHAR(200) NOT NULL,
	-- Store only the time of day for daily notifications (HH:MM:SS)
	notify_at TIME NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Useful indexes for lookup and expiry
CREATE INDEX IF NOT EXISTS idx_subscriptions_phone ON subscriptions(phone_number);
CREATE INDEX IF NOT EXISTS idx_subscriptions_notify_at ON subscriptions(notify_at);
