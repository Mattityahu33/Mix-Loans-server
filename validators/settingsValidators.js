export const validateUpdateSettings = (req) => {
  return Object.keys(req.body || {}).length === 0
    ? [{ field: "body", message: "At least one setting is required" }]
    : [];
};
