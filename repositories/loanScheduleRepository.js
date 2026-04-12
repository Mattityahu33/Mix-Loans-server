import { pool } from "../db/pool.js";

export const loanScheduleRepository = {
  async createMany(loanId, schedules, connection = pool) {
    if (!schedules.length) return;
    const values = schedules.map((schedule) => [
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
      schedule.paid_at || null,
    ]);

    await connection.query(
      `INSERT INTO loan_schedules (
        loan_id, installment_number, due_date, principal_due, interest_due, penalty_due,
        total_due, amount_paid, remaining_due, status, paid_at
      ) VALUES ?`,
      [values]
    );
  },

  async listByLoanId(loanId, connection = pool) {
    const [rows] = await connection.query(
      `SELECT *
       FROM loan_schedules
       WHERE loan_id = ?
       ORDER BY installment_number ASC`,
      [loanId]
    );
    return rows;
  },

  async listOutstandingByLoanIdForUpdate(loanId, connection) {
    const [rows] = await connection.query(
      `SELECT *
       FROM loan_schedules
       WHERE loan_id = ?
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
    const columns = entries.map(([key]) => `${key} = ?`).join(", ");
    const values = entries.map(([, value]) => value);
    const [result] = await connection.query(
      `UPDATE loan_schedules
       SET ${columns}, updated_at = NOW()
       WHERE id = ?`,
      [...values, id]
    );
    return result.affectedRows > 0;
  },

  async removeByLoanId(loanId, connection = pool) {
    await connection.query("DELETE FROM loan_schedules WHERE loan_id = ?", [loanId]);
  },
};
