-- ============================================================
-- Mix Loans — Performance Index Migration
-- Run once against the `mix_loans` database
-- Safe to run multiple times (IF NOT EXISTS guard)
-- ============================================================

-- Index on loans.client_id (JOIN and foreign key lookups)
CREATE INDEX IF NOT EXISTS idx_loans_client
    ON loans(client_id);

-- Index on loans.status (filtering by Active / Overdue / etc.)
CREATE INDEX IF NOT EXISTS idx_loans_status
    ON loans(status);

-- Index on loans.due_date (overdue queries, date range scans)
CREATE INDEX IF NOT EXISTS idx_loans_due_date
    ON loans(due_date);

-- Index on payments.loan_id (payment history per loan)
CREATE INDEX IF NOT EXISTS idx_payments_loan
    ON payments(loan_id);
