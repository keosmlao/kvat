import Link from "next/link";
import { loadInbox, inboxCounts, type InboxItem } from "@/lib/inbox";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const SEVERITY_STYLE: Record<
  InboxItem["severity"],
  { dot: string; chip: string; chipLabel: string }
> = {
  critical: {
    dot: "bg-red-500",
    chip: "bg-red-50 text-red-700 border-red-200",
    chipLabel: "ດ່ວນ",
  },
  warning: {
    dot: "bg-amber-500",
    chip: "bg-amber-50 text-amber-700 border-amber-200",
    chipLabel: "ໃກ້ໝົດ",
  },
  info: {
    dot: "bg-odoo",
    chip: "bg-odoo/10 text-odoo border-odoo/30",
    chipLabel: "ແຈ້ງເຕືອນ",
  },
};

const KIND_LABEL: Record<InboxItem["kind"], string> = {
  "approval-pending": "Approval",
  "billing-overdue": "Billing",
  "billing-unpaid": "Billing",
  "trial-expiring": "Tenant",
  "subscription-renewal": "Subscription",
  "subscription-overdue": "Subscription",
};

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const sp = await searchParams;
  const items = await loadInbox();
  const counts = inboxCounts(items);

  const filter =
    sp.filter === "critical" || sp.filter === "warning" || sp.filter === "info"
      ? sp.filter
      : undefined;
  const filtered = filter
    ? items.filter((i) => i.severity === filter)
    : items;

  return (
    <OdooListPage
      title={tm("inboxTitle")}
      subtitle={tm("inboxSubtitle")}
      filters={
        <div className="flex items-center gap-1 text-[12px] flex-wrap">
          <FilterTab
            label={`ທັງໝົດ (${counts.total})`}
            href="/manage/inbox"
            active={!filter}
          />
          <FilterTab
            label={`🔴 ດ່ວນ (${counts.critical})`}
            href="/manage/inbox?filter=critical"
            active={filter === "critical"}
          />
          <FilterTab
            label={`🟡 ໃກ້ໝົດ (${counts.warning})`}
            href="/manage/inbox?filter=warning"
            active={filter === "warning"}
          />
          <FilterTab
            label={`🔵 ແຈ້ງເຕືອນ (${counts.info})`}
            href="/manage/inbox?filter=info"
            active={filter === "info"}
          />
        </div>
      }
    >
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-3xl mb-1">✓</div>
            <div className="text-[13px]">ບໍ່ມີສິ່ງທີ່ຕ້ອງເຮັດ</div>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filtered.map((item) => {
              const st = SEVERITY_STYLE[item.severity];
              const content = (
                <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition">
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${st.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${st.chip}`}
                      >
                        {st.chipLabel}
                      </span>
                      <span className="text-[10px] text-gray-400 uppercase">
                        {KIND_LABEL[item.kind]}
                      </span>
                      {item.dueDate && (
                        <span className="text-[11px] text-gray-500">
                          · ກຳນົດ {DATE_FMT.format(item.dueDate)}
                        </span>
                      )}
                    </div>
                    <div className="text-[14px] text-gray-900 mt-0.5">
                      {item.title}
                    </div>
                    <div className="text-[12px] text-gray-500 mt-0.5 truncate">
                      {item.description}
                    </div>
                  </div>
                  {item.href && (
                    <span className="text-[12px] text-slate-700 flex-shrink-0 self-center">
                      →
                    </span>
                  )}
                </div>
              );
              return (
                <li key={item.id}>
                  {item.href ? (
                    <Link href={item.href} className="block">
                      {content}
                    </Link>
                  ) : (
                    content
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </OdooListPage>
  );
}

function FilterTab({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 rounded transition ${
        active
          ? "bg-odoo text-white"
          : "text-gray-700 hover:bg-gray-100 border border-transparent"
      }`}
    >
      {label}
    </Link>
  );
}
