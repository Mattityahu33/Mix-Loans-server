import { pool } from "../db/pool.js";

export const auditRepository = {
  async create(entry, connection = pool) {
    await connection.query(
      `INSERT INTO audit_logs (
        admin_user_id, action_type, entity_type, entity_id, description,
        old_values, new_values, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.admin_user_id || null,
        entry.action_type,
        entry.entity_type,
        entry.entity_id || null,
        entry.description,
        entry.old_values ? JSON.stringify(entry.old_values) : null,
        entry.new_values ? JSON.stringify(entry.new_values) : null,
        entry.ip_address || null,
        entry.user_agent || null,
      ]
    );
  },
};
