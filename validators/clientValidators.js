import {
  requireField,
  requireOneOf,
} from "./commonValidators.js";
import { RISK_LEVEL } from "../constants/loanConstants.js";

export const validateCreateClient = (req) => {
  const errors = [];
  requireField(req.body.name, "name", errors);
  requireField(req.body.phone, "phone", errors);
  if (req.body.risk_level) {
    requireOneOf(req.body.risk_level, "risk_level", Object.values(RISK_LEVEL), errors);
  }
  return errors;
};

export const validateUpdateClient = (req) => {
  return Object.keys(req.body || {}).length === 0
    ? [{ field: "body", message: "At least one field is required" }]
    : [];
};
