export const formatFullName = (client) =>
  [client.first_name, client.last_name, client.other_names].filter(Boolean).join(" ").trim();

export const splitFullName = (fullName) => {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  const [firstName = "", lastName = "", ...rest] = parts;
  return {
    first_name: firstName,
    last_name: lastName || firstName,
    other_names: rest.length > 0 ? rest.join(" ") : null,
  };
};

export const dbRiskToUi = (value) => {
  const normalized = String(value || "medium").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const uiRiskToDb = (value) => String(value || "medium").toLowerCase();

export const dbLoanStatusToUi = (value) => {
  const map = {
    draft: "Draft",
    pending: "Due Soon",
    active: "Active",
    overdue: "Overdue",
    completed: "Completed",
    defaulted: "Defaulted",
    cancelled: "Cancelled",
  };
  return map[String(value || "active").toLowerCase()] || "Active";
};

export const uiLoanStatusToDb = (value) => {
  const normalized = String(value || "active").toLowerCase();
  const map = {
    "due soon": "pending",
    due_soon: "pending",
    active: "active",
    overdue: "overdue",
    completed: "completed",
    defaulted: "defaulted",
    cancelled: "cancelled",
    draft: "draft",
    pending: "pending",
  };
  return map[normalized] || normalized.replace(/\s+/g, "_");
};

export const uiRepaymentStructureToDbInterestType = (value) =>
  value === "reducing" ? "reducing_balance" : "flat";

export const dbInterestTypeToUiRepaymentStructure = (value) =>
  value === "reducing_balance" ? "reducing" : "flat";

export const uiInterestTypeToFrequency = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "weekly") {
    return { repayment_frequency: "weekly", duration_unit: "weeks" };
  }
  return { repayment_frequency: "monthly", duration_unit: "months" };
};

export const dbFrequencyToUiInterestType = (value) => {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "weekly") return "Weekly";
  if (normalized === "daily") return "Daily";
  if (normalized === "biweekly") return "Biweekly";
  return "Monthly";
};

export const dbCollateralStatusToUi = (value) => {
  const map = {
    held: "Held",
    released: "Released",
    auctioned: "Auctioned",
    returned: "Returned",
    damaged: "Damaged",
  };
  return map[String(value || "held").toLowerCase()] || "Held";
};

export const uiCollateralStatusToDb = (value) => {
  const normalized = String(value || "held").toLowerCase();
  const map = {
    held: "held",
    returned: "returned",
    forfeited: "auctioned",
    sold: "auctioned",
    released: "released",
    damaged: "damaged",
  };
  return map[normalized] || "held";
};

export const dbNotificationToUiStatus = (value) => (value ? "read" : "unread");

export const dbNotificationTypeToUiTitle = (type) =>
  String(type || "system")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
