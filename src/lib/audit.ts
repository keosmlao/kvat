import "server-only";
import { masterPrisma } from "./master-prisma";

export type AuditInput = {
  actorId?: string | null;
  actorEmail?: string | null;
  action: string;          // "tenant.approve", "billing.create", etc.
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
};

/**
 * Fire-and-forget audit log writer. Failures are swallowed so a logging
 * outage never blocks a user action. Caller passes whatever context they
 * have — actorId/email come from the management session.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await masterPrisma.adminAuditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        entityLabel: input.entityLabel ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress ?? null,
      },
    });
  } catch {
    // Intentionally silent — audit log is best-effort, never blocks UX.
  }
}
