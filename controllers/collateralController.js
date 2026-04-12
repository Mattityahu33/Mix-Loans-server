import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { collateralService } from "../services/collateralService.js";
import { auditService } from "../services/auditService.js";
import { withTransaction } from "../db/pool.js";

export const getCollaterals = asyncHandler(async (req, res) => {
  const data = await collateralService.list(req.query);
  return sendSuccess(res, HTTP_STATUS.OK, "Collateral fetched successfully", data);
});

export const getCollateralById = asyncHandler(async (req, res) => {
  const data = await collateralService.getById(req.params.id);
  return sendSuccess(res, HTTP_STATUS.OK, "Collateral fetched successfully", data);
});

export const createCollateral = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (connection) => {
    const created = await collateralService.create(req.body, connection);
    await auditService.log({
      action: auditService.actions.COLLATERAL_CREATED,
      entityType: "collateral",
      entityId: created.id,
      actorAdminId: req.auth?.sub,
      description: `Collateral ${created.id} was created for loan ${created.loan_id}`,
      newValues: { loanId: created.loan_id },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      connection,
    });
    return created;
  });
  return sendSuccess(res, HTTP_STATUS.CREATED, "Collateral created successfully", data);
});

export const updateCollateral = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (connection) => {
    const updated = await collateralService.update(req.params.id, req.body, connection);
    await auditService.log({
      action: auditService.actions.COLLATERAL_UPDATED,
      entityType: "collateral",
      entityId: req.params.id,
      actorAdminId: req.auth?.sub,
      description: `Collateral ${req.params.id} was updated`,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      connection,
    });
    return updated;
  });
  return sendSuccess(res, HTTP_STATUS.OK, "Collateral updated successfully", data);
});

export const deleteCollateral = asyncHandler(async (req, res) => {
  await withTransaction(async (connection) => {
    await collateralService.remove(req.params.id, connection);
    await auditService.log({
      action: auditService.actions.COLLATERAL_DELETED,
      entityType: "collateral",
      entityId: req.params.id,
      actorAdminId: req.auth?.sub,
      description: `Collateral ${req.params.id} was deleted`,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      connection,
    });
  });
  return sendSuccess(res, HTTP_STATUS.OK, "Collateral deleted successfully");
});
