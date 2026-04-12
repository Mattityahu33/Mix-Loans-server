import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { loanService } from "../services/loanService.js";
import { auditService } from "../services/auditService.js";
import { withTransaction } from "../db/pool.js";

export const getLoans = asyncHandler(async (req, res) => {
  const data = await loanService.list(req.query);
  return sendSuccess(res, HTTP_STATUS.OK, "Loans fetched successfully", data);
});

export const getLoanById = asyncHandler(async (req, res) => {
  const data = await loanService.getById(req.params.id);
  return sendSuccess(res, HTTP_STATUS.OK, "Loan fetched successfully", data);
});

export const getOverdueLoans = asyncHandler(async (req, res) => {
  const data = await loanService.listOverdue();
  return sendSuccess(res, HTTP_STATUS.OK, "Overdue loans fetched successfully", data);
});

export const quoteLoan = asyncHandler(async (req, res) => {
  const data = await loanService.quote(req.body);
  return sendSuccess(res, HTTP_STATUS.OK, "Loan quote generated successfully", data);
});

export const createLoan = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (connection) => {
    const created = await loanService.create({ ...req.body, actor_admin_id: req.auth?.sub }, connection);
    await auditService.log({
      action: auditService.actions.LOAN_CREATED,
      entityType: "loan",
      entityId: created.id,
      actorAdminId: req.auth?.sub,
      description: `Loan ${created.loan_code || created.id} was created`,
      newValues: {
        clientId: created.client_id,
        amount: created.amount,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      connection,
    });
    return created;
  });

  return sendSuccess(res, HTTP_STATUS.CREATED, "Loan created successfully", data);
});

export const updateLoan = asyncHandler(async (req, res) => {
  console.info(
    `[loanController.updateLoan] loan=${req.params.id} body_keys=${Object.keys(req.body || {}).join(",")}`
  );
  const data = await withTransaction(async (connection) => {
    const updated = await loanService.update(req.params.id, req.body, connection);
    await auditService.log({
      action: auditService.actions.LOAN_UPDATED,
      entityType: "loan",
      entityId: req.params.id,
      actorAdminId: req.auth?.sub,
      description: `Loan ${req.params.id} was updated`,
      newValues: req.body,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      connection,
    });
    return updated;
  });

  return sendSuccess(res, HTTP_STATUS.OK, "Loan updated successfully", data);
});

export const deleteLoan = asyncHandler(async (req, res) => {
  await withTransaction(async (connection) => {
    await loanService.remove(req.params.id, connection);
  });
  return sendSuccess(res, HTTP_STATUS.OK, "Loan deleted successfully");
});
