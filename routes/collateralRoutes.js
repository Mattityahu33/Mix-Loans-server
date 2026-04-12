import express from "express";
import {
  getCollaterals,
  getCollateralById,
  createCollateral,
  updateCollateral,
  deleteCollateral,
} from "../controllers/collateralController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validateCreateCollateral, validateUpdateCollateral } from "../validators/collateralValidators.js";

const router = express.Router();

router.get("/", getCollaterals);
router.get("/:id", getCollateralById);
router.post("/", validateRequest(validateCreateCollateral), createCollateral);
router.put("/:id", validateRequest(validateUpdateCollateral), updateCollateral);
router.delete("/:id", deleteCollateral);

export default router;
