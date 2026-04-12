import { pool } from "../db/pool.js";

export const paymentRepository = {
  async list(filters = {}, connection = pool) {
    const search = filters.search ? `%${filters.search}%` : null;
    const status = filters.loan_status ? String(filters.loan_status).toLowerCase() : null;
    const [rows] = await connection.query(
      `SELECT
        p.*,
        l.client_id,
        l.loan_code,
        l.status AS loan_status,
        ROUND(
          l.total_repayable - SUM(p.amount) OVER (
            PARTITION BY p.loan_id
            ORDER BY p.payment_date, p.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ),
          2
        ) AS resulting_balance,
        c.client_code,
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) AS client_name
      FROM payments p
      INNER JOIN loans l ON l.id = p.loan_id
      LEFT JOIN clients c ON c.id = l.client_id
      WHERE (
        ? IS NULL OR
        CAST(p.id AS CHAR) LIKE ? OR
        p.payment_code LIKE ? OR
        l.loan_code LIKE ? OR
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) LIKE ?
      )
        AND (? IS NULL OR l.status = ?)
      ORDER BY p.payment_date DESC, p.created_at DESC`,
      [search, search, search, search, search, status, status]
    );
    return rows;
  },

  async listByLoanId(loanId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT
        p.*,
        l.client_id,
        l.loan_code,
        l.status AS loan_status,
        ROUND(
          l.total_repayable - SUM(p.amount) OVER (
            PARTITION BY p.loan_id
            ORDER BY p.payment_date, p.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ),
          2
        ) AS resulting_balance,
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) AS client_name
       FROM payments p
       INNER JOIN loans l ON l.id = p.loan_id
       LEFT JOIN clients c ON c.id = l.client_id
       WHERE p.loan_id = ?
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [loanId]
    );
    return rows;
  },

  async findById(id, connection = pool) {
    const [rows] = await connection.query(
      `SELECT
        p.*,
        l.client_id,
        l.loan_code,
        l.status AS loan_status,
        ROUND(
          l.total_repayable - SUM(p.amount) OVER (
            PARTITION BY p.loan_id
            ORDER BY p.payment_date, p.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ),
          2
        ) AS resulting_balance,
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) AS client_name
       FROM payments p
       INNER JOIN loans l ON l.id = p.loan_id
       LEFT JOIN clients c ON c.id = l.client_id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(payment, connection = pool) {
    const [result] = await connection.query(
      `INSERT INTO payments (
        payment_code, loan_id, schedule_id, payment_date, amount,
        principal_applied, interest_applied, penalty_applied,
        payment_method, reference_number, received_by, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.payment_code,
        payment.loan_id,
        payment.schedule_id || null,
        payment.payment_date,
        payment.amount,
        payment.principal_applied,
        payment.interest_applied,
        payment.penalty_applied,
        payment.payment_method || "cash",
        payment.reference_number || null,
        payment.received_by || null,
        payment.notes || null,
      ]
    );
    return result.insertId;
  },
};
