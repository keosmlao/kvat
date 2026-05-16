import "server-only";
import crypto from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";

// ─────────────────────────── Config ───────────────────────────

export type EtaxCreds = {
  gateway: string;
  env: "dev" | "prod";
  username: string;
  secret: string;
  issueCode: string;
};

// Per-request override. Server Actions wrap their bodies in `withEtaxCreds`
// after loading the tenant's Setting; everything inside reads those creds.
// Outside the store we fall back to env vars (legacy single-tenant path).
const credsStore = new AsyncLocalStorage<EtaxCreds>();

function envCreds(): EtaxCreds {
  return {
    gateway: process.env.ETAX_GATEWAY_URL ?? "",
    env: (process.env.ETAX_ENV ?? "dev") as "dev" | "prod",
    username: process.env.ETAX_USERNAME ?? "",
    secret: process.env.ETAX_SECRET ?? "",
    issueCode: process.env.ETAX_ISSUE_CODE ?? "",
  };
}

function currentCreds(): EtaxCreds {
  return credsStore.getStore() ?? envCreds();
}

export function withEtaxCreds<T>(creds: EtaxCreds, fn: () => Promise<T>): Promise<T> {
  return credsStore.run(creds, fn);
}

export function isEtaxConfigured(): boolean {
  const c = currentCreds();
  return Boolean(c.gateway && c.username && c.secret && c.issueCode);
}

// Legacy export — many call sites still read this constant directly.
// Defined as a getter so it reflects the current store.
export const ETAX_ISSUE_CODE = new Proxy(
  { _: "" },
  {
    get() {
      return currentCreds().issueCode;
    },
  },
) as unknown as string;

// ─────────────────────────── HMAC signing ───────────────────────────

function rfc1123GmtDate(d: Date = new Date()): string {
  // toUTCString() returns: "Mon, 27 Apr 2026 10:00:00 GMT" — RFC 1123 compatible
  return d.toUTCString();
}

function bodyDigest(body: string): string {
  const hash = crypto.createHash("sha256").update(body, "utf8").digest("base64");
  return `SHA-256=${hash}`;
}

function signingString(args: {
  date: string;
  method: string;
  path: string;
  digest: string;
}): string {
  return [
    `date: ${args.date}`,
    `@request-target: ${args.method.toLowerCase()} ${args.path}`,
    `digest: ${args.digest}`,
  ].join("\n");
}

function hmacBase64(secret: string, msg: string): string {
  return crypto.createHmac("sha256", secret).update(msg, "utf8").digest("base64");
}

function authorizationHeader(username: string, signature: string): string {
  return `hmac username="${username}", algorithm="hmac-sha256", headers="date @request-target digest", signature="${signature}"`;
}

// ─────────────────────────── HTTP wrapper ───────────────────────────

export type EtaxEnvelope<T = unknown> = {
  requestId?: string;
  success: boolean;
  errorCode?: string;
  errorMsg?: string;
  data?: T;
};

export type EtaxError = {
  /** http status (0 = network) */
  status: number;
  /** machine code from gateway-level error envelope or business error */
  code?: string;
  message: string;
  requestId?: string;
};

export type EtaxResult<T> =
  | { ok: true; data: T; raw: EtaxEnvelope<T>; requestId?: string }
  | { ok: false; error: EtaxError };

/**
 * Send a signed POST to the eTax gateway and return a typed result.
 * - `path` should be the endpoint suffix after the env prefix (e.g. "/api/queryTaxList").
 *   The function prepends `/dev` or `/prod` based on ETAX_ENV.
 */
export async function etaxRequest<T = unknown>(
  path: string,
  body: unknown,
): Promise<EtaxResult<T>> {
  if (!isEtaxConfigured()) {
    return {
      ok: false,
      error: { status: 0, message: "eTax integration is not configured" },
    };
  }

  const creds = currentCreds();
  const fullPath = `/${creds.env}${path}`;
  const url = creds.gateway.replace(/\/$/, "") + fullPath;

  const bodyStr = JSON.stringify(body);
  const date = rfc1123GmtDate();
  const digest = bodyDigest(bodyStr);
  const ss = signingString({
    date,
    method: "POST",
    path: fullPath,
    digest,
  });
  const signature = hmacBase64(creds.secret, ss);
  const auth = authorizationHeader(creds.username, signature);

  let resp: Response;
  try {
    resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Date: date,
        Digest: digest,
        Authorization: auth,
      },
      body: bodyStr,
      // Each request must be sent fresh (no caching) — signatures are time-bound.
      cache: "no-store",
    });
  } catch (e) {
    // Network-layer failure (DNS, TCP, TLS) — expose the underlying cause
    const err = e as Error & { cause?: unknown; code?: string };
    const cause = err.cause as
      | { code?: string; message?: string; hostname?: string; port?: number }
      | undefined;
    const parts: string[] = [];
    if (err.message) parts.push(err.message);
    if (cause?.code) parts.push(`[${cause.code}]`);
    if (cause?.message && cause.message !== err.message)
      parts.push(cause.message);
    if (cause?.hostname && cause?.port)
      parts.push(`(${cause.hostname}:${cause.port})`);
    return {
      ok: false,
      error: {
        status: 0,
        code: cause?.code || err.code,
        message: parts.join(" ") || "Network error",
      },
    };
  }

  const text = await resp.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore — handled below
  }

  // Gateway-level error (HTTP 4xx/5xx)
  if (!resp.ok) {
    // Two known shapes:
    //   { error: { code, message, request_id } }
    //   { message, request_id }  (Kong native)
    const j = (json ?? {}) as Record<string, unknown>;
    const errObj = (j.error ?? {}) as Record<string, unknown>;
    const message =
      (errObj.message as string) ||
      (j.message as string) ||
      `HTTP ${resp.status}`;
    const code = (errObj.code as string) || undefined;
    const requestId =
      ((errObj.request_id as string) ??
        (j.request_id as string) ??
        undefined) || undefined;
    return {
      ok: false,
      error: { status: resp.status, code, message, requestId },
    };
  }

  // HTTP 200 — check tax-server business success flag
  const env = (json ?? {}) as EtaxEnvelope<T>;
  if (env.success === false) {
    return {
      ok: false,
      error: {
        status: 200,
        code: env.errorCode,
        message: env.errorMsg || "Tax server rejected the request",
        requestId: env.requestId,
      },
    };
  }

  return {
    ok: true,
    data: (env.data as T) ?? (undefined as T),
    raw: env,
    requestId: env.requestId,
  };
}

