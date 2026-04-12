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
    const clientId = filters.client_id || null;
    const [rows] = await connection.query(
      `${baseSelect}
       WHERE (
         ? IS NULL OR
         CAST(l.id AS CHAR) LIKE ? OR
         l.loan_code LIKE ? OR
         c.client_code LIKE ? OR
         CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) LIKE ?
       )
         AND (? IS NULL OR l.status = ?)
         AND (? IS NULL OR l.client_id = ?)
       ORDER BY l.created_at DESC`,
      [search, search, search, search, search, status, status, clientId, clientId]
    );
    return rows;
  },

  async listByClientId(clientId, connection = pool) {
    const [rows] = await connection.query(
      `${baseSelect}
       WHERE l.client_id = ?
       ORDER BY l.created_at DESC`,
      [clientId]
    );
    return rows;
  },

  async findById(id, connection = pool) {
    const [rows] = await connection.query(
      `${baseSelect}
       WHERE l.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByIdForUpdate(id, connection) {
    const [rows] = await connection.query(
      `${baseSelect}
       WHERE l.id = ?
       LIMIT 1
       FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },

  async countOpenLoansForClient(clientId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT COUNT(*) AS open_loan_count
       FROM loans
       WHERE client_id = ?
         AND status IN ('draft', 'pending', 'active', 'overdue')`,
      [clientId]
    );
    return Number(rows[0]?.open_loan_count || 0);
  },

  async create(loan, connection = pool) {
    const [result] = await connection.query(
      `INSERT INTO loans (
        loan_code, client_id, principal_amount, interest_rate, interest_type,
        repayment_frequency, duration_value, duration_unit, number_of_installments,
        start_date, first_due_date, maturity_date, grace_period_days, total_interest,
        total_penalties, total_repayable, amount_paid, remaining_balance, status,
        disbursed_by, approved_by, notes, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    return result.insertId;
  },

  async update(id, fields, connection = pool) {
    const entries = Object.entries(fields);
    if (entries.length === 0) {
      return false;
    }
    const columns = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    const [result] = await connection.query(
      `UPDATE loans SET ${columns}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
    return result.affectedRows > 0;
  },

  async remove(id, connection = pool) {
    const [result] = await connection.query("DELETE FROM loans WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  async monthlyPortfolio(connection = pool) {
    const [rows] = await connection.query(
      `SELECT
        DATE_FORMAT(created_at, '%Y-%m-01') AS month_key,
        SUM(principal_amount) AS total_disbursed,
        SUM(total_interest) AS expected_interest,
        COUNT(*) AS loans_created
      FROM loans
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-01')
      ORDER BY month_key ASC`
    );
    return rows;
  },
};
