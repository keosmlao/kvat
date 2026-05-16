import "server-only";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

/**
 * Roll a date forward by one billing cycle. Caller passes the existing
 * nextRenewalDate; we return the next one after a successful payment.
 *
 * Uses calendar-month math (not 30/90/365 day approximations) so a
 * monthly subscription that started Jan 15 always renews on the 15th.
 */
export function advanceByCycle(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  switch (cycle) {
    case "MONTHLY":
      d.setMonth(d.getMonth() + 1);
      break;
    case "QUARTERLY":
      d.setMonth(d.getMonth() + 3);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export function cycleLabel(cycle: string): string {
  switch (cycle) {
    case "MONTHLY":
      return "ລາຍເດືອນ";
    case "QUARTERLY":
      return "ລາຍໄຕມາດ";
    case "YEARLY":
      return "ລາຍປີ";
    default:
      return cycle;
  }
}

export function daysUntil(date: Date): number {
  const ms = date.getTime() - Date.now();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

/**
 * Aggregate a list of (type, amount) rows into income/expense/net totals.
 * Used by dashboard and the P&L page. Currency is collapsed — callers should
 * filter to a single currency first if they care.
 */
export function aggregatePnL(
  rows: { type: "INCOME" | "EXPENSE"; amount: number }[],
): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;
  for (const r of rows) {
    if (r.type === "INCOME") income += r.amount;
    else expense += r.amount;
  }
  return { income, expense, net: income - expense };
}
