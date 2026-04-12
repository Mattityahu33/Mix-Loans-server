export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
};

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
};

export const NOTIFICATION_TYPES = {
  DUE_SOON: "due_soon",
  OVERDUE: "overdue",
  DEFAULTED: "system",
  PAYMENT_RECORDED: "payment_received",
  PAYMENT_COMPLETED: "loan_completed",
  LOAN_CREATED: "loan_created",
  SYSTEM: "system",
};

export const AUDIT_ACTIONS = {
  LOGIN_SUCCESS: "login_success",
  LOGIN_FAILED: "login_failed",
  CLIENT_CREATED: "client_created",
  CLIENT_UPDATED: "client_updated",
  CLIENT_DELETED: "client_deleted",
  LOAN_CREATED: "loan_created",
  LOAN_UPDATED: "loan_updated",
  LOAN_STATUS_SYNCED: "loan_status_synced",
  PAYMENT_RECORDED: "payment_recorded",
  COLLATERAL_CREATED: "collateral_created",
  COLLATERAL_UPDATED: "collateral_updated",
  COLLATERAL_DELETED: "collateral_deleted",
  SETTINGS_UPDATED: "settings_updated",
};

export const SETTINGS_ROW_ID = 1;
