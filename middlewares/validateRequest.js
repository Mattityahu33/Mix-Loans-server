import { HTTP_STATUS } from "../constants/appConstants.js";
import { AppError } from "../utils/appError.js";

export const validateRequest = (validator) => (req, res, next) => {
  const errors = validator(req);
  if (errors.length > 0) {
    next(new AppError("Validation failed", HTTP_STATUS.UNPROCESSABLE_ENTITY, errors));
    return;
  }
  next();
};
