"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { createSession } from "@/lib/session";
import { provisionTenant } from "@/lib/provision";
import { TenantPlan, TenantStatus } from "@/generated/master/client";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

const TRIAL_DAYS = 30;

const signupSchema = z.object({
  shopName: z.string().min(1, "ຕ້ອງມີຊື່ຮ້ານ"),
  ownerName: z.string().min(1, "ຕ້ອງມີຊື່ເຈົ້າຂອງ"),
  email: z.email("ຮູບແບບ email ບໍ່ຖືກຕ້ອງ"),
  password: z.string().min(8, "ລະຫັດຜ່ານ ≥ 8 ຕົວ"),
  phone: z.string().min(6, "ກະລຸນາໃສ່ເບີໂທ").max(32, "ເບີໂທຍາວເກີນໄປ"),
  taxId: z.string().optional(),
});

export type SignupState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "app",
  "login",
  "logout",
  "manage",
  "signup",
  "template",
  "t",
  "public",
  "static",
  "dashboard",
]);

// Slug derived from the email local part. Lao/non-ASCII chars in shopName are
// unreliable, so email is the source of truth — it's already validated and
// guaranteed to contain ASCII.
function slugFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  if (cleaned.length >= 3) return cleaned;
  // Email local part collapsed to nothing (e.g. "+++@x.la"). Fall back to a
  // generic prefix + random suffix.
  const rand = Math.random().toString(36).slice(2, 6);
  return `tenant-${rand}`;
}

async function pickAvailableSlug(base: string): Promise<string> {
  // Append -2, -3, … until we find a free slug. Caps at -99 to avoid pathological
  // loops; if we hit that, fall through to a random suffix.
  for (let i = 0; i < 100; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    if (RESERVED_SLUGS.has(candidate)) continue;
    const existing = await masterPrisma.tenant.findUnique({
      where: { slug: candidate },
    });
    if (!existing) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  // Cheap throttle: 5 signups per IP per hour. Catches spam without affecting
  // legit single-user flows. Replace with Redis-backed limiter for multi-instance.
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  const rl = rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000);
  if (!rl.ok) {
    const minutes = Math.ceil(rl.retryAfterMs / 60000);
    return {
      error: `ສະໝັກຫຼາຍເກີນໄປ — ກະລຸນາລໍຖ້າ ${minutes} ນາທີ`,
    };
  }

  const parsed = signupSchema.safeParse({
    shopName: String(formData.get("shopName") ?? "").trim(),
    ownerName: String(formData.get("ownerName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    phone: String(formData.get("phone") ?? "").trim(),
    taxId: String(formData.get("taxId") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return {
      error: "ກວດຂໍ້ມູນ",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const v = parsed.data;

  // Email uniqueness — check before slug allocation so we don't burn slugs
  // when the user already has an account.
  const byEmail = await masterPrisma.tenant.findUnique({
    where: { email: v.email },
  });
  if (byEmail) return { error: `email "${v.email}" ມີບັນຊີຢູ່ແລ້ວ` };

  // Auto-allocate slug + dbName from email. Falls back to "tenant-<rand>"
  // when the local part is unusable.
  const base = slugFromEmail(v.email);
  const slug = await pickAvailableSlug(base);
  const dbName = `kvat_${slug.replace(/-/g, "_")}`;

  // Provision physical DB first. If this fails, we never write to master.
  const provision = await provisionTenant(dbName, {
    shopName: v.shopName,
    ownerEmail: v.email,
    ownerName: v.ownerName,
    ownerPassword: v.password,
    taxId: v.taxId,
    phone: v.phone,
  });
  if (!provision.ok) {
    return {
      error: `ບໍ່ສາມາດ provision DB: ${provision.error}`,
    };
  }

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  let tenant;
  try {
    // Re-hash password for master row separately so master never holds tenant
    // user passwords. The tenant DB has its own hashed copy.
    const bcrypt = await import("bcryptjs");
    const masterPassword = await bcrypt.hash(v.password, 10);
    tenant = await masterPrisma.tenant.create({
      data: {
        slug,
        name: v.shopName,
        email: v.email,
        password: masterPassword,
        ownerName: v.ownerName,
        phone: v.phone,
        dbName,
        plan: TenantPlan.TRIAL,
        status: TenantStatus.TRIAL,
        trialEndsAt,
        users: { create: { email: v.email } },
      },
    });
  } catch (e) {
    // Failed AFTER DB was provisioned — orphan DB. We don't auto-drop here so
    // the operator can inspect. They can clean up manually.
    return {
      error: `ສ້າງ tenant record ບໍ່ໄດ້: ${
        e instanceof Error ? e.message : "unknown"
      }. DB "${dbName}" ມີຢູ່ແລ້ວ — ຕິດຕໍ່ admin.`,
    };
  }

  // Auto-create a BillingCustomer (type=TENANT) so this tenant immediately
  // shows up in /manage/billing/customers and can be billed without manual
  // setup. Non-blocking — admin can create one later if this races/fails.
  try {
    const { ensureCustomerForTenant } = await import("@/lib/billing-codes");
    await ensureCustomerForTenant(tenant.id);
  } catch {
    // Non-blocking — signup still succeeds.
  }

  // The seed already created a User row inside the tenant DB. Authenticate
  // against it now to mint a session.
  const { authenticate } = await import("@/lib/session");
  const auth = await authenticate(v.email, v.password);
  if (!auth.ok) {
    return {
      error:
        "ສ້າງ tenant ສຳເລັດແຕ່ login ບໍ່ໄດ້. ກະລຸນາໄປໜ້າ login ດ້ວຍ email ແລະ ລະຫັດຜ່ານ.",
    };
  }

  await createSession({
    userId: auth.user.id,
    role: auth.user.role,
    name: auth.user.name,
    email: auth.user.email,
    tenantId: tenant.id,
    slug: tenant.slug,
    dbName: tenant.dbName,
  });

  redirect("/dashboard");
}
