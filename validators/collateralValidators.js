import {
  requireField,
  requireOneOf,
} from "./commonValidators.js";
import { COLLATERAL_STATUS } from "../constants/loanConstants.js";

export const validateCreateCollateral = (req) => {
  const errors = [];
  requireField(req.body.loan_id, "loan_id", errors);
  requireField(req.body.description, "description", errors);
  if (req.body.collateral_status) {
    requireOneOf(
      req.body.collateral_status,
      "collateral_status",
      Object.values(COLLATERAL_STATUS),
      errors
    );
  }
  return errors;
};

export const validateUpdateCollateral = (req) => {
  return Object.keys(req.body || {}).length === 0
    ? [{ field: "body", message: "At least one field is required" }]
    : [];
};
