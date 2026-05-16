"use server";

import crypto from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { masterPrisma } from "@/lib/master-prisma";
import { rateLimit, clientIpFromHeaders } from "@/lib/rate-limit";

export type ForgotState =
  | { error?: string; success?: string }
  | undefined;

const TOKEN_TTL_MIN = 60;

export async function requestPasswordReset(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  // Rate-limit per IP (cheap) and per email (target a single account).
  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (!rateLimit(`forgot:ip:${ip}`, 10, 60 * 60 * 1000).ok) {
    return { error: "ຮ້ອງຂໍຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ" };
  }

  const parsed = z
    .object({ email: z.email() })
    .safeParse({ email: String(formData.get("email") ?? "").trim().toLowerCase() });
  if (!parsed.success) return { error: "ຮູບແບບ email ບໍ່ຖືກຕ້ອງ" };
  const email = parsed.data.email;

  if (!rateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000).ok) {
    return { error: "ຮ້ອງຂໍຫຼາຍເກີນໄປ ກະລຸນາລໍຖ້າ" };
  }

  // Always return success — never disclose whether email exists.
  const mapping = await masterPrisma.tenantUserEmail.findUnique({
    where: { email },
  });
  if (mapping) {
    const raw = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MIN * 60 * 1000);
    await masterPrisma.passwordResetToken.create({
      data: { tokenHash, email, tenantId: mapping.tenantId, expiresAt },
    });

    // No SMTP yet — log the reset URL to the server console so operators can
    // hand it to the customer. Wire to email/SMS provider when available.
    const origin =
      h.get("origin") ?? `http://${h.get("host") ?? "localhost:3000"}`;
    console.log(
      `[password-reset] ${email} → ${origin}/reset?token=${raw} (expires ${expiresAt.toISOString()})`,
    );
  }

  return {
    success:
      "ຖ້າ email ນີ້ມີໃນລະບົບ — ລະບົບໄດ້ສົ່ງລິ້ງຣີເຊັດໄປແລ້ວ (ກວດ inbox ຫຼື ຕິດຕໍ່ admin)",
  };
}
