-- Drop the old composite unique constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_username_per_tenant;

-- Add the new global unique constraint on username
ALTER TABLE users ADD CONSTRAINT unique_username UNIQUE (username);
