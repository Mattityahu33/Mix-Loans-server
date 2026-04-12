import { HTTP_STATUS } from "../constants/appConstants.js";
import { AppError } from "../utils/appError.js";
import { adminRepository } from "../repositories/adminRepository.js";
import { comparePassword, hashPassword } from "../utils/password.js";
import { signJwt } from "../utils/jwt.js";
import { auditService } from "./auditService.js";

const tokenExpiresInSeconds = Number(process.env.JWT_EXPIRES_IN_SECONDS || 60 * 60 * 12);

export const authService = {
  async ensureDefaultAdmin(connection) {
    const email = process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      return null;
    }

    const existing = await adminRepository.findByEmail(email, connection);
    if (existing) {
      return existing;
    }

    const passwordHash = await hashPassword(password);
    await adminRepository.createAdmin(
      {
        email,
        password_hash: passwordHash,
        full_name: process.env.ADMIN_FULL_NAME || "System Administrator",
        role: "admin",
      },
      connection
    );
    return adminRepository.findByEmail(email, connection);
  },

  async login({ username, password, ipAddress }, connection) {
    const email = username;
    const admin = await adminRepository.findByEmail(email, connection);
    if (!admin || !admin.is_active) {
      throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
    }

    const matches = await comparePassword(password, admin.password_hash);
    if (!matches) {
      throw new AppError("Invalid email or password", HTTP_STATUS.UNAUTHORIZED);
    }

    await adminRepository.updateLastLogin(admin.id, connection);
    const token = signJwt(
      {
        sub: admin.id,
        username: admin.email,
        role: admin.role,
        full_name: admin.full_name,
      },
      process.env.JWT_SECRET || "mix-loans-dev-secret",
      tokenExpiresInSeconds
    );

    await auditService.log({
      action: auditService.actions.LOGIN_SUCCESS,
      entityType: "admin_user",
      entityId: admin.id,
      actorAdminId: admin.id,
      description: `Admin ${admin.email} signed in`,
      newValues: { email: admin.email },
      ipAddress,
      connection,
    });

    return {
      token,
      admin: {
        id: String(admin.id),
        username: admin.email,
        full_name: admin.full_name,
        role: admin.role,
      },
      expires_in: tokenExpiresInSeconds,
    };
  },
};
