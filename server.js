import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import loanRoutes from "./routes/loanRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import collateralRoutes from "./routes/collateralRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import { requireAuth } from "./middlewares/authMiddleware.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorMiddleware.js";
import { sendSuccess } from "./utils/apiResponse.js";
import { HTTP_STATUS } from "./constants/appConstants.js";
import { settingsService } from "./services/settingsService.js";
import { authService } from "./services/authService.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", async (req, res, next) => {
  try {
    await settingsService.getCurrent();
    await authService.ensureDefaultAdmin();
    return sendSuccess(res, HTTP_STATUS.OK, "Mix Loans API is running", {
      status: "ok",
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/auth", authRoutes);

app.use("/api/clients", requireAuth, clientRoutes);
app.use("/api/loans", requireAuth, loanRoutes);
app.use("/api/collateral", requireAuth, collateralRoutes);
app.use("/api/payments", requireAuth, paymentRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);
app.use("/api/notifications", requireAuth, notificationRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);

const startServer = async () => {
  await settingsService.getCurrent();
  await authService.ensureDefaultAdmin();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
