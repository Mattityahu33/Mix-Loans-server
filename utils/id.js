import crypto from "crypto";

export const generatePrefixedId = (prefix) => {
  const token = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `${prefix}${token}`;
};
