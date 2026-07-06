-- Add unique constraint to email column in users table
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);