// ─────────────────────────── Typed endpoint helpers ───────────────────────────

export type TaxRate = {
  taxType: string;
  taxTypeName: string;
  taxRate: string;
};

/** GET available tax rates for the configured issueCode. */
export async function queryTaxList(): Promise<EtaxResult<TaxRate[]>> {
  return etaxRequest<TaxRate[]>("/api/queryTaxList", {
    issueCode: ETAX_ISSUE_CODE,
  });
}

// Invoice issuance types

export type EtaxPartyType = "001" | "003"; // 001 Seller, 003 Buyer
export type EtaxParty = {
  sn: number;
  partyType: EtaxPartyType;
  code: string;
  name: string;
  fullAddress?: string;
  telephone?: string;
  email?: string;
  bankName?: string;
  bankAccountId?: string;
  bankAccountName?: string;
};

export type EtaxLineTax = {
  sn: number;
  taxType: "001" | "002";
  taxRate: string; // e.g. "0.1"
  taxAmount: string; // decimal(10,6) as string
};

export type EtaxLine = {
  sn: number;
  originalLineSn?: number;
  othcode?: string;
  description: string;
  unitPrice: string;
  quantity: string;
  unit: string;
  taxExcludingAmount: string;
  taxAmount: string;
  taxIncludingAmount: string;
  hscode?: string;
  taxList: EtaxLineTax[];
};

export type EtaxIssueData = {
  serialNum: string; // 32 chars unique
  issueType: 0 | 1; // 0 electronic, 1 credit
  issueCode: string;
  supplierCode: string;
  buyerCode: string;
  totalNetAmount: string;
  totalTaxAmount: string;
  originalInvoiceNumber?: string;
  originalIssueTime?: string;
  remarks?: string;
  partyList: EtaxParty[];
  lineList: EtaxLine[];
  taxList: { sn: number; taxType: "001" | "002"; taxAmount: string }[];
  allowanceList?: {
    sn?: number;
    allowanceType?: string;
    amount?: string;
    reason?: string;
  }[];
};

export type EtaxIssueResult = {
  invoiceNumber: string; // 20 digits
  issueTime: string; // yyyy-MM-dd HH:mm:ss
  invoiceStatus: string; // "0" Created
  checkCode: string; // 16 chars
  url: string;
  errors?: unknown[];
};

export async function issueInvoice(
  data: EtaxIssueData,
): Promise<EtaxResult<EtaxIssueResult[]>> {
  return etaxRequest<EtaxIssueResult[]>("/api/issueInvoice", {
    issueCode: ETAX_ISSUE_CODE,
    data,
  });
}

export type EtaxStatus = "0" | "1" | "3" | "6";
export type EtaxQueryResult = {
  invoiceNumber: string;
  issueTime: string;
  invoiceStatus: EtaxStatus;
  invoiceStatusReason?: string;
};

export async function queryInvoiceResult(
  serialNum: string,
): Promise<EtaxResult<EtaxQueryResult[]>> {
  return etaxRequest<EtaxQueryResult[]>("/api/queryInvoiceResult", {
    issueCode: ETAX_ISSUE_CODE,
    data: { serialNum },
  });
}

export async function cancelInvoice(args: {
  invoiceNumber: string;
  issueTime: string;
}): Promise<EtaxResult<unknown>> {
  return etaxRequest("/api/cancelInvoice", {
    issueCode: ETAX_ISSUE_CODE,
    data: args,
  });
}

export type EtaxRedInfo = {
  invoiceNumber: string;
  issueTime: string;
  totalNetAmount: string;
  lineList: {
    sn: number;
    othcode?: string;
    description: string;
    taxExcludingAmount: string;
    taxAmount: string;
    taxIncludingAmount: string;
    hscode?: string;
  }[];
};

export async function queryRedInvoiceInfo(args: {
  invoiceNumber: string;
  issueTime: string;
}): Promise<EtaxResult<EtaxRedInfo[]>> {
  return etaxRequest<EtaxRedInfo[]>("/api/queryRedInvoiceInfo", {
    issueCode: ETAX_ISSUE_CODE,
    data: args,
  });
}
