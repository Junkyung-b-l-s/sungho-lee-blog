import crypto from "node:crypto";

export const STUDIO_COOKIE = "sungho_lee_studio_session";
const SESSION_AGE = 60 * 60 * 24 * 7;

export function studioIsConfigured() {
  return Boolean(
    process.env.STUDIO_PASSWORD &&
      process.env.STUDIO_SECRET &&
      Buffer.byteLength(process.env.STUDIO_SECRET) >= 32,
  );
}

function signature(value) {
  return crypto
    .createHmac("sha256", process.env.STUDIO_SECRET)
    .update(value)
    .digest("base64url");
}

export function createStudioSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_AGE;
  const payload = String(expiresAt);
  return `${payload}.${signature(payload)}`;
}

export function verifyStudioSession(token) {
  if (!studioIsConfigured() || !token) return false;

  const [payload, suppliedSignature] = token.split(".");
  if (!payload || !suppliedSignature || Number(payload) < Date.now() / 1000) {
    return false;
  }

  const expectedSignature = signature(payload);
  if (suppliedSignature.length !== expectedSignature.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(suppliedSignature),
    Buffer.from(expectedSignature),
  );
}

export function passwordMatches(candidate) {
  if (!studioIsConfigured() || typeof candidate !== "string") return false;

  const expected = Buffer.from(process.env.STUDIO_PASSWORD);
  const supplied = Buffer.from(candidate);
  return (
    supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected)
  );
}

export function studioCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_AGE,
  };
}
