import { HTTP_STATUS } from "../constants/appConstants.js";
import { AppError } from "../utils/appError.js";
import { paymentRepository } from "../repositories/paymentRepository.js";
import { loanRepository } from "../repositories/loanRepository.js";
import { loanScheduleRepository } from "../repositories/loanScheduleRepository.js";
import { loanService } from "./loanService.js";
import { notificationService } from "./notificationService.js";

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));
const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const normalizePaymentMethod = (value) => {
  const normalized = String(value || "cash").trim().toLowerCase();
  const methodMap = {
    cash: "cash",
    bank: "bank_transfer",
    bank_transfer: "bank_transfer",
    mobile_money: "mobile_money",
    card: "card",
    other: "other",
  };
  return methodMap[normalized] || "cash";
};

const normalizePaymentUpdatePayload = (payload = {}) => {
  const normalized = {};
  const mappings = [
    ["amount", "amount"],
    ["payment_date", "paymentDate"],
    ["payment_method", "paymentMethod"],
    ["reference_number", "referenceNumber"],
    ["notes", "notes"],
  ];

  mappings.forEach(([snakeCaseKey, camelCaseKey]) => {
    if (hasOwn(payload, snakeCaseKey)) {
      normalized[snakeCaseKey] = payload[snakeCaseKey];
      return;
    }
    if (camelCaseKey && hasOwn(payload, camelCaseKey)) {
      normalized[snakeCaseKey] = payload[camelCaseKey];
    }
  });

  return normalized;
};

const isValidDateInput = (value) => {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return !Number.isNaN(new Date(value).getTime());
  }
  return false;
};

const scheduleOutstandingBreakdown = (schedule) => {
  const amountPaid = Number(schedule.amount_paid || 0);
  const penaltyOutstanding = Math.max(0, Number(schedule.penalty_due || 0) - amountPaid);
  const amountAfterPenalty = Math.max(0, amountPaid - Number(schedule.penalty_due || 0));
  const interestOutstanding = Math.max(0, Number(schedule.interest_due || 0) - amountAfterPenalty);
  const amountAfterInterest = Math.max(0, amountAfterPenalty - Number(schedule.interest_due || 0));
  const principalOutstanding = Math.max(0, Number(schedule.principal_due || 0) - amountAfterInterest);

  return {
    penaltyOutstanding: roundCurrency(penaltyOutstanding),
    interestOutstanding: roundCurrency(interestOutstanding),
    principalOutstanding: roundCurrency(principalOutstanding),
  };
};

