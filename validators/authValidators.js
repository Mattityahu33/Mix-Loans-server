import { requireField } from "./commonValidators.js";

export const validateLogin = (req) => {
  const errors = [];
  requireField(req.body.username || req.body.email, "email", errors);
  requireField(req.body.password, "password", errors);
  return errors;
};
