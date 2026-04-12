import { AUDIT_ACTIONS } from "../constants/appConstants.js";
import { auditRepository } from "../repositories/auditRepository.js";

export const auditService = {
  async log({
    action,
    entityType,
    entityId,
    actorAdminId,
    description,
    oldValues,
    newValues,
    ipAddress,
    userAgent,
    connection,
  }) {
    await auditRepository.create(
      {
        admin_user_id: actorAdminId,
        action_type: action,
        entity_type: entityType,
        entity_id: entityId,
        description: description || `${action} on ${entityType}`,
        old_values: oldValues || null,
        new_values: newValues || null,
        ip_address: ipAddress,
        user_agent: userAgent || null,
      },
      connection
    );
  },

  actions: AUDIT_ACTIONS,
};
