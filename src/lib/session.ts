import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { masterPrisma } from "./master-prisma";
import { getTenantPrisma } from "./tenant-prisma";
import { TenantStatus } from "@/generated/master/client";

// In-process throttle for lastSeenAt writes. Without this every protected
// page request would hit the tenant DB just to bump a timestamp.
const LAST_SEEN_THROTTLE_MS = 60_000;
const lastSeenCache = new Map<string, number>();

async function touchLastSeen(dbName: string, userId: string): Promise<void> {
  const key = `${dbName}:${userId}`;
  const now = Date.now();
  const prev = lastSeenCache.get(key);
  if (prev && now - prev < LAST_SEEN_THROTTLE_MS) return;
  lastSeenCache.set(key, now);
  try {
    const tenantDb = getTenantPrisma(dbName);
    await tenantDb.user.update({
      where: { id: userId },
      data: { lastSeenAt: new Date(now) },
    });
  } catch {
    // Non-critical — drop the cache entry so the next request retries.
    lastSeenCache.delete(key);
  }
}

const SESSION_COOKIE = "smlao_session";
const SESSION_DAYS = 7;

const secretKey =
  process.env.SESSION_SECRET ?? "smlao-dev-secret-change-me-please-please";
const encodedKey = new TextEncoder().encode(secretKey);

export type SessionPayload = {
  userId: string;
  role: "ADMIN" | "STAFF";
  name: string;
  email: string;
  // Tenant context — populated since multi-tenant migration. Routes that need
  // the right database read session.dbName.
  tenantId: string;
  slug: string;
  dbName: string;
};

async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(encodedKey);
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(payload: SessionPayload) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const token = await encrypt(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = await decrypt(token);
  // Treat pre-multi-tenant sessions (missing tenantId) as logged out so old
  // cookies don't trigger redirect loops between /login and /dashboard.
  if (session && !session.tenantId) return null;
  return session;
}

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  // Fire-and-forget — don't block the page render on this write.
  void touchLastSeen(session.dbName, session.userId);
  return session;
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}

export type AuthResult =
  | {
      ok: true;
      user: { id: string; role: "ADMIN" | "STAFF"; name: string; email: string };
      tenant: { id: string; slug: string; dbName: string };
    }
  | { ok: false; reason: "no_tenant" | "suspended" | "invalid_credentials" };

export async function authenticate(
  email: string,
  password: string,
): Promise<AuthResult> {
  const normalized = email.toLowerCase();
  // Resolve tenant via TenantUserEmail mapping — allows staff users (not just
  // the owner) to log in. Falls back to Tenant.email for legacy rows that
  // pre-date the mapping table.
  const mapping = await masterPrisma.tenantUserEmail.findUnique({
    where: { email: normalized },
    include: { tenant: true },
  });
  const tenant =
    mapping?.tenant ??
    (await masterPrisma.tenant.findUnique({ where: { email: normalized } }));
  if (!tenant) return { ok: false, reason: "no_tenant" };

  // Auto-suspend if trial has expired and we never approved a paid plan.
  if (
    tenant.status === TenantStatus.TRIAL &&
    tenant.trialEndsAt.getTime() < Date.now()
  ) {
    await masterPrisma.tenant.update({
      where: { id: tenant.id },
      data: { status: TenantStatus.SUSPENDED },
    });
    return { ok: false, reason: "suspended" };
  }
  if (
    tenant.status === TenantStatus.SUSPENDED ||
    tenant.status === TenantStatus.CANCELLED
  ) {
    return { ok: false, reason: "suspended" };
  }

  const bcrypt = await import("bcryptjs");
  const tenantDb = getTenantPrisma(tenant.dbName);
  const user = await tenantDb.user.findUnique({ where: { email: normalized } });
  if (!user) return { ok: false, reason: "invalid_credentials" };
  const okPw = await bcrypt.compare(password, user.password);
  if (!okPw) return { ok: false, reason: "invalid_credentials" };
  return {
    ok: true,
    user: { id: user.id, role: user.role, name: user.name, email: user.email },
    tenant: { id: tenant.id, slug: tenant.slug, dbName: tenant.dbName },
  };
}
