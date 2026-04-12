import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { settingsService } from "../services/settingsService.js";
import { auditService } from "../services/auditService.js";
import { withTransaction } from "../db/pool.js";

export const getSettings = asyncHandler(async (req, res) => {
  const data = await settingsService.getCurrent();
  return sendSuccess(res, HTTP_STATUS.OK, "Settings fetched successfully", data);
});

export const updateSettings = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (connection) => {
    const updated = await settingsService.update(req.body, connection);
    await auditService.log({
      action: auditService.actions.SETTINGS_UPDATED,
      entityType: "settings",
      entityId: String(updated.id),
      actorAdminId: req.auth?.sub,
      description: "System settings were updated",
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      connection,
    });
    return updated;
  });
  return sendSuccess(res, HTTP_STATUS.OK, "Settings updated successfully", data);
});
