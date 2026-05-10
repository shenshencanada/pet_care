export const STAFF_SESSION_COOKIE = "pet_care_staff_session";
export const STAFF_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;
export const STAFF_SESSION_REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export type StaffSession = {
  staffId?: string;
  username: string;
  name: string;
  role?: "admin" | "staff";
  issuedAt: number;
  expiresAt: number;
};

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function encodeJson(value: unknown) {
  return bytesToBase64Url(encoder.encode(JSON.stringify(value)));
}

function decodeJson<T>(value: string): T | null {
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(value));
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

async function createSignature(payload: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return bytesToBase64Url(new Uint8Array(signature));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

export async function createStaffSession(
  staff: Pick<StaffSession, "staffId" | "username" | "name" | "role">,
  secret: string,
  maxAgeSeconds = STAFF_SESSION_MAX_AGE_SECONDS,
) {
  const now = Date.now();
  const session: StaffSession = {
    ...staff,
    issuedAt: now,
    expiresAt: now + maxAgeSeconds * 1000,
  };
  const payload = encodeJson(session);
  const signature = await createSignature(payload, secret);

  return `${payload}.${signature}`;
}

export async function verifyStaffSession(
  value: string | undefined,
  secret: string | undefined,
) {
  if (!value || !secret) {
    return null;
  }

  const [payload, signature] = value.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = await createSignature(payload, secret);

  if (!constantTimeEqual(signature, expectedSignature)) {
    return null;
  }

  const session = decodeJson<StaffSession>(payload);

  if (!session || session.expiresAt <= Date.now()) {
    return null;
  }

  return session;
}
