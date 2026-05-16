"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import {
  queryTaxList,
  loadGlobalEtaxCreds,
  withTenantEtaxCreds,
  type TaxRate,
} from "@/lib/etax";

export type EtaxTestResult = {
  ok: boolean;
  message: string;
  detail?: string;
  requestId?: string;
  rates?: TaxRate[];
  config?: {
    env: string;
    username: string;
    issueCode: string;
    gateway: string;
  };
};

/**
 * Test connection to the eTax gateway by calling queryTaxList.
 * Returns tax rates on success or a clear error message on failure.
 */
export async function testEtaxConnection(): Promise<EtaxTestResult> {
  await requireAdmin();

  const [global, setting] = await Promise.all([
    loadGlobalEtaxCreds(),
    prisma.setting.findUnique({
      where: { id: "default" },
      select: { taxId: true },
    }),
  ]);
  const tin = setting?.taxId ?? "";

  const config = {
    env: global.env,
    username: global.username,
    issueCode: tin,
    gateway: global.gateway,
  };

  if (!global.gateway || !global.username || !global.secret || !tin) {
    return {
      ok: false,
      message: !tin
        ? "ບໍ່ມີ Tax ID ໃນ Settings → ບໍລິສັດ"
        : "ບໍ່ໄດ້ກຳນົດ eTax (ໄປ /manage/etax-config)",
      config,
    };
  }

  const res = await withTenantEtaxCreds(tin, () => queryTaxList());
  if (!res.ok) {
    return {
      ok: false,
      message: `❌ ${res.error.message}`,
      detail: res.error.code
        ? `code=${res.error.code} status=${res.error.status}`
        : `status=${res.error.status}`,
      requestId: res.error.requestId,
      config,
    };
  }

  return {
    ok: true,
    message: "✓ ເຊື່ອມຕໍ່ສຳເລັດ",
    requestId: res.requestId,
    rates: res.data,
    config,
  };
}
