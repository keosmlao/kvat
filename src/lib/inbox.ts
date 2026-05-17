import "server-only";
import { masterPrisma } from "./master-prisma";

export type InboxItem = {
  id: string;
  kind:
    | "approval-pending"
    | "billing-overdue"
    | "billing-unpaid"
    | "trial-expiring"
    | "subscription-renewal"
    | "subscription-overdue";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  href?: string;
  dueDate?: Date | null;
  amount?: number | null;
};

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Aggregate all things that need an admin's attention into a single inbox.
 * Each kind is a self-contained query — keeps this readable and lets future
 * categories slot in without touching the rest.
 */
export async function loadInbox(): Promise<InboxItem[]> {
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * dayMs);
  const in30 = new Date(now.getTime() + 30 * dayMs);

  const [
    pendingApprovals,
    overdueBilling,
    unpaidBilling,
    expiringTrials,
    renewalsSoon,
  ] = await Promise.all([
    masterPrisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      include: { tenant: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    // Overdue = has dueDate before now and still UNPAID
    masterPrisma.billingInvoice.findMany({
      where: { status: "UNPAID", dueDate: { lt: now } },
      include: { customer: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 50,
    }),
    // Unpaid but not yet overdue
    masterPrisma.billingInvoice.findMany({
      where: {
        status: "UNPAID",
        OR: [{ dueDate: null }, { dueDate: { gte: now, lte: in7 } }],
      },
      include: { customer: { select: { name: true } } },
      orderBy: { issueDate: "desc" },
      take: 50,
    }),
    masterPrisma.tenant.findMany({
      where: {
        status: "TRIAL",
        isTemplate: false,
        trialEndsAt: { lte: in7 },
      },
      orderBy: { trialEndsAt: "asc" },
    }),
    masterPrisma.subscription.findMany({
      where: { status: "ACTIVE", nextRenewalDate: { lte: in30 } },
      orderBy: { nextRenewalDate: "asc" },
    }),
  ]);

  const items: InboxItem[] = [];

  for (const r of pendingApprovals) {
    items.push({
      id: `approval-${r.id}`,
      kind: "approval-pending",
      severity: "info",
      title: `Approval ລໍຖ້າ: ${r.tenant.name}`,
      description: `Plan: ${r.requestedPlan}${r.reason ? ` — ${r.reason}` : ""}`,
      href: `/manage/tenants/${r.tenantId}`,
    });
  }

  for (const inv of overdueBilling) {
    const days = inv.dueDate
      ? Math.ceil((now.getTime() - inv.dueDate.getTime()) / dayMs)
      : 0;
    items.push({
      id: `overdue-${inv.id}`,
      kind: "billing-overdue",
      severity: "critical",
      title: `ໃບເກັບເງິນເກີນກຳນົດ ${days} ວັນ: ${inv.number}`,
      description: `${inv.customer.name} — ${inv.amount.toLocaleString()} ${inv.currency}`,
      href: `/manage/billing/${inv.id}`,
      dueDate: inv.dueDate,
      amount: inv.amount,
    });
  }

  for (const inv of unpaidBilling) {
    items.push({
      id: `unpaid-${inv.id}`,
      kind: "billing-unpaid",
      severity: "warning",
      title: `ໃບເກັບເງິນຍັງບໍ່ຈ່າຍ: ${inv.number}`,
      description: `${inv.customer.name} — ${inv.amount.toLocaleString()} ${inv.currency}`,
      href: `/manage/billing/${inv.id}`,
      dueDate: inv.dueDate,
      amount: inv.amount,
    });
  }

  for (const t of expiringTrials) {
    const days = Math.ceil((t.trialEndsAt.getTime() - now.getTime()) / dayMs);
    const overdue = days < 0;
    items.push({
      id: `trial-${t.id}`,
      kind: "trial-expiring",
      severity: overdue ? "critical" : days <= 3 ? "warning" : "info",
      title: overdue
        ? `Trial ໝົດແລ້ວ: ${t.name}`
        : `Trial ໝົດໃນ ${days} ວັນ: ${t.name}`,
      description: `Approve plan ຫຼື suspend`,
      href: `/manage/tenants/${t.id}`,
      dueDate: t.trialEndsAt,
    });
  }

  for (const s of renewalsSoon) {
    const days = Math.ceil(
      (s.nextRenewalDate.getTime() - now.getTime()) / dayMs,
    );
    const overdue = days < 0;
    items.push({
      id: `sub-${s.id}`,
      kind: overdue ? "subscription-overdue" : "subscription-renewal",
      severity: overdue ? "critical" : days <= 7 ? "warning" : "info",
      title: overdue
        ? `Subscription ເກີນກຳນົດ ${-days} ວັນ: ${s.name}`
        : `Subscription ຕໍ່ໃໝ່ໃນ ${days} ວັນ: ${s.name}`,
      description: `${s.vendor} — ${s.amount.toLocaleString()} ${s.currency}`,
      href: `/manage/subscriptions/${s.id}`,
      dueDate: s.nextRenewalDate,
      amount: s.amount,
    });
  }

  // Sort: critical first, then warning, then info; inside each, oldest dueDate first
  const severityRank = { critical: 0, warning: 1, info: 2 };
  items.sort((a, b) => {
    const r = severityRank[a.severity] - severityRank[b.severity];
    if (r !== 0) return r;
    const aDate = a.dueDate?.getTime() ?? Infinity;
    const bDate = b.dueDate?.getTime() ?? Infinity;
    return aDate - bDate;
  });

  return items;
}

export function inboxCounts(items: InboxItem[]): {
  total: number;
  critical: number;
  warning: number;
  info: number;
} {
  let critical = 0;
  let warning = 0;
  let info = 0;
  for (const i of items) {
    if (i.severity === "critical") critical++;
    else if (i.severity === "warning") warning++;
    else info++;
  }
  return { total: items.length, critical, warning, info };
}
