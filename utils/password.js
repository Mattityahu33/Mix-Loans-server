import crypto from "crypto";

const HASH_ALGORITHM = "scrypt";
const KEY_LENGTH = 64;

export const hashPassword = async (password) => {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey.toString("hex"));
    });
  });

  return `${HASH_ALGORITHM}:${salt}:${hash}`;
};

export const comparePassword = async (password, storedHash) => {
  const [algorithm, salt, hash] = String(storedHash || "").split(":");
  if (algorithm !== HASH_ALGORITHM || !salt || !hash) {
    return false;
  }

  const derived = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derivedKey.toString("hex"));
    });
  });

  const incoming = Buffer.from(derived, "hex");
  const current = Buffer.from(hash, "hex");
  if (incoming.length !== current.length) {
    return false;
  }

  return crypto.timingSafeEqual(incoming, current);
};
