import express from "express";
import {
  getLoans,
  getLoanById,
  getOverdueLoans,
  quoteLoan,
  createLoan,
  updateLoan,
  deleteLoan,
} from "../controllers/loanController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validateCreateLoan, validateLoanQuote, validateUpdateLoan } from "../validators/loanValidators.js";

const router = express.Router();

router.get("/", getLoans);
router.get("/overdue", getOverdueLoans);
router.get("/:id", getLoanById);
router.post("/quote", validateRequest(validateLoanQuote), quoteLoan);
router.post("/", validateRequest(validateCreateLoan), createLoan);
router.put("/:id", validateRequest(validateUpdateLoan), updateLoan);
router.delete("/:id", deleteLoan);

export default router;
