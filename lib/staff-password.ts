import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const PASSWORD_ALGORITHM = "pbkdf2_sha256";
const PASSWORD_ITERATIONS = 310_000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";
const PASSWORD_SALT_LENGTH = 16;

export function hashStaffPassword(password: string) {
  const salt = randomBytes(PASSWORD_SALT_LENGTH).toString("base64url");
  const key = pbkdf2Sync(
    password,
    salt,
    PASSWORD_ITERATIONS,
    PASSWORD_KEY_LENGTH,
    PASSWORD_DIGEST,
  ).toString("base64url");

  return `${PASSWORD_ALGORITHM}$${PASSWORD_ITERATIONS}$${salt}$${key}`;
}

export function verifyStaffPassword(password: string, storedHash: string) {
  const [algorithm, iterationsValue, salt, storedKey] = storedHash.split("$");
  const iterations = Number(iterationsValue);

  if (algorithm !== PASSWORD_ALGORITHM || !Number.isInteger(iterations) || !salt || !storedKey) {
    return false;
  }

  const candidateKey = pbkdf2Sync(
    password,
    salt,
    iterations,
    PASSWORD_KEY_LENGTH,
    PASSWORD_DIGEST,
  );
  const storedKeyBuffer = Buffer.from(storedKey, "base64url");

  if (candidateKey.length !== storedKeyBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateKey, storedKeyBuffer);
}
