import { HTTP_STATUS } from "../constants/appConstants.js";
import { AppError } from "../utils/appError.js";
import { calculateLoanTerms } from "../utils/loanMath.js";
import { diffInDays, addDays, addPeriods } from "../utils/date.js";
import { loanRepository } from "../repositories/loanRepository.js";
import { clientRepository } from "../repositories/clientRepository.js";
import { settingsService } from "./settingsService.js";
import { notificationService } from "./notificationService.js";
import { loanScheduleRepository } from "../repositories/loanScheduleRepository.js";
import { collateralRepository } from "../repositories/collateralRepository.js";
import {
  dbCollateralStatusToUi,
  dbFrequencyToUiInterestType,
  dbInterestTypeToUiRepaymentStructure,
  dbLoanStatusToUi,
  uiInterestTypeToFrequency,
  uiLoanStatusToDb,
  uiRepaymentStructureToDbInterestType,
} from "../utils/schemaAdapters.js";

const roundCurrency = (value) => Number(Number(value || 0).toFixed(2));

const hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj || {}, key);

const readField = (payload, snakeCaseKey, camelCaseKey) => {
  if (hasOwn(payload, snakeCaseKey)) return payload[snakeCaseKey];
  if (camelCaseKey && hasOwn(payload, camelCaseKey)) return payload[camelCaseKey];
  return undefined;
};

const normalizeLoanUpdatePayload = (payload = {}) => {
  const normalized = {};
  const mappings = [
    ["amount", "amount"],
    ["interest_rate", "interestRate"],
    ["interest_type", "interestType"],
    ["repayment_structure", "repaymentStructure"],
    ["duration", "duration"],
    ["grace_period", "gracePeriod"],
    ["notes", "notes"],
    ["status", "status"],
    ["collateral_description", "collateralDescription"],
    ["collateral_value", "collateralValue"],
  ];

  mappings.forEach(([snakeCaseKey, camelCaseKey]) => {
    const value = readField(payload, snakeCaseKey, camelCaseKey);
    if (value !== undefined) {
      normalized[snakeCaseKey] = value;
    }
  });

  return normalized;
};

const formatLoanForUi = (loan) => {
  const amount = roundCurrency(loan.principal_amount);
  const totalRepayment = roundCurrency(loan.total_repayable);
  const remainingBalance = roundCurrency(loan.remaining_balance);
  const totalInterest = roundCurrency(loan.total_interest);
  const penaltyBalance = roundCurrency(loan.total_penalties);
  const progress = totalRepayment > 0 ? roundCurrency(((totalRepayment - remainingBalance) / totalRepayment) * 100) : 0;
  const daysUntilDue = Math.max(0, diffInDays(new Date(), loan.maturity_date));
  const daysOverdue = Math.max(0, diffInDays(loan.maturity_date, new Date()));

  return {
    ...loan,
    id: String(loan.id),
    loan_code: loan.loan_code,
    amount,
    interest_rate: Number(loan.interest_rate || 0),
    interest_type: dbFrequencyToUiInterestType(loan.repayment_frequency),
    repayment_structure: dbInterestTypeToUiRepaymentStructure(loan.interest_type),
    total_repayment: totalRepayment,
    total_interest: totalInterest,
    remaining_balance: remainingBalance,
    penalty_balance: penaltyBalance,
    installment_amount: loan.number_of_installments > 0 ? roundCurrency(totalRepayment / loan.number_of_installments) : totalRepayment,
    start_date: loan.start_date,
    due_date: loan.maturity_date,
    grace_period_end_date: addDays(loan.maturity_date, Number(loan.grace_period_days || 0)),
    duration: Number(loan.duration_value || 0),
    grace_period: Number(loan.grace_period_days || 0),
    status: dbLoanStatusToUi(loan.status),
    collateral_description: loan.collateral_description || null,
    collateral_value: roundCurrency(loan.collateral_value),
    collateral_status: loan.collateral_status ? dbCollateralStatusToUi(loan.collateral_status) : null,
    notes: loan.notes || "",
    total_outstanding: remainingBalance,
    progress,
    days_until_due: daysUntilDue,
    days_overdue: daysOverdue,
    client_name: loan.client_name,
  };
};

const determineDbStatus = (loan, settings) => {
  const remainingBalance = Number(loan.remaining_balance || 0);
  if (remainingBalance <= 0) return "completed";

  const now = new Date();
  const daysUntilDue = diffInDays(now, loan.maturity_date);
  const daysOverdue = diffInDays(loan.maturity_date, now);
  const graceDays = Number(loan.grace_period_days || 0);

  if (daysOverdue > graceDays) return "defaulted";
  if (daysOverdue > 0) return "overdue";
  if (daysUntilDue >= 0 && daysUntilDue <= Number(settings.due_soon_days || 7)) return "pending";
  return "active";
};

