-- Fraud Detection schema (idempotent)
-- Database: fraud_detection

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('ADMIN', 'ANALYST')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- ============================================================
-- TRANSACTIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    prediction INTEGER NOT NULL CHECK (prediction IN (0, 1)),
    probability DOUBLE PRECISION NOT NULL CHECK (probability >= 0 AND probability <= 1),
    risk_level VARCHAR(20) NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    threshold DOUBLE PRECISION NOT NULL CHECK (threshold >= 0 AND threshold <= 1),
    fold_probabilities JSONB,
    features JSONB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Safe additive column for ownership (existing rows remain valid with NULL)
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_created_at
    ON transactions (created_at);

CREATE INDEX IF NOT EXISTS idx_transactions_prediction
    ON transactions (prediction);

CREATE INDEX IF NOT EXISTS idx_transactions_risk_level
    ON transactions (risk_level);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id
    ON transactions (user_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(80) NOT NULL,
    resource VARCHAR(80),
    resource_id VARCHAR(80),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
    ON audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id
    ON audit_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON audit_logs (action);

-- ============================================================
-- INVESTIGATIONS (analyst feedback — never overwrites model prediction)
-- ============================================================

CREATE TABLE IF NOT EXISTS investigations (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'UNDER_REVIEW'
        CHECK (status IN ('UNDER_REVIEW', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'CONFIRMED_LEGITIMATE')),
    analyst_notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_investigations_status
    ON investigations (status);

CREATE INDEX IF NOT EXISTS idx_investigations_transaction_id
    ON investigations (transaction_id);

CREATE INDEX IF NOT EXISTS idx_investigations_updated_at
    ON investigations (updated_at DESC);

-- Existing DBs: widen status check without dropping data
ALTER TABLE investigations DROP CONSTRAINT IF EXISTS investigations_status_check;
ALTER TABLE investigations ADD CONSTRAINT investigations_status_check
    CHECK (status IN ('UNDER_REVIEW', 'CONFIRMED_FRAUD', 'FALSE_POSITIVE', 'CONFIRMED_LEGITIMATE'));

-- Persist SHAP explanation with the transaction (does not change /predict response)
ALTER TABLE transactions
    ADD COLUMN IF NOT EXISTS explanation JSONB;

-- Enrich generic audit_logs for per-transaction investigation history
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL;
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS old_status VARCHAR(30);
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS new_status VARCHAR(30);
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_audit_logs_transaction_id
    ON audit_logs (transaction_id);
