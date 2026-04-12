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