const buildSchedules = ({
  principalAmount,
  totalInterest,
  repaymentFrequency,
  durationValue,
  startDate,
  interestType,
}) => {
  const schedules = [];
  let balance = roundCurrency(principalAmount);
  const installmentCount = Number(durationValue);
  const installmentTotal = roundCurrency(principalAmount + totalInterest);
  const baseInstallment = installmentCount > 0 ? roundCurrency(installmentTotal / installmentCount) : installmentTotal;

  for (let index = 1; index <= installmentCount; index += 1) {
    const uiFrequency =
      repaymentFrequency === "weekly"
        ? "Weekly"
        : repaymentFrequency === "daily"
          ? "Daily"
          : repaymentFrequency === "biweekly"
            ? "Biweekly"
            : "Monthly";
    const dueDate = addPeriods(startDate, index, uiFrequency);
    let principalDue = 0;
    let interestDue = 0;

    if (interestType === "reducing_balance") {
      const periodicRate =
        principalAmount > 0 && installmentCount > 0
          ? Number(totalInterest) / Number(principalAmount) / installmentCount
          : 0;
      interestDue =
        index === installmentCount
          ? roundCurrency(Math.max(0, totalInterest - schedules.reduce((sum, row) => sum + row.interest_due, 0)))
          : roundCurrency(balance * periodicRate);
      principalDue = roundCurrency(baseInstallment - interestDue);
      if (principalDue < 0) {
        principalDue = 0;
      }
      if (index === installmentCount) {
        principalDue = balance;
      }
    } else {
      principalDue = roundCurrency(principalAmount / installmentCount);
      interestDue = roundCurrency(totalInterest / installmentCount);
      if (index === installmentCount) {
        principalDue = roundCurrency(balance);
      }
    }

    balance = roundCurrency(Math.max(0, balance - principalDue));
    const totalDue = roundCurrency(principalDue + interestDue);
    schedules.push({
      installment_number: index,
      due_date: dueDate,
      principal_due: principalDue,
      interest_due: interestDue,
      penalty_due: 0,
      total_due: totalDue,
      amount_paid: 0,
      remaining_due: totalDue,
      status: "pending",
      paid_at: null,
    });
  }

  return schedules;
};

