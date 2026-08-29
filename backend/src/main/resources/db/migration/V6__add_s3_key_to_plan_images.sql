-- Add s3_key column to plan_images and allow null image_data for S3 storage
ALTER TABLE plan_images ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500);
ALTER TABLE plan_images ALTER COLUMN image_data DROP NOT NULL;
