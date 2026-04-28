import express from "express";
import {
  getPayments,
  getPaymentsByLoan,
  getPaymentById,
  createPayment,
  updatePayment,
} from "../controllers/paymentController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validateCreatePayment, validateUpdatePayment } from "../validators/paymentValidators.js";

const router = express.Router();

router.get("/", getPayments);
router.get("/loan/:loanId", getPaymentsByLoan);
router.get("/:id", getPaymentById);
router.post("/", validateRequest(validateCreatePayment), createPayment);
router.put("/:id", validateRequest(validateUpdatePayment), updatePayment);
router.patch("/:id", validateRequest(validateUpdatePayment), updatePayment);

export default router;
