import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authService } from "../services/authService.js";
import { pool } from "../db/pool.js";

export const login = asyncHandler(async (req, res) => {
  const data = await authService.login(
    {
      username: req.body.username || req.body.email,
      password: req.body.password,
      ipAddress: req.ip,
    },
    pool
  );

  return sendSuccess(res, HTTP_STATUS.OK, "Login successful", data);
});
