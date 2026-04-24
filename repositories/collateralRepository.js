import { pool } from "../db/pool.js";

export const collateralRepository = {
  async list(filters = {}, connection = pool) {
    const search = filters.search ? `%${filters.search}%` : null;
    const status = filters.collateral_status ? String(filters.collateral_status).toLowerCase() : null;
    const { rows } = await connection.query(
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
        $1::text IS NULL OR
        l.loan_code ILIKE $1 OR
        CONCAT_WS(' ', c.first_name, c.last_name, c.other_names) ILIKE $1 OR
        col.description ILIKE $1 OR
        col.item_type ILIKE $1
      )
        AND ($2::text IS NULL OR LOWER(col.status::text) = $2)
      ORDER BY col.created_at DESC`,
      [search, status]
    );
    return rows;
  },

  async findById(id, connection = pool) {
    const { rows } = await connection.query(
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
      WHERE col.id = $1
      LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  },

  async create(collateral, connection = pool) {
    const { rows } = await connection.query(
      `INSERT INTO collateral (
        loan_id, client_id, item_type, description, serial_number,
        estimated_value, valuation_date, status, storage_location, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
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
      `UPDATE collateral SET ${columns}, updated_at = CURRENT_TIMESTAMP WHERE id = $${entries.length + 1}`,
      [...values, id]
    );
    return result.rowCount > 0;
  },

  async remove(id, connection = pool) {
    const result = await connection.query("DELETE FROM collateral WHERE id = $1", [id]);
    return result.rowCount > 0;
  },
};
