import { pool } from "../db/pool.js";

export const adminRepository = {
  async findByEmail(email, connection = pool) {
    const [rows] = await connection.query(
      `SELECT id, email, password_hash, full_name, role, is_active, last_login_at
       FROM admin_users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );
    return rows[0] || null;
  },

  async createAdmin(admin, connection = pool) {
    await connection.query(
      `INSERT INTO admin_users (full_name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [admin.full_name, admin.email, admin.password_hash, admin.role]
    );
  },

  async updateLastLogin(id, connection = pool) {
    await connection.query(
      `UPDATE admin_users
       SET last_login_at = NOW()
       WHERE id = ?`,
      [id]
    );
  },
};
