export const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

export const requireField = (value, field, errors) => {
  if (isBlank(value)) {
    errors.push({ field, message: `${field} is required` });
  }
};

export const requirePositiveNumber = (value, field, errors) => {
  if (isBlank(value) || Number(value) <= 0 || Number.isNaN(Number(value))) {
    errors.push({ field, message: `${field} must be a positive number` });
  }
};

export const requireInteger = (value, field, errors) => {
  if (!Number.isInteger(Number(value)) || Number(value) < 0) {
    errors.push({ field, message: `${field} must be a valid whole number` });
  }
};

export const requireOneOf = (value, field, allowedValues, errors) => {
  if (!allowedValues.includes(value)) {
    errors.push({ field, message: `${field} must be one of: ${allowedValues.join(", ")}` });
  }
};
