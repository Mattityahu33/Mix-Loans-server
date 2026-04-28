import { pool } from "../db/pool.js";

export const paymentRepository = {
  async list(filters = {}, connection = pool) {
    const search = filters.search ? `%${filters.search}%` : null;
    const status = filters.loan_status ? String(filters.loan_status).toLowerCase() : null;
    const { rows } = await connection.query(
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
        $1::text IS NULL OR
        CAST(p.id AS TEXT) ILIKE $1 OR
        p.payment_code ILIKE $1 OR
        l.loan_code ILIKE $1 OR
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) ILIKE $1
      )
        AND ($2::text IS NULL OR LOWER(l.status::text) = $2)
      ORDER BY p.payment_date DESC, p.created_at DESC`,
      [search, status]
    );
    return rows;
  },

  async listByLoanId(loanId, connection = pool) {
    const { rows } = await connection.query(
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
       WHERE p.loan_id = $1
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [loanId]
    );
    return rows;
  },

  async findById(id, connection = pool) {
    const { rows } = await connection.query(
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
       WHERE p.id = $1
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async findByIdForUpdate(id, connection) {
    const { rows } = await connection.query(
      `SELECT *
       FROM payments
       WHERE id = $1
       LIMIT 1
       FOR UPDATE`,
      [id]
    );
    return rows[0] || null;
  },

  async listByLoanIdForUpdate(loanId, connection) {
    const { rows } = await connection.query(
      `SELECT *
       FROM payments
       WHERE loan_id = $1
         AND is_reversed = FALSE
       ORDER BY payment_date ASC, id ASC
       FOR UPDATE`,
      [loanId]
    );
    return rows;
  },

  async create(payment, connection = pool) {
    const { rows } = await connection.query(
      `INSERT INTO payments (
        payment_code, loan_id, schedule_id, payment_date, amount,
        principal_applied, interest_applied, penalty_applied,
        payment_method, reference_number, received_by, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
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
      `UPDATE payments
       SET ${columns}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${entries.length + 1}`,
      [...values, id]
    );
    return result.rowCount > 0;
  },
};
