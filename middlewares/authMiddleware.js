import { HTTP_STATUS } from "../constants/appConstants.js";
import { AppError } from "../utils/appError.js";
import { verifyJwt } from "../utils/jwt.js";

export const requireAuth = (req, res, next) => {
  const authorization = req.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    next(new AppError("Authentication required", HTTP_STATUS.UNAUTHORIZED));
    return;
  }

  try {
    const payload = verifyJwt(token, process.env.JWT_SECRET || "mix-loans-dev-secret");
    req.auth = payload;
    next();
  } catch (error) {
    next(error);
  }
};
