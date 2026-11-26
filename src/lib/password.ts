import crypto from "node:crypto";

/* -------------------------------------------------------------------------- */
/*  Password hashing (scrypt, Node built-in — no native dependencies).        */
/*  Stored format:  scrypt$<salt-hex>$<derived-key-hex>                        */
/*  Passwords are never stored or logged in plain text.                        */
/* -------------------------------------------------------------------------- */

const KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEYLEN).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expectedHex] = parts;
  let expected: Buffer;
  try {
    expected = Buffer.from(expectedHex, "hex");
  } catch {
    return false;
  }
  const derived = crypto.scryptSync(password, salt, KEYLEN);
  return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
}

/** Dummy hash kept so failed logins for unknown emails cost the same as wrong passwords. */
export const DUMMY_HASH = hashPassword("vrap-dummy-password-for-timing");

export function isStrongEnough(password: string): boolean {
  return typeof password === "string" && password.length >= 6;
}
