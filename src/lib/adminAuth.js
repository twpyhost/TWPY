import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const ADMIN_SESSION_COOKIE = "twpy_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

function getAdminConfig() {
  return {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    secret: process.env.ADMIN_SESSION_SECRET,
  };
}

function sign(value, secret) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function createSessionValue(email, secret) {
  const expiresAt = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = Buffer.from(JSON.stringify({ email, expiresAt })).toString(
    "base64url",
  );
  const signature = sign(payload, secret);

  return `${payload}.${signature}`;
}

function readSessionValue(value, secret) {
  const [payload, signature] = value?.split(".") || [];
  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload, secret);
  if (!safeCompare(signature, expectedSignature)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      !session?.email ||
      !session?.expiresAt ||
      session.expiresAt < Date.now()
    ) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export function adminAuthIsConfigured() {
  const { email, password, secret } = getAdminConfig();
  return Boolean(email && password && secret);
}

export async function authenticateAdmin(email, password) {
  const config = getAdminConfig();
  if (!adminAuthIsConfigured()) {
    return { ok: false, error: "Admin auth is not configured" };
  }

  const validEmail = safeCompare(email, config.email);
  const validPassword = safeCompare(password, config.password);

  if (!validEmail || !validPassword) {
    return { ok: false, error: "Credenciales invalidas" };
  }

  const cookieStore = await cookies();
  cookieStore.set(
    ADMIN_SESSION_COOKIE,
    createSessionValue(config.email, config.secret),
    {
      httpOnly: true,
      maxAge: SESSION_MAX_AGE,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  );

  return { ok: true, user: { email: config.email } };
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export async function getAdminUser() {
  const config = getAdminConfig();
  if (!adminAuthIsConfigured()) {
    return {
      user: null,
      isAdmin: false,
      error: new Error("Admin auth is not configured"),
    };
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(ADMIN_SESSION_COOKIE);
  const session = readSessionValue(cookie?.value, config.secret);

  if (!session || session.email !== config.email) {
    return { user: null, isAdmin: false, error: null };
  }

  return { user: { email: session.email }, isAdmin: true, error: null };
}
