import { pool } from "../db/pool.js";

const baseSelect = `
  SELECT
    l.*,
    c.client_code,
    CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) AS client_name,
    col.description AS collateral_description,
    col.estimated_value AS collateral_value,
    col.status AS collateral_status
  FROM loans l
  LEFT JOIN clients c ON c.id = l.client_id
  LEFT JOIN collateral col ON col.loan_id = l.id
`;

export const loanRepository = {
  async list(filters = {}, connection = pool) {
    const search = filters.search ? `%${filters.search}%` : null;
    const status = filters.status ? String(filters.status).toLowerCase() : null;
    const parsedClientId = filters.client_id === undefined ? null : Number(filters.client_id);
    const clientId = Number.isFinite(parsedClientId) ? parsedClientId : null;
    const { rows } = await connection.query(
      `${baseSelect}
       WHERE (
         $1::text IS NULL OR
         CAST(l.id AS TEXT) ILIKE $1 OR
         l.loan_code ILIKE $1 OR
         c.client_code ILIKE $1 OR
         CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) ILIKE $1
       )
         AND ($2::text IS NULL OR LOWER(l.status::text) = $2)
         AND ($3::bigint IS NULL OR l.client_id = $3)
       ORDER BY l.created_at DESC`,
      [search, status, clientId]
    );
    return rows;
  },

  async listByClientId(clientId, connection = pool) {
    const { rows } = await connection.query(
      `${baseSelect}
       WHERE l.client_id = $1
       ORDER BY l.created_at DESC`,
      [clientId]
    );
    return rows;
  },

  async findById(id, connection = pool) {
    const { rows } = await connection.query(
      `${baseSelect}
       WHERE l.id = $1
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByIdForUpdate(id, connection) {
    const { rows } = await connection.query(
      `${baseSelect}
       WHERE l.id = $1
       LIMIT 1
       FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },

  async countOpenLoansForClient(clientId, connection = pool) {
    const { rows } = await connection.query(
      `SELECT COUNT(*) AS open_loan_count
       FROM loans
       WHERE client_id = $1
         AND status IN ('draft', 'pending', 'active', 'overdue')`,
      [clientId]
    );
    return Number(rows[0]?.open_loan_count || 0);
  },

  async create(loan, connection = pool) {
    const { rows } = await connection.query(
      `INSERT INTO loans (
        loan_code, client_id, principal_amount, interest_rate, interest_type,
        repayment_frequency, duration_value, duration_unit, number_of_installments,
        start_date, first_due_date, maturity_date, grace_period_days, total_interest,
        total_penalties, total_repayable, amount_paid, remaining_balance, status,
        disbursed_by, approved_by, notes, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      RETURNING id`,
      [
        loan.loan_code,
        loan.client_id,
        loan.principal_amount,
        loan.interest_rate,
        loan.interest_type,
        loan.repayment_frequency,
        loan.duration_value,
        loan.duration_unit,
        loan.number_of_installments,
        loan.start_date,
        loan.first_due_date,
        loan.maturity_date,
        loan.grace_period_days,
        loan.total_interest,
        loan.total_penalties,
        loan.total_repayable,
        loan.amount_paid,
        loan.remaining_balance,
        loan.status,
        loan.disbursed_by || null,
        loan.approved_by || null,
        loan.notes || null,
        1,
      ]
    );
    return rows[0]?.id || null;
  },

  async update(id, fields, connection = pool) {
    const entries = Object.entries(fields);
    if (entries.length === 0) {
      return false;
    }
    const columns = entries.map(([key], index) => `${key} = $${index + 1}`).join(", ");
    const values = entries.map(([, value]) => value);
    const result = await connection.query(
      `UPDATE loans SET ${columns}, updated_at = CURRENT_TIMESTAMP WHERE id = $${entries.length + 1}`,
      [...values, id]
    );
    return result.rowCount > 0;
  },

  async remove(id, connection = pool) {
    const result = await connection.query("DELETE FROM loans WHERE id = $1", [id]);
    return result.rowCount > 0;
  },

  async monthlyPortfolio(connection = pool) {
    const { rows } = await connection.query(
      `SELECT
        TO_CHAR(DATE_TRUNC('month', created_at)::date, 'YYYY-MM-DD') AS month_key,
        SUM(principal_amount) AS total_disbursed,
        SUM(total_interest) AS expected_interest,
        COUNT(*) AS loans_created
      FROM loans
      GROUP BY DATE_TRUNC('month', created_at)::date
      ORDER BY month_key ASC`
    );
    return rows;
  },
};
