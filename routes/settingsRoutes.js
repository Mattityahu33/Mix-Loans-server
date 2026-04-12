import express from "express";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validateUpdateSettings } from "../validators/settingsValidators.js";

const router = express.Router();

router.get("/", getSettings);
router.put("/", validateRequest(validateUpdateSettings), updateSettings);

export default router;
