import { HTTP_STATUS } from "../constants/appConstants.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { clientService } from "../services/clientService.js";
import { auditService } from "../services/auditService.js";

export const getClients = asyncHandler(async (req, res) => {
  const data = await clientService.list(req.query);
  return sendSuccess(res, HTTP_STATUS.OK, "Clients fetched successfully", data);
});

export const getClientById = asyncHandler(async (req, res) => {
  const data = await clientService.getById(req.params.id);
  return sendSuccess(res, HTTP_STATUS.OK, "Client fetched successfully", data);
});

export const getClientLoans = asyncHandler(async (req, res) => {
  const data = await clientService.getLoans(req.params.id);
  return sendSuccess(res, HTTP_STATUS.OK, "Client loans fetched successfully", data);
});

export const createClient = asyncHandler(async (req, res) => {
  const data = await clientService.create(req.body);
  await auditService.log({
    action: auditService.actions.CLIENT_CREATED,
    entityType: "client",
    entityId: data.id,
    actorAdminId: req.auth?.sub,
    description: `Client ${data.name} was created`,
    newValues: { name: data.name, phone: data.phone },
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return sendSuccess(res, HTTP_STATUS.CREATED, "Client created successfully", data);
});

export const updateClient = asyncHandler(async (req, res) => {
  const data = await clientService.update(req.params.id, req.body);
  await auditService.log({
    action: auditService.actions.CLIENT_UPDATED,
    entityType: "client",
    entityId: req.params.id,
    actorAdminId: req.auth?.sub,
    description: `Client ${req.params.id} was updated`,
    newValues: req.body,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return sendSuccess(res, HTTP_STATUS.OK, "Client updated successfully", data);
});

export const deleteClient = asyncHandler(async (req, res) => {
  await clientService.remove(req.params.id);
  await auditService.log({
    action: auditService.actions.CLIENT_DELETED,
    entityType: "client",
    entityId: req.params.id,
    actorAdminId: req.auth?.sub,
    description: `Client ${req.params.id} was deleted`,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });
  return sendSuccess(res, HTTP_STATUS.OK, "Client deleted successfully");
});
