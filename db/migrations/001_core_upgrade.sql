-- LEGACY MYSQL MIGRATION (DO NOT USE FOR POSTGRESQL)
-- This file is retained for historical reference only.
-- PostgreSQL/Supabase source of truth now lives in: db/postgres/*.sql

CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(32) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(32) PRIMARY KEY,
    actor_admin_id VARCHAR(32) NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(64) NULL,
    metadata JSON NULL,
    ip_address VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_actor (actor_admin_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(32) PRIMARY KEY,
    loan_id VARCHAR(32) NULL,
    client_id VARCHAR(32) NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(50) NOT NULL DEFAULT 'info',
    status VARCHAR(20) NOT NULL DEFAULT 'unread',
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_loan (loan_id),
    INDEX idx_notifications_type (type)
);

CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(50) DEFAULT 'en',
    currency_format VARCHAR(50) DEFAULT 'ZMW',
    items_per_page INT DEFAULT 10,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    hide_sensitive_info BOOLEAN DEFAULT FALSE,
    dashboard_layout VARCHAR(255) DEFAULT 'default',
    default_loan_amount DECIMAL(15, 2) DEFAULT 1000.00,
    default_interest_rate DECIMAL(8, 4) DEFAULT 15.00,
    default_interest_type VARCHAR(20) DEFAULT 'Monthly',
    default_grace_period INT DEFAULT 7,
    due_soon_threshold_days INT DEFAULT 7,
    total_capital_available DECIMAL(15, 2) DEFAULT 1000000.00,
    penalty_rate_per_day DECIMAL(8, 4) DEFAULT 0.00,
    allow_multiple_open_loans BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

ALTER TABLE clients
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE loans
    ADD COLUMN IF NOT EXISTS repayment_structure VARCHAR(20) NOT NULL DEFAULT 'flat',
    ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS penalty_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS principal_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS resulting_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE collateral
    ADD COLUMN IF NOT EXISTS collateral_status VARCHAR(20) NOT NULL DEFAULT 'Held',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_loans_client ON loans(client_id);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
CREATE INDEX IF NOT EXISTS idx_payments_loan ON payments(loan_id);
