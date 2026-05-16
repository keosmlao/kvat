"use server";

import { requireAdmin } from "@/lib/session";
import {
  queryTaxList,
  isEtaxConfigured,
  ETAX_ISSUE_CODE,
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

  const config = {
    env: process.env.ETAX_ENV ?? "?",
    username: process.env.ETAX_USERNAME ?? "?",
    issueCode: ETAX_ISSUE_CODE,
    gateway: process.env.ETAX_GATEWAY_URL ?? "?",
  };

  if (!isEtaxConfigured()) {
    return {
      ok: false,
      message: "ບໍ່ໄດ້ກຳນົດ eTax (ກະຣຸນາໃສ່ ETAX_* ໃນ .env)",
      config,
    };
  }

  const res = await queryTaxList();
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
