import { pool } from "../db/pool.js";

export const notificationRepository = {
  async list(filters = {}, connection = pool) {
    const status = filters.status || null;
    const { rows } = await connection.query(
      `SELECT *
       FROM notifications
       WHERE ($1::text IS NULL OR ($1 = 'unread' AND is_read = FALSE) OR ($1 = 'read' AND is_read = TRUE))
       ORDER BY created_at DESC`,
      [status]
    );
    return rows;
  },

  async create(entry, connection = pool) {
    const { rows } = await connection.query(
      `INSERT INTO notifications (
        related_loan_id, related_client_id, type, title, message, severity, is_read
      ) VALUES ($1, $2, $3, $4, $5, $6, FALSE)
      RETURNING id`,
      [
        entry.related_loan_id || null,
        entry.related_client_id || null,
        entry.type,
        entry.title,
        entry.message,
        entry.severity,
      ]
    );
    return rows[0]?.id || null;
  },

  async findExisting(type, loanId, isRead = 0, connection = pool) {
    const normalizedIsRead = isRead === true || isRead === 1 || String(isRead).toLowerCase() === "true";
    const { rows } = await connection.query(
      `SELECT *
       FROM notifications
       WHERE type = $1
         AND related_loan_id = $2
         AND is_read = $3
       ORDER BY created_at DESC
       LIMIT 1`,
      [type, loanId, normalizedIsRead]
    );
    return rows[0] || null;
  },

  async markResolvedByLoanAndTypes(loanId, types, connection = pool) {
    if (!loanId || !types.length) return;
    const placeholders = types.map((_, index) => `$${index + 2}`).join(", ");
    await connection.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
       WHERE related_loan_id = $1
         AND type IN (${placeholders})
         AND is_read = FALSE`,
      [loanId, ...types]
    );
  },
};