export const loanService = {
  async quote(payload) {
    return calculateLoanTerms({
      amount: payload.amount,
      interestRate: payload.interest_rate,
      interestType: payload.interest_type,
      duration: payload.duration,
      gracePeriod: payload.grace_period,
      startDate: payload.start_date || new Date(),
      repaymentStructure: payload.repayment_structure,
    });
  },

  async synchronizeLoan(loan, connection) {
    const settings = await settingsService.getCurrent(connection);
    const nextStatus = determineDbStatus(loan, settings);
    if (loan.status !== nextStatus) {
      await loanRepository.update(loan.id, { status: nextStatus }, connection);
      const refreshed = await loanRepository.findById(loan.id, connection);
      await notificationService.notifyLoanStatus(refreshed, connection);
      return formatLoanForUi(refreshed);
    }

    await notificationService.notifyLoanStatus(loan, connection);
    return formatLoanForUi(loan);
  },

  async synchronizeAll(connection) {
    const loans = await loanRepository.list({}, connection);
    const results = [];
    for (const loan of loans) {
      results.push(await this.synchronizeLoan(loan, connection));
    }
    return results;
  },

  async list(filters) {
    const loans = await this.synchronizeAll();
    return loans.filter((loan) => {
      if (filters.search) {
        const term = String(filters.search).toLowerCase();
        const matches =
          String(loan.id).toLowerCase().includes(term) ||
          String(loan.loan_code || "").toLowerCase().includes(term) ||
          String(loan.client_name || "").toLowerCase().includes(term) ||
          String(loan.client_code || "").toLowerCase().includes(term);
        if (!matches) return false;
      }
      if (filters.status && loan.status !== filters.status) return false;
      if (filters.client_id && String(loan.client_id) !== String(filters.client_id)) return false;
      return true;
    });
  },

  async getById(id, connection) {
    const loan = await loanRepository.findById(id, connection);
    if (!loan) {
      throw new AppError("Loan not found", HTTP_STATUS.NOT_FOUND);
    }
    return this.synchronizeLoan(loan, connection);
  },

  async create(payload, connection) {
    const client = await clientRepository.findById(payload.client_id, connection);
    if (!client) {
      throw new AppError("Client not found", HTTP_STATUS.NOT_FOUND);
    }

    const settings = await settingsService.getCurrent(connection);
    const allowMultiple = Boolean(settings.allow_multiple_open_loans);
    if (!allowMultiple) {
      const openLoans = await loanRepository.countOpenLoansForClient(payload.client_id, connection);
      if (openLoans > 0) {
        throw new AppError("This client already has an open loan", HTTP_STATUS.CONFLICT);
      }
    }

    const terms = await this.quote(payload);
    const frequency = uiInterestTypeToFrequency(payload.interest_type);
    const interestType = uiRepaymentStructureToDbInterestType(payload.repayment_structure);
    const loanCode = payload.id || `LN-${Date.now()}`;
    const numberOfInstallments = Number(payload.duration);

    const loanId = await loanRepository.create(
      {
        loan_code: loanCode,
        client_id: Number(payload.client_id),
        principal_amount: Number(payload.amount),
        interest_rate: Number(payload.interest_rate),
        interest_type: interestType,
        repayment_frequency: frequency.repayment_frequency,
        duration_value: Number(payload.duration),
        duration_unit: frequency.duration_unit,
        number_of_installments: numberOfInstallments,
        start_date: terms.startDate,
        first_due_date: addPeriods(terms.startDate, 1, payload.interest_type),
        maturity_date: terms.dueDate,
        grace_period_days: Number(payload.grace_period),
        total_interest: terms.totalInterest,
        total_penalties: 0,
        total_repayable: terms.totalRepayment,
        amount_paid: 0,
        remaining_balance: terms.remainingBalance,
        status: uiLoanStatusToDb("Active"),
        disbursed_by: payload.actor_admin_id || null,
        approved_by: payload.actor_admin_id || null,
        notes: payload.notes || null,
      },
      connection
    );

    const schedules = buildSchedules({
      principalAmount: Number(payload.amount),
      totalInterest: terms.totalInterest,
      repaymentFrequency: frequency.repayment_frequency,
      durationValue: Number(payload.duration),
      startDate: terms.startDate,
      interestType,
    });
    await loanScheduleRepository.createMany(loanId, schedules, connection);

    if (payload.collateral_description || payload.collateral_value) {
      await collateralRepository.create(
        {
          loan_id: loanId,
          client_id: Number(payload.client_id),
          item_type: "General",
          description: payload.collateral_description || "Collateral",
          estimated_value: payload.collateral_value ? Number(payload.collateral_value) : 0,
          status: "held",
        },
        connection
      );
    }

    const created = await loanRepository.findById(loanId, connection);
    await notificationService.notifyLoanStatus(created, connection);
    return formatLoanForUi(created);
  },

  async update(id, payload, connection) {
    const current = await loanRepository.findById(id, connection);
    if (!current) throw new AppError("Loan not found", HTTP_STATUS.NOT_FOUND);
    const normalizedPayload = normalizeLoanUpdatePayload(payload);
    const normalizedKeys = Object.keys(normalizedPayload);

    if (normalizedKeys.length === 0) {
      throw new AppError("No valid loan fields were provided for update", HTTP_STATUS.BAD_REQUEST);
    }

    console.info(
      `[loanService.update] loan=${id} payload_keys=${normalizedKeys.join(",")}`
    );

    const fields = {};
    if (normalizedPayload.notes !== undefined) fields.notes = normalizedPayload.notes;
    if (normalizedPayload.status !== undefined) fields.status = uiLoanStatusToDb(normalizedPayload.status);

    const currentInterestTypeUi = dbFrequencyToUiInterestType(current.repayment_frequency);
    const currentRepaymentStructureUi = dbInterestTypeToUiRepaymentStructure(current.interest_type);
    const shouldRecalculate =
      (normalizedPayload.amount !== undefined &&
        Number(normalizedPayload.amount) !== Number(current.principal_amount)) ||
      (normalizedPayload.interest_rate !== undefined &&
        Number(normalizedPayload.interest_rate) !== Number(current.interest_rate)) ||
      (normalizedPayload.interest_type !== undefined &&
        String(normalizedPayload.interest_type) !== String(currentInterestTypeUi)) ||
      (normalizedPayload.duration !== undefined &&
        Number(normalizedPayload.duration) !== Number(current.duration_value)) ||
      (normalizedPayload.grace_period !== undefined &&
        Number(normalizedPayload.grace_period) !== Number(current.grace_period_days)) ||
      (normalizedPayload.repayment_structure !== undefined &&
        String(normalizedPayload.repayment_structure) !== String(currentRepaymentStructureUi));

    if (shouldRecalculate && Number(current.amount_paid || 0) > 0) {
      throw new AppError("Loans with recorded payments cannot be recalculated", HTTP_STATUS.CONFLICT);
    }

    if (shouldRecalculate) {
      const terms = await this.quote({
        amount: normalizedPayload.amount ?? current.principal_amount,
        interest_rate: normalizedPayload.interest_rate ?? current.interest_rate,
        interest_type: normalizedPayload.interest_type ?? currentInterestTypeUi,
        duration: normalizedPayload.duration ?? current.duration_value,
        grace_period: normalizedPayload.grace_period ?? current.grace_period_days,
        repayment_structure: normalizedPayload.repayment_structure ?? currentRepaymentStructureUi,
        start_date: current.start_date,
      });

      const frequency = uiInterestTypeToFrequency(normalizedPayload.interest_type ?? currentInterestTypeUi);
      const interestType = uiRepaymentStructureToDbInterestType(
        normalizedPayload.repayment_structure ?? currentRepaymentStructureUi
      );

      Object.assign(fields, {
        principal_amount: Number(normalizedPayload.amount ?? current.principal_amount),
        interest_rate: Number(normalizedPayload.interest_rate ?? current.interest_rate),
        interest_type: interestType,
        repayment_frequency: frequency.repayment_frequency,
        duration_value: Number(normalizedPayload.duration ?? current.duration_value),
        duration_unit: frequency.duration_unit,
        number_of_installments: Number(normalizedPayload.duration ?? current.duration_value),
        first_due_date: addPeriods(
          current.start_date,
          1,
          normalizedPayload.interest_type ?? currentInterestTypeUi
        ),
        maturity_date: terms.dueDate,
        grace_period_days: Number(normalizedPayload.grace_period ?? current.grace_period_days),
        total_interest: terms.totalInterest,
        total_penalties: 0,
        total_repayable: terms.totalRepayment,
        remaining_balance: terms.remainingBalance,
      });

      await loanScheduleRepository.removeByLoanId(id, connection);
      const schedules = buildSchedules({
        principalAmount: Number(normalizedPayload.amount ?? current.principal_amount),
        totalInterest: terms.totalInterest,
        repaymentFrequency: frequency.repayment_frequency,
        durationValue: Number(normalizedPayload.duration ?? current.duration_value),
        startDate: current.start_date,
        interestType,
      });
      await loanScheduleRepository.createMany(id, schedules, connection);
    }

    const collateralUpdateRequested =
      normalizedPayload.collateral_description !== undefined ||
      normalizedPayload.collateral_value !== undefined;

    if (!shouldRecalculate && Object.keys(fields).length === 0 && !collateralUpdateRequested) {
      throw new AppError("No updatable fields were provided", HTTP_STATUS.BAD_REQUEST);
    }

    if (Object.keys(fields).length > 0) {
      await loanRepository.update(id, fields, connection);
    }

    if (collateralUpdateRequested) {
      const { rows } = await connection.query(
        `SELECT id FROM collateral WHERE loan_id = $1 ORDER BY id ASC LIMIT 1`,
        [id]
      );
      const existingCollateralId = rows[0]?.id;
      const descriptionProvided = normalizedPayload.collateral_description !== undefined;
      const valueProvided = normalizedPayload.collateral_value !== undefined;

      if (existingCollateralId) {
        const collateralFields = {};
        if (descriptionProvided) {
          collateralFields.description = normalizedPayload.collateral_description || "Collateral";
        }
        if (valueProvided) {
          collateralFields.estimated_value = normalizedPayload.collateral_value
            ? Number(normalizedPayload.collateral_value)
            : 0;
        }
        if (Object.keys(collateralFields).length > 0) {
          await collateralRepository.update(existingCollateralId, collateralFields, connection);
        }
      } else {
        const hasMeaningfulCollateral =
          (descriptionProvided && String(normalizedPayload.collateral_description || "").trim().length > 0) ||
          (valueProvided && Number(normalizedPayload.collateral_value || 0) > 0);

        if (hasMeaningfulCollateral) {
          await collateralRepository.create(
            {
              loan_id: Number(id),
              client_id: Number(current.client_id),
              item_type: "General",
              description: normalizedPayload.collateral_description || "Collateral",
              estimated_value: normalizedPayload.collateral_value
                ? Number(normalizedPayload.collateral_value)
                : 0,
              status: "held",
            },
            connection
          );
        }
      }
    }

    console.info(
      `[loanService.update] loan=${id} recalculate=${shouldRecalculate} loan_fields=${Object.keys(fields).length} collateral_update=${collateralUpdateRequested}`
    );

    const updated = await loanRepository.findById(id, connection);
    return this.synchronizeLoan(updated, connection);
  },

  async remove(id, connection) {
    const removed = await loanRepository.remove(id, connection);
    if (!removed) throw new AppError("Loan not found", HTTP_STATUS.NOT_FOUND);
  },

  async listOverdue() {
    const loans = await this.list({});
    return loans.filter((loan) => loan.status === "Overdue" || loan.status === "Defaulted");
  },
};
