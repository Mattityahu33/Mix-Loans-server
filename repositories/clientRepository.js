import { pool } from "../db/pool.js";
import { formatFullName, splitFullName, uiRiskToDb } from "../utils/schemaAdapters.js";
import { generatePrefixedId } from "../utils/id.js";

export const clientRepository = {
  async list(filters = {}, connection = pool) {
    const search = filters.search ? `%${filters.search}%` : null;
    const riskLevel = filters.risk_level ? uiRiskToDb(filters.risk_level) : null;
    const { rows } = await connection.query(
      `SELECT
        c.*,
        COUNT(l.id) AS loan_count,
        COALESCE(SUM(l.remaining_balance), 0) AS total_outstanding
      FROM clients c
      LEFT JOIN loans l ON c.id = l.client_id
      WHERE (
        $1::text IS NULL OR
        c.client_code ILIKE $1 OR
        c.first_name ILIKE $1 OR
        c.last_name ILIKE $1 OR
        c.phone ILIKE $1 OR
        c.nrc ILIKE $1
      )
        AND ($2::text IS NULL OR c.risk_level::text = $2)
      GROUP BY c.id
      ORDER BY c.created_at DESC`,
      [search, riskLevel]
    );
    return rows.map((row) => ({
      ...row,
      name: formatFullName(row),
      NRC: row.nrc,
      address: [row.address_line_1, row.address_line_2, row.city, row.province, row.country]
        .filter(Boolean)
        .join(", "),
    }));
  },

  async findById(id, connection = pool) {
    const { rows } = await connection.query(
      `SELECT
        c.*,
        COUNT(l.id) AS loan_count,
        COALESCE(SUM(l.remaining_balance), 0) AS total_outstanding
      FROM clients c
      LEFT JOIN loans l ON c.id = l.client_id
      WHERE c.id = $1
      GROUP BY c.id`,
      [id]
    );
    const row = rows[0];
    if (!row) return null;
    return {
      ...row,
      name: formatFullName(row),
      NRC: row.nrc,
      address: [row.address_line_1, row.address_line_2, row.city, row.province, row.country]
        .filter(Boolean)
        .join(", "),
    };
  },

  async create(client, connection = pool) {
    const nameParts = splitFullName(client.name);
    const clientCode = client.id || client.client_code || `CL-${generatePrefixedId("")}`;
    const { rows } = await connection.query(
      `INSERT INTO clients (
        client_code, first_name, last_name, other_names, phone, email, nrc,
        address_line_1, risk_level, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        clientCode,
        nameParts.first_name,
        nameParts.last_name,
        nameParts.other_names,
        client.phone,
        client.email || null,
        client.id_number,
        client.address || null,
        uiRiskToDb(client.risk_level || "Medium"),
        client.notes || null,
      ]
    );
    return rows[0]?.id || null;
  },

  async update(id, fields, connection = pool) {
    const entries = Object.entries(fields);
    if (entries.length === 0) {
      return false;
    }

    const nextFields = { ...fields };
    if (nextFields.name) {
      const parts = splitFullName(nextFields.name);
      nextFields.first_name = parts.first_name;
      nextFields.last_name = parts.last_name;
      nextFields.other_names = parts.other_names;
      delete nextFields.name;
    }
    if (nextFields.id_number !== undefined) {
      nextFields.nrc = nextFields.id_number;
      delete nextFields.id_number;
    }
    if (nextFields.address !== undefined) {
      nextFields.address_line_1 = nextFields.address;
      delete nextFields.address;
    }
    if (nextFields.risk_level !== undefined) {
      nextFields.risk_level = uiRiskToDb(nextFields.risk_level);
    }

    const updateMap = {};
    const normalizedEntries = Object.entries(nextFields);
    const columns = normalizedEntries
      .map(([key], index) => `${updateMap[key] || key} = $${index + 1}`)
      .join(", ");
    const values = normalizedEntries.map(([, value]) => value);
    const result = await connection.query(
      `UPDATE clients SET ${columns}, updated_at = CURRENT_TIMESTAMP WHERE id = $${normalizedEntries.length + 1}`,
      [...values, id]
    );
    return result.rowCount > 0;
  },

  async remove(id, connection = pool) {
    const result = await connection.query("DELETE FROM clients WHERE id = $1", [id]);
    return result.rowCount > 0;
  },
};
