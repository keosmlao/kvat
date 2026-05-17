import "server-only";
import { getTenantPrisma } from "./tenant-prisma";

// Canonical action keys — keep this list flat so admin/timeline pages
// can filter without coupling to specific record types.
export type ActivityAction =
  | "LOGIN"
  | "LOGIN_FAIL"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ISSUE"          // invoice issued / quotation sent
  | "CANCEL"         // invoice cancelled
  | "ROLE_CHANGE"    // admin changed another user's role
  | "PASSWORD_CHANGE";

export type ActivityRecordType =
  | "User"
  | "Invoice"
  | "Quotation"
  | "Customer"
  | "Product"
  | "RecurringInvoice"
  | "Payment"
  | "TodoTask"
  | "Session";

export type RecordActivityInput = {
  dbName: string;
  userId: string | null;     // null for failed logins / anonymous events
  action: ActivityAction;
  summary: string;           // human-readable Lao
  recordType?: ActivityRecordType;
  recordId?: string;
  meta?: Record<string, unknown>;
};

/**
 * Best-effort activity write. NEVER throws — callers should fire-and-forget
 * with `void recordActivity(...)`. We swallow errors so a failed audit write
 * can't break the user-facing operation.
 */
export async function recordActivity(input: RecordActivityInput): Promise<void> {
  try {
    const db = getTenantPrisma(input.dbName);
    await db.userActivity.create({
      data: {
        userId: input.userId ?? undefined,
        action: input.action,
        summary: input.summary,
        recordType: input.recordType,
        recordId: input.recordId,
        meta: input.meta ? JSON.stringify(input.meta) : undefined,
      },
    });
  } catch (e) {
    console.error("[activity] failed to record:", e);
  }
}
