import express from "express";
import {
  getPayments,
  getPaymentsByLoan,
  getPaymentById,
  createPayment,
} from "../controllers/paymentController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validateCreatePayment } from "../validators/paymentValidators.js";

const router = express.Router();

router.get("/", getPayments);
router.get("/loan/:loanId", getPaymentsByLoan);
router.get("/:id", getPaymentById);
router.post("/", validateRequest(validateCreatePayment), createPayment);

export default router;
