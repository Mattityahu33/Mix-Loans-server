import {
  requireField,
  requirePositiveNumber,
  requireInteger,
  requireOneOf,
} from "./commonValidators.js";
import {
  INTEREST_FREQUENCY,
  REPAYMENT_STRUCTURE,
} from "../constants/loanConstants.js";

export const validateLoanQuote = (req) => {
  const errors = [];
  requirePositiveNumber(req.body.amount, "amount", errors);
  requirePositiveNumber(req.body.interest_rate, "interest_rate", errors);
  requireField(req.body.interest_type, "interest_type", errors);
  requireOneOf(req.body.interest_type, "interest_type", Object.values(INTEREST_FREQUENCY), errors);
  requireInteger(req.body.duration, "duration", errors);
  requireInteger(req.body.grace_period, "grace_period", errors);
  requireField(req.body.repayment_structure, "repayment_structure", errors);
  requireOneOf(
    req.body.repayment_structure,
    "repayment_structure",
    Object.values(REPAYMENT_STRUCTURE),
    errors
  );
  return errors;
};

export const validateCreateLoan = (req) => {
  const errors = validateLoanQuote(req);
  requireField(req.body.client_id, "client_id", errors);
  return errors;
};

export const validateUpdateLoan = (req) => {
  const body = req.body || {};
  const keys = Object.keys(body);
  if (keys.length === 0) {
    return [{ field: "body", message: "At least one field is required" }];
  }

  const allowedFields = new Set([
    "amount",
    "interest_rate",
    "interestRate",
    "interest_type",
    "interestType",
    "repayment_structure",
    "repaymentStructure",
    "duration",
    "grace_period",
    "gracePeriod",
    "notes",
    "status",
    "collateral_description",
    "collateralDescription",
    "collateral_value",
    "collateralValue",
  ]);

  const hasSupportedField = keys.some((key) => allowedFields.has(key));
  if (!hasSupportedField) {
    return [
      {
        field: "body",
        message: `No supported fields were provided. Supported fields: ${Array.from(allowedFields).join(", ")}`,
      },
    ];
  }

  return [];
};
