import {
  scrypt,
  randomBytes,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

// Reine Passwort-Helfer auf Basis von Node crypto.scrypt.
// Bewusst ohne next/Imports, damit dies auch im Seed-Skript nutzbar ist.

// Eigener Promise-Wrapper, da promisify(scrypt) die Options-Überladung nicht typt.
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey as Buffer);
    });
  });
}

const KEYLEN = 64;
const SALT_BYTES = 16;
// scrypt-Kostenparameter (N muss eine Zweierpotenz sein).
const N = 16384;
const r = 8;
const p = 1;

/**
 * Erzeugt einen Hash im Format: scrypt$N$r$p$saltHex$hashHex
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r,
    p,
    maxmem: 64 * 1024 * 1024,
  })) as Buffer;
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${derived.toString(
    "hex",
  )}`;
}

/**
 * Prüft ein Klartext-Passwort gegen einen gespeicherten Hash.
 * Konstantzeit-Vergleich, fängt Fehler ab und gibt false zurück.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const parts = stored.split("$");
    if (parts.length !== 6 || parts[0] !== "scrypt") return false;
    const N = parseInt(parts[1], 10);
    const r = parseInt(parts[2], 10);
    const p = parseInt(parts[3], 10);
    const salt = Buffer.from(parts[4], "hex");
    const expected = Buffer.from(parts[5], "hex");
    const derived = (await scryptAsync(
      password.normalize("NFKC"),
      salt,
      expected.length,
      { N, r, p, maxmem: 64 * 1024 * 1024 },
    )) as Buffer;
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Kryptografisch sicheres Session-Token (URL-sicher). */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
