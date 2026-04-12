import express from "express";
import { login } from "../controllers/authController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validateLogin } from "../validators/authValidators.js";

const router = express.Router();

router.post("/login", validateRequest(validateLogin), login);

export default router;
