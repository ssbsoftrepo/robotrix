-- Add subscription lifecycle columns to tenants table
ALTER TABLE tenants ADD COLUMN subscription_expires_at TIMESTAMP;
ALTER TABLE tenants ADD COLUMN last_renewed_at TIMESTAMP;

-- Backfill: existing tenants get 1 year from their creation date
UPDATE tenants SET subscription_expires_at = created_at + INTERVAL '1 year';
