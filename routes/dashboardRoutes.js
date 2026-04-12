import express from "express";
import {
  getDashboardStats,
  getAlertLoans,
  getReportSummary,
} from "../controllers/dashboardController.js";

const router = express.Router();

router.get("/stats", getDashboardStats);
router.get("/alerts", getAlertLoans);
router.get("/reports", getReportSummary);

export default router;
