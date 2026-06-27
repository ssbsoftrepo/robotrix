ALTER TABLE patients ADD COLUMN pid VARCHAR(100);

-- Update existing patients with a formatted PID per tenant
WITH numbered_patients AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at, id) as rn
    FROM patients
)
UPDATE patients
SET pid = 'PID-' || lpad(numbered_patients.rn::text, 4, '0')
FROM numbered_patients
WHERE patients.id = numbered_patients.id;

-- Make it not null and add unique constraint
ALTER TABLE patients ALTER COLUMN pid SET NOT NULL;
ALTER TABLE patients ADD CONSTRAINT unique_pid_per_tenant UNIQUE (tenant_id, pid);
