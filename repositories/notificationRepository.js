import { pool } from "../db/pool.js";

export const notificationRepository = {
  async list(filters = {}, connection = pool) {
    const status = filters.status || null;
    const [rows] = await connection.query(
      `SELECT *
       FROM notifications
       WHERE (? IS NULL OR (? = 'unread' AND is_read = 0) OR (? = 'read' AND is_read = 1))
       ORDER BY created_at DESC`,
      [status, status, status]
    );
    return rows;
  },

  async create(entry, connection = pool) {
    const [result] = await connection.query(
      `INSERT INTO notifications (
        related_loan_id, related_client_id, type, title, message, severity, is_read
      ) VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        entry.related_loan_id || null,
        entry.related_client_id || null,
        entry.type,
        entry.title,
        entry.message,
        entry.severity,
      ]
    );
    return result.insertId;
  },

  async findExisting(type, loanId, isRead = 0, connection = pool) {
    const [rows] = await connection.query(
      `SELECT *
       FROM notifications
       WHERE type = ?
         AND related_loan_id = ?
         AND is_read = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [type, loanId, isRead]
    );
    return rows[0] || null;
  },

  async markResolvedByLoanAndTypes(loanId, types, connection = pool) {
    if (!loanId || !types.length) return;
    const placeholders = types.map(() => "?").join(", ");
    await connection.query(
      `UPDATE notifications
       SET is_read = 1, read_at = NOW()
       WHERE related_loan_id = ?
         AND type IN (${placeholders})
         AND is_read = 0`,
      [loanId, ...types]
    );
  },
};
