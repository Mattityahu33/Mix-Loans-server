import express from "express";
import {
  getClients,
  getClientById,
  getClientLoans,
  createClient,
  updateClient,
  deleteClient,
} from "../controllers/clientController.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { validateCreateClient, validateUpdateClient } from "../validators/clientValidators.js";

const router = express.Router();

router.get("/", getClients);
router.get("/:id", getClientById);
router.get("/:id/loans", getClientLoans);
router.post("/", validateRequest(validateCreateClient), createClient);
router.put("/:id", validateRequest(validateUpdateClient), updateClient);
router.delete("/:id", deleteClient);

export default router;
