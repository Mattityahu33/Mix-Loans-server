import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { dashboardService } from "../services/dashboardService.js";

export const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getStats();
  return sendSuccess(res, HTTP_STATUS.OK, "Dashboard stats fetched successfully", data);
});

export const getAlertLoans = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAlerts();
  return sendSuccess(res, HTTP_STATUS.OK, "Dashboard alerts fetched successfully", data);
});

export const getReportSummary = asyncHandler(async (req, res) => {
  const data = await dashboardService.getReportSummary();
  return sendSuccess(res, HTTP_STATUS.OK, "Report summary fetched successfully", data);
});
