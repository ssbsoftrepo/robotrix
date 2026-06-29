-- 1. Create Tenants Table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    hid VARCHAR(100) UNIQUE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Users Table (tenant_id is nullable for platform-wide SuperAdmin)
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- 'SUPERADMIN', 'HOSPITAL_ADMIN', 'DOCTOR'
    mobile_number VARCHAR(20),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    consultant_id VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Patients Table
CREATE TABLE patients (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    pid VARCHAR(100) NOT NULL,
    age INT,
    gender VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_pid_per_tenant UNIQUE (tenant_id, pid)
);

-- 4. Create Surgery Plans Table
CREATE TABLE surgery_plans (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    patient_id BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leg_side VARCHAR(20) NOT NULL,
    case_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Plan Images Table
CREATE TABLE plan_images (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id BIGINT NOT NULL REFERENCES surgery_plans(id) ON DELETE CASCADE,
    image_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    image_data BYTEA NOT NULL
);

-- Seed SuperAdmin User
INSERT INTO users (username, password_hash, role, active)
VALUES ('superadmin', '$2a$10$n27IK0xeK8MWXpb2C0M.8.G5PMP68CDlL5NZtEy2PlMzXX.Km9kZe', 'SUPERADMIN', TRUE);
