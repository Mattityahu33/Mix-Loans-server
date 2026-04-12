export const LOAN_STATUS = {
  ACTIVE: "Active",
  DUE_SOON: "Due Soon",
  OVERDUE: "Overdue",
  COMPLETED: "Completed",
  DEFAULTED: "Defaulted",
};

export const INTEREST_FREQUENCY = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
};

export const REPAYMENT_STRUCTURE = {
  FLAT: "flat",
  REDUCING: "reducing",
};

export const COLLATERAL_STATUS = {
  HELD: "Held",
  RETURNED: "Returned",
  FORFEITED: "Forfeited",
  SOLD: "Sold",
};

export const RISK_LEVEL = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

export const OPEN_LOAN_STATUSES = [
  LOAN_STATUS.ACTIVE,
  LOAN_STATUS.DUE_SOON,
  LOAN_STATUS.OVERDUE,
];
