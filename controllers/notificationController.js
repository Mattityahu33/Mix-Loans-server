import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notificationService } from "../services/notificationService.js";
import { AppError } from "../utils/appError.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.list(req.query);
  return sendSuccess(res, HTTP_STATUS.OK, "Notifications fetched successfully", data);
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const data = await notificationService.markAsRead(req.params.id);
  if (!data) {
    throw new AppError("Notification not found", HTTP_STATUS.NOT_FOUND);
  }
  return sendSuccess(res, HTTP_STATUS.OK, "Notification marked as read", data);
});

export const markAllNotificationsAsRead = asyncHandler(async (_req, res) => {
  const data = await notificationService.markAllAsRead();
  return sendSuccess(res, HTTP_STATUS.OK, "All notifications marked as read", data);
});