export const paymentService = {
  async list(filters) {
    return paymentRepository.list(filters);
  },

  async getById(id) {
    const payment = await paymentRepository.findById(id);
    if (!payment) {
      throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
    }
    return payment;
  },

  async getByLoanId(loanId) {
    return paymentRepository.listByLoanId(loanId);
  },

  async create(payload, connection) {
    const currentLoan = await loanRepository.findByIdForUpdate(payload.loan_id, connection);
    if (!currentLoan) {
      throw new AppError("Loan not found", HTTP_STATUS.NOT_FOUND);
    }

    const synchronizedLoan = await loanService.synchronizeLoan(currentLoan, connection);
    const paymentAmount = roundCurrency(payload.amount);
    const remainingBalance = roundCurrency(synchronizedLoan.remaining_balance);

    if (paymentAmount <= 0) {
      throw new AppError("Payment amount must be greater than zero", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }

    if (remainingBalance <= 0) {
      throw new AppError("This loan is already fully paid", HTTP_STATUS.CONFLICT);
    }

    if (paymentAmount > remainingBalance) {
      throw new AppError(
        "Payment amount cannot exceed the remaining outstanding balance",
        HTTP_STATUS.UNPROCESSABLE_ENTITY
      );
    }

    const schedules = await loanScheduleRepository.listOutstandingByLoanIdForUpdate(payload.loan_id, connection);
    let amountToAllocate = paymentAmount;
    let principalApplied = 0;
    let interestApplied = 0;
    let penaltyApplied = 0;
    let targetedScheduleId = payload.schedule_id || null;

    for (const schedule of schedules) {
      if (amountToAllocate <= 0) break;

      if (!targetedScheduleId) {
        targetedScheduleId = schedule.id;
      }

      const allocation = roundCurrency(Math.min(amountToAllocate, Number(schedule.remaining_due || 0)));
      const breakdown = scheduleOutstandingBreakdown(schedule);

      const penaltyShare = roundCurrency(Math.min(allocation, breakdown.penaltyOutstanding));
      const afterPenalty = roundCurrency(allocation - penaltyShare);
      const interestShare = roundCurrency(Math.min(afterPenalty, breakdown.interestOutstanding));
      const afterInterest = roundCurrency(afterPenalty - interestShare);
      const principalShare = roundCurrency(Math.min(afterInterest, breakdown.principalOutstanding));

      penaltyApplied = roundCurrency(penaltyApplied + penaltyShare);
      interestApplied = roundCurrency(interestApplied + interestShare);
      principalApplied = roundCurrency(principalApplied + principalShare);

      const nextAmountPaid = roundCurrency(Number(schedule.amount_paid || 0) + allocation);
      const nextRemainingDue = roundCurrency(Math.max(0, Number(schedule.total_due || 0) - nextAmountPaid));

      await loanScheduleRepository.update(
        schedule.id,
        {
          amount_paid: nextAmountPaid,
          remaining_due: nextRemainingDue,
          status: nextRemainingDue <= 0 ? "paid" : "partial",
          paid_at: nextRemainingDue <= 0 ? payload.payment_date : null,
        },
        connection
      );

      amountToAllocate = roundCurrency(amountToAllocate - allocation);
    }

    if (amountToAllocate > 0) {
      throw new AppError("Unable to allocate payment to the loan schedule", HTTP_STATUS.CONFLICT);
    }

    const nextAmountPaid = roundCurrency(Number(currentLoan.amount_paid || 0) + paymentAmount);
    const nextRemainingBalance = roundCurrency(Math.max(0, Number(currentLoan.total_repayable || 0) - nextAmountPaid));

    const paymentId = await paymentRepository.create(
      {
        payment_code: payload.id || `PY-${Date.now()}`,
        loan_id: Number(payload.loan_id),
        schedule_id: targetedScheduleId,
        payment_date: payload.payment_date,
        amount: paymentAmount,
        principal_applied: principalApplied,
        interest_applied: interestApplied,
        penalty_applied: penaltyApplied,
        payment_method: normalizePaymentMethod(payload.payment_method),
        reference_number: payload.reference_number || null,
        received_by: payload.actor_admin_id || null,
        notes: payload.notes || null,
      },
      connection
    );

    await loanRepository.update(
      payload.loan_id,
      {
        amount_paid: nextAmountPaid,
        remaining_balance: nextRemainingBalance,
      },
      connection
    );

    const payment = await paymentRepository.findById(paymentId, connection);
    const updatedLoan = await loanService.getById(payload.loan_id, connection);

    await notificationService.notifyPaymentRecorded(
      {
        loan: updatedLoan,
        payment,
        completed: updatedLoan.status === "Completed",
      },
      connection
    );

    return {
      payment,
      loan: updatedLoan,
    };
  },

  async recalculateLoanFromPayments(loanId, connection) {
    const schedules = await loanScheduleRepository.listByLoanIdForUpdate(loanId, connection);
    const payments = await paymentRepository.listByLoanIdForUpdate(loanId, connection);

    const workingSchedules = schedules.map((schedule) => ({
      ...schedule,
      amount_paid: 0,
      remaining_due: roundCurrency(schedule.total_due),
      status: String(schedule.status || "").toLowerCase() === "overdue" ? "overdue" : "pending",
      paid_at: null,
    }));

    let totalPaid = 0;

    for (const payment of payments) {
      let amountToAllocate = roundCurrency(payment.amount);
      let principalApplied = 0;
      let interestApplied = 0;
      let penaltyApplied = 0;
      let targetedScheduleId = null;

      if (amountToAllocate <= 0) {
        throw new AppError("Payment amount must be greater than zero", HTTP_STATUS.BAD_REQUEST);
      }

      for (const schedule of workingSchedules) {
        if (amountToAllocate <= 0) break;
        if (Number(schedule.remaining_due || 0) <= 0) continue;

        if (!targetedScheduleId) {
          targetedScheduleId = schedule.id;
        }

        const allocation = roundCurrency(Math.min(amountToAllocate, Number(schedule.remaining_due || 0)));
        const breakdown = scheduleOutstandingBreakdown(schedule);

        const penaltyShare = roundCurrency(Math.min(allocation, breakdown.penaltyOutstanding));
        const afterPenalty = roundCurrency(allocation - penaltyShare);
        const interestShare = roundCurrency(Math.min(afterPenalty, breakdown.interestOutstanding));
        const afterInterest = roundCurrency(afterPenalty - interestShare);
        const principalShare = roundCurrency(Math.min(afterInterest, breakdown.principalOutstanding));

        penaltyApplied = roundCurrency(penaltyApplied + penaltyShare);
        interestApplied = roundCurrency(interestApplied + interestShare);
        principalApplied = roundCurrency(principalApplied + principalShare);

        const nextAmountPaid = roundCurrency(Number(schedule.amount_paid || 0) + allocation);
        const nextRemainingDue = roundCurrency(Math.max(0, Number(schedule.total_due || 0) - nextAmountPaid));

        schedule.amount_paid = nextAmountPaid;
        schedule.remaining_due = nextRemainingDue;
        schedule.status = nextRemainingDue <= 0 ? "paid" : "partial";
        schedule.paid_at = nextRemainingDue <= 0 ? payment.payment_date : null;

        amountToAllocate = roundCurrency(amountToAllocate - allocation);
      }

      if (amountToAllocate > 0) {
        throw new AppError(
          "Payment amount cannot exceed the remaining outstanding balance",
          HTTP_STATUS.UNPROCESSABLE_ENTITY
        );
      }

      totalPaid = roundCurrency(totalPaid + Number(payment.amount || 0));
      await paymentRepository.update(
        payment.id,
        {
          schedule_id: targetedScheduleId,
          principal_applied: principalApplied,
          interest_applied: interestApplied,
          penalty_applied: penaltyApplied,
        },
        connection
      );
    }

    for (const schedule of workingSchedules) {
      await loanScheduleRepository.update(
        schedule.id,
        {
          amount_paid: schedule.amount_paid,
          remaining_due: schedule.remaining_due,
          status: schedule.status,
          paid_at: schedule.paid_at,
        },
        connection
      );
    }

    const loan = await loanRepository.findByIdForUpdate(loanId, connection);
    if (!loan) {
      throw new AppError("Loan not found", HTTP_STATUS.NOT_FOUND);
    }

    const nextRemainingBalance = roundCurrency(Math.max(0, Number(loan.total_repayable || 0) - totalPaid));
    await loanRepository.update(
      loanId,
      {
        amount_paid: totalPaid,
        remaining_balance: nextRemainingBalance,
      },
      connection
    );
  },

  async update(id, payload, connection) {
    try {
      const payment = await paymentRepository.findByIdForUpdate(id, connection);
      if (!payment) {
        throw new AppError("Payment not found", HTTP_STATUS.NOT_FOUND);
      }

      const loan = await loanRepository.findByIdForUpdate(payment.loan_id, connection);
      if (!loan) {
        throw new AppError("Loan not found", HTTP_STATUS.NOT_FOUND);
      }

      const normalizedPayload = normalizePaymentUpdatePayload(payload);
      if (Object.keys(normalizedPayload).length === 0) {
        throw new AppError("No valid payment fields were provided for update", HTTP_STATUS.BAD_REQUEST);
      }

      const fields = {};
      let nextAmount = roundCurrency(payment.amount);

      if (normalizedPayload.amount !== undefined) {
        nextAmount = roundCurrency(normalizedPayload.amount);
        if (!Number.isFinite(nextAmount) || nextAmount <= 0) {
          throw new AppError("Payment amount must be a positive number", HTTP_STATUS.BAD_REQUEST);
        }
        fields.amount = nextAmount;
      }

      if (normalizedPayload.payment_date !== undefined) {
        if (!isValidDateInput(normalizedPayload.payment_date)) {
          throw new AppError("Payment date must be a valid date", HTTP_STATUS.BAD_REQUEST);
        }
        fields.payment_date = normalizedPayload.payment_date;
      }

      if (normalizedPayload.payment_method !== undefined) {
        fields.payment_method = normalizePaymentMethod(normalizedPayload.payment_method);
      }

      if (normalizedPayload.reference_number !== undefined) {
        const reference = String(normalizedPayload.reference_number || "").trim();
        fields.reference_number = reference.length > 0 ? reference : null;
      }

      if (normalizedPayload.notes !== undefined) {
        const notes = String(normalizedPayload.notes || "").trim();
        fields.notes = notes.length > 0 ? notes : null;
      }

      const projectedAmountPaid = roundCurrency(
        Number(loan.amount_paid || 0) - roundCurrency(payment.amount) + nextAmount
      );
      if (projectedAmountPaid > roundCurrency(loan.total_repayable)) {
        throw new AppError(
          "Payment amount cannot exceed the remaining outstanding balance",
          HTTP_STATUS.UNPROCESSABLE_ENTITY
        );
      }

      await paymentRepository.update(id, fields, connection);

      const requiresReallocation =
        normalizedPayload.amount !== undefined || normalizedPayload.payment_date !== undefined;

      if (requiresReallocation) {
        await this.recalculateLoanFromPayments(loan.id, connection);
      }

      const updatedPayment = await paymentRepository.findById(id, connection);
      const updatedLoan = await loanService.getById(loan.id, connection);

      return {
        payment: updatedPayment,
        loan: updatedLoan,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      console.error("[paymentService.update] Database error:", error);
      throw new AppError("Unable to update payment at this time", HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }
  },
};
