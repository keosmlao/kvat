import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { masterPrisma } from "./master-prisma";

// Management portal session — completely separate from tenant user sessions.
// Different cookie name so a single browser can hold both sessions at once
// (useful for /manage operator who also owns a tenant account).

const SESSION_COOKIE = "smlao_mgmt";
const SESSION_DAYS = 7;

const secretKey =
  process.env.SESSION_SECRET ?? "smlao-dev-secret-change-me-please-please";
const encodedKey = new TextEncoder().encode(secretKey);

export type ManagementSession = {
  managementUserId: string;
  email: string;
  name: string;
};

async function encrypt(payload: ManagementSession): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(encodedKey);
}

async function decrypt(token: string | undefined): Promise<ManagementSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as ManagementSession;
  } catch {
    return null;
  }
}

export async function createManagementSession(payload: ManagementSession) {
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

export async function destroyManagementSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getManagementSession(): Promise<ManagementSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decrypt(token);
}

export async function requireManagement(): Promise<ManagementSession> {
  const session = await getManagementSession();
  if (!session) redirect("/manage/login");
  return session;
}

export async function authenticateManagement(email: string, password: string) {
  const bcrypt = await import("bcryptjs");
  const user = await masterPrisma.managementUser.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return null;
  return user;
}
