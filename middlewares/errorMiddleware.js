import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendError } from "../utils/apiResponse.js";

export const notFoundHandler = (req, res) => {
  return sendError(
    res,
    HTTP_STATUS.NOT_FOUND,
    `Route ${req.method} ${req.originalUrl} not found`
  );
};

export const errorHandler = (error, req, res, next) => {
  const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  const message = error.message || "Internal server error";

  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    console.error("Unhandled error:", error);
  }

  return sendError(res, statusCode, message, error.errors || null);
};
