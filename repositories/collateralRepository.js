import { pool } from "../db/pool.js";

export const collateralRepository = {
  async list(filters = {}, connection = pool) {
    const search = filters.search ? `%${filters.search}%` : null;
    const status = filters.collateral_status ? String(filters.collateral_status).toLowerCase() : null;
    const [rows] = await connection.query(
      `SELECT
        col.*,
        l.loan_code,
        l.status AS loan_status,
        l.client_id,
        c.client_code,
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) AS client_name
      FROM collateral col
      INNER JOIN loans l ON l.id = col.loan_id
      LEFT JOIN clients c ON c.id = l.client_id
      WHERE (
        ? IS NULL OR
        l.loan_code LIKE ? OR
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) LIKE ? OR
        col.description LIKE ? OR
        col.item_type LIKE ?
      )
        AND (? IS NULL OR col.status = ?)
      ORDER BY col.created_at DESC`,
      [search, search, search, search, search, status, status]
    );
    return rows;
  },

  async findById(id, connection = pool) {
    const [rows] = await connection.query(
      `SELECT
        col.*,
        l.loan_code,
        l.status AS loan_status,
        l.client_id,
        c.client_code,
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) AS client_name
      FROM collateral col
      INNER JOIN loans l ON l.id = col.loan_id
      LEFT JOIN clients c ON c.id = l.client_id
      WHERE col.id = ?
      LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(collateral, connection = pool) {
    const [result] = await connection.query(
      `INSERT INTO collateral (
        loan_id, client_id, item_type, description, serial_number,
        estimated_value, valuation_date, status, storage_location, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        collateral.loan_id,
        collateral.client_id,
        collateral.item_type,
        collateral.description,
        collateral.serial_number || null,
        collateral.estimated_value || 0,
        collateral.valuation_date || null,
        collateral.status || "held",
        collateral.storage_location || null,
        collateral.notes || null,
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
      `UPDATE collateral SET ${columns}, updated_at = NOW() WHERE id = ?`,
      [...values, id]
    );
    return result.affectedRows > 0;
  },

  async remove(id, connection = pool) {
    const [result] = await connection.query("DELETE FROM collateral WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },
};
