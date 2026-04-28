import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { paymentService } from "../services/paymentService.js";
import { auditService } from "../services/auditService.js";
import { withTransaction } from "../db/pool.js";

export const getPayments = asyncHandler(async (req, res) => {
  const data = await paymentService.list(req.query);
  return sendSuccess(res, HTTP_STATUS.OK, "Payments fetched successfully", data);
});

export const getPaymentsByLoan = asyncHandler(async (req, res) => {
  const data = await paymentService.getByLoanId(req.params.loanId);
  return sendSuccess(res, HTTP_STATUS.OK, "Loan payments fetched successfully", data);
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const data = await paymentService.getById(req.params.id);
  return sendSuccess(res, HTTP_STATUS.OK, "Payment fetched successfully", data);
});

export const createPayment = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (connection) => {
    const result = await paymentService.create({ ...req.body, actor_admin_id: req.auth?.sub }, connection);
    await auditService.log({
      action: auditService.actions.PAYMENT_RECORDED,
      entityType: "payment",
      entityId: result.payment.id,
      actorAdminId: req.auth?.sub,
      description: `Payment ${result.payment.id} was recorded`,
      newValues: {
        loanId: result.loan.id,
        amount: result.payment.amount,
      },
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      connection,
    });
    return result;
  });

  return sendSuccess(res, HTTP_STATUS.CREATED, "Payment recorded successfully", data);
});

export const updatePayment = asyncHandler(async (req, res) => {
  const data = await withTransaction(async (connection) => {
    return paymentService.update(req.params.id, req.body, connection);
  });

  return sendSuccess(res, HTTP_STATUS.OK, "Payment updated successfully", data);
});
