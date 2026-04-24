import { pool } from "../db/pool.js";

export const loanScheduleRepository = {
  async createMany(loanId, schedules, connection = pool) {
    if (!schedules.length) return;
    const values = [];
    const placeholders = schedules
      .map((schedule, index) => {
        const offset = index * 11;
        values.push(
          loanId,
          schedule.installment_number,
          schedule.due_date,
          schedule.principal_due,
          schedule.interest_due,
          schedule.penalty_due,
          schedule.total_due,
          schedule.amount_paid,
          schedule.remaining_due,
          schedule.status,
          schedule.paid_at || null
        );
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`;
      })
      .join(", ");

    await connection.query(
      `INSERT INTO loan_schedules (
        loan_id, installment_number, due_date, principal_due, interest_due, penalty_due,
        total_due, amount_paid, remaining_due, status, paid_at
      ) VALUES ${placeholders}`,
      values
    );
  },

  async listByLoanId(loanId, connection = pool) {
    const { rows } = await connection.query(
      `SELECT *
       FROM loan_schedules
       WHERE loan_id = $1
       ORDER BY installment_number ASC`,
      [loanId]
    );
    return rows;
  },

  async listOutstandingByLoanIdForUpdate(loanId, connection) {
    const { rows } = await connection.query(
      `SELECT *
       FROM loan_schedules
       WHERE loan_id = $1
         AND remaining_due > 0
       ORDER BY installment_number ASC
       FOR UPDATE`,
      [loanId]
    );
    return rows;
  },

  async update(id, fields, connection = pool) {
    const entries = Object.entries(fields);
    if (entries.length === 0) return false;
    const columns = entries.map(([key], index) => `${key} = $${index + 1}`).join(", ");
    const values = entries.map(([, value]) => value);
    const result = await connection.query(
      `UPDATE loan_schedules
       SET ${columns}, updated_at = CURRENT_TIMESTAMP
       WHERE id = $${entries.length + 1}`,
      [...values, id]
    );
    return result.rowCount > 0;
  },

  async removeByLoanId(loanId, connection = pool) {
    await connection.query("DELETE FROM loan_schedules WHERE loan_id = $1", [loanId]);
  },
};
