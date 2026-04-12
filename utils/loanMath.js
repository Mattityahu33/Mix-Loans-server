import { addDays, addPeriods, diffInDays, toMysqlDate } from "./date.js";
import { LOAN_STATUS, REPAYMENT_STRUCTURE } from "../constants/loanConstants.js";

const roundCurrency = (value) => Number(Number(value).toFixed(2));

export const calculateLoanTerms = ({
  amount,
  interestRate,
  interestType,
  duration,
  gracePeriod,
  startDate,
  repaymentStructure,
}) => {
  const principal = Number(amount);
  const rate = Number(interestRate) / 100;
  const periods = Number(duration);
  const start = toMysqlDate(startDate || new Date());

  let totalRepayment = 0;
  let totalInterest = 0;
  let installmentAmount = 0;

  if (repaymentStructure === REPAYMENT_STRUCTURE.REDUCING) {
    if (rate === 0) {
      installmentAmount = principal / periods;
      totalRepayment = principal;
      totalInterest = 0;
    } else {
      installmentAmount = (principal * rate) / (1 - Math.pow(1 + rate, -periods));
      totalRepayment = installmentAmount * periods;
      totalInterest = totalRepayment - principal;
    }
  } else {
    totalInterest = principal * rate * periods;
    totalRepayment = principal + totalInterest;
    installmentAmount = totalRepayment / periods;
  }

  const dueDate = addPeriods(start, periods, interestType);
  const gracePeriodEndDate = addDays(dueDate, Number(gracePeriod));

  return {
    startDate: start,
    dueDate,
    gracePeriodEndDate,
    totalInterest: roundCurrency(totalInterest),
    totalRepayment: roundCurrency(totalRepayment),
    installmentAmount: roundCurrency(installmentAmount),
    remainingBalance: roundCurrency(totalRepayment),
  };
};

export const calculatePenaltyBalance = ({
  remainingBalance,
  dueDate,
  status,
  penaltyRatePerDay,
  now = new Date(),
}) => {
  if (Number(remainingBalance) <= 0) {
    return 0;
  }

  const currentStatus = status || LOAN_STATUS.ACTIVE;
  const daysOverdue = diffInDays(dueDate, now);
  if (daysOverdue <= 0 || currentStatus === LOAN_STATUS.COMPLETED) {
    return 0;
  }

  const penalty = Number(remainingBalance) * (Number(penaltyRatePerDay || 0) / 100) * daysOverdue;
  return roundCurrency(penalty);
};

export const resolveLoanStatus = ({
  remainingBalance,
  penaltyBalance,
  dueDate,
  gracePeriodEndDate,
  dueSoonThresholdDays,
  now = new Date(),
}) => {
  const totalOutstanding = Number(remainingBalance) + Number(penaltyBalance || 0);
  if (totalOutstanding <= 0) {
    return LOAN_STATUS.COMPLETED;
  }

  const daysUntilDue = diffInDays(now, dueDate);
  const daysPastDue = diffInDays(dueDate, now);
  const daysPastGrace = gracePeriodEndDate ? diffInDays(gracePeriodEndDate, now) : -1;

  if (daysPastGrace > 0) {
    return LOAN_STATUS.DEFAULTED;
  }
  if (daysPastDue > 0) {
    return LOAN_STATUS.OVERDUE;
  }
  if (daysUntilDue >= 0 && daysUntilDue <= Number(dueSoonThresholdDays || 7)) {
    return LOAN_STATUS.DUE_SOON;
  }
  return LOAN_STATUS.ACTIVE;
};
