import "server-only";
import { randomInt } from "node:crypto";
import bcrypt from "bcryptjs";

/** How long a self-service "forgot password" temp password stays valid. */
export const RESET_PASSWORD_TTL_MINUTES = 20;

// Avoids visually-ambiguous characters (0/O, 1/l/I) so a temp password can be
// read out of an email and retyped without confusion.
const TEMP_PASSWORD_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

/** A random 12-character temp password, mixing letters and digits. */
export function generateTempPassword(): string {
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += TEMP_PASSWORD_CHARS[randomInt(TEMP_PASSWORD_CHARS.length)];
  }
  return result;
}

type PasswordBearingUser = {
  password_hash: string;
  reset_password_hash: string | null;
  reset_password_expires_at: Date | null;
};

/**
 * Checks a candidate password against a user's real password first, falling
 * back to their pending temp password (if any, and not expired) only when
 * the real one doesn't match. This is what makes "the old password keeps
 * working until the new one is actually set" fall out naturally: nothing
 * changes for a user who still knows their real password, since the primary
 * check succeeds immediately and the temp path is never even consulted.
 */
export async function verifyUserPassword(
  user: PasswordBearingUser,
  candidate: string,
): Promise<{ valid: boolean; usedTempPassword: boolean }> {
  if (await bcrypt.compare(candidate, user.password_hash)) {
    return { valid: true, usedTempPassword: false };
  }
  if (
    user.reset_password_hash &&
    user.reset_password_expires_at &&
    user.reset_password_expires_at > new Date()
  ) {
    if (await bcrypt.compare(candidate, user.reset_password_hash)) {
      return { valid: true, usedTempPassword: true };
    }
  }
  return { valid: false, usedTempPassword: false };
}
