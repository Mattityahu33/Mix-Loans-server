import {
  requireField,
  requirePositiveNumber,
} from "./commonValidators.js";

export const validateCreatePayment = (req) => {
  const errors = [];
  requireField(req.body.loan_id, "loan_id", errors);
  requirePositiveNumber(req.body.amount, "amount", errors);
  requireField(req.body.payment_date, "payment_date", errors);
  return errors;
};

export const validateUpdatePayment = (req) => {
  const errors = [];
  const allowedFields = [
    "amount",
    "payment_date",
    "payment_method",
    "reference_number",
    "notes",
    "paymentDate",
    "paymentMethod",
    "referenceNumber",
  ];

  const hasAnyUpdatableField = allowedFields.some((field) =>
    Object.prototype.hasOwnProperty.call(req.body || {}, field)
  );

  if (!hasAnyUpdatableField) {
    errors.push({
      field: "body",
      message: "Provide at least one payment field to update",
    });
  }

  return errors;
};
