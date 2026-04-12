import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notificationService } from "../services/notificationService.js";

export const getNotifications = asyncHandler(async (req, res) => {
  const data = await notificationService.list(req.query);
  return sendSuccess(res, HTTP_STATUS.OK, "Notifications fetched successfully", data);
});
