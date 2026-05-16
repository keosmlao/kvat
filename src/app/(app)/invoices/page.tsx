import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatMoney, type Currency } from "@/lib/format";
import { DeleteInvoiceButton } from "./[id]/delete-button";
import { OdooSearch, type SearchFacet } from "@/components/odoo-search";
import { PivotView, GraphView, type InvoiceRow } from "./invoice-views";
import { KanbanBoard, type KanbanCard } from "./kanban-board";

export default async function InvoicesPage(props: {
  searchParams: Promise<{ q?: string; status?: string; view?: string }>;
}) {
  const { q, status, view } = await props.searchParams;
  const currentView: "list" | "kanban" | "pivot" | "graph" =
    view === "kanban" || view === "pivot" || view === "graph" ? view : "list";

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { number: { contains: q } },
      { customer: { name: { contains: q } } },
    ];
  }
  if (status && status !== "ALL") {
    where.status = status as "ISSUED" | "CANCELLED" | "DRAFT";
  }

  const invoices = await prisma.invoice.findMany({
    where,
    include: {
      customer: true,
      user: true,
      reversed: { select: { id: true, number: true } },
      reversals: { select: { id: true, number: true } },
    },
    orderBy: { date: "desc" },
    take: 100,
  });

  const allStatusCounts = await prisma.invoice.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const countFor = (s: string) =>
    allStatusCounts.find((c) => c.status === s)?._count._all ?? 0;

  const totalSum = invoices.reduce(
    (s, inv) => s + (inv.isCreditNote ? -inv.total : inv.total),
    0,
  );
  const issuedCount = countFor("ISSUED");
  const draftCount = countFor("DRAFT");
  const cancelledCount = countFor("CANCELLED");

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Odoo control panel */}
      <div className="bg-white border-b border-gray-200">
        {/* Breadcrumb row */}
        <div className="px-4 md:px-6 pt-3 pb-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[15px]">
            <span className="font-medium text-gray-800">ບິນອາກອນລູກຄ້າ</span>
          </div>
          <OdooSearch
            facets={
              [
                q && { key: "q", label: `ຄົ້ນຫາ: ${q}`, value: q },
                status && {
                  key: "status",
                  label: `ສະຖານະ: ${
                    status === "ISSUED"
                      ? "ອອກແລ້ວ"
                      : status === "DRAFT"
                        ? "ຮ່າງ"
                        : "ຍົກເລີກ"
                  }`,
                  value: status,
                },
              ].filter(Boolean) as SearchFacet[]
            }
            options={[
              { key: "q", label: "ຄົ້ນຫາເລກບິນ / ລູກຄ້າ" },
              {
                key: "status",
                label: "ສະຖານະ",
                values: [
                  { value: "ISSUED", label: "ອອກແລ້ວ" },
                  { value: "DRAFT", label: "ຮ່າງ" },
                  { value: "CANCELLED", label: "ຍົກເລີກ" },
                ],
              },
            ]}
          />
        </div>

        {/* Action / filter row */}
        <div className="px-4 md:px-6 py-2 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Link
              href="/invoices/new"
              className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium tracking-wide transition"
            >
              ໃໝ່
            </Link>
            <span className="text-gray-300 mx-1">|</span>
            <FilterChip
              label="ທຸກສະຖານະ"
              href="/invoices"
              active={!status}
            />
            <FilterChip
              label={`ອອກແລ້ວ (${issuedCount})`}
              href="/invoices?status=ISSUED"
              active={status === "ISSUED"}
            />
            <FilterChip
              label={`ຮ່າງ (${draftCount})`}
              href="/invoices?status=DRAFT"
              active={status === "DRAFT"}
            />
            <FilterChip
              label={`ຍົກເລີກ (${cancelledCount})`}
              href="/invoices?status=CANCELLED"
              active={status === "CANCELLED"}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[12px] text-gray-500 tabular-nums">
              1-{invoices.length} / {invoices.length}
            </span>
            <div className="flex border border-gray-200 rounded overflow-hidden">
              <button
                type="button"
                className="px-1.5 py-1 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
                disabled
              >
                ‹
              </button>
              <button
                type="button"
                className="px-1.5 py-1 text-gray-400 hover:bg-gray-50 disabled:opacity-40"
                disabled
              >
                ›
              </button>
            </div>
            <span className="mx-1 text-gray-300">|</span>
            <ViewSwitcher current={currentView} q={q} status={status} />
          </div>
        </div>
      </div>

      {/* Pivot + Graph views (need client-side rendering) */}
      {(currentView === "pivot" || currentView === "graph") &&
        (() => {
          const rows: InvoiceRow[] = invoices.map((inv) => ({
            id: inv.id,
            number: inv.number,
            date: inv.date.toISOString(),
            customerName: inv.customer.name,
            total: inv.total,
            isCreditNote: inv.isCreditNote,
            status: inv.status,
          }));
          return currentView === "pivot" ? (
            <PivotView invoices={rows} />
          ) : (
            <GraphView invoices={rows} />
          );
        })()}

      {/* Kanban view (drag-drop status change) */}
      {currentView === "kanban" && (
        <KanbanBoard
          cards={
            invoices.map((inv) => ({
              id: inv.id,
              number: inv.number,
              date: inv.date.toISOString(),
              customerName: inv.customer.name,
              total: inv.total,
              currency: inv.currency,
              status: inv.status,
              isCreditNote: inv.isCreditNote,
              hasReversal: !inv.isCreditNote && inv.reversals.length > 0,
              paymentMethod: inv.paymentMethod,
            })) as KanbanCard[]
          }
        />
      )}

      {/* Tree view */}
      {currentView === "list" && (
      <div className="bg-white">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
              <th className="px-3 py-2 w-10 text-left">
                <input type="checkbox" className="accent-[#b91c1c]" />
              </th>
              <th className="px-2 py-2 text-left font-semibold">
                <SortHeader label="ເລກບິນ" />
              </th>
              <th className="px-2 py-2 text-left font-semibold">
                <SortHeader label="ວັນທີອອກບິນ" active dir="desc" />
              </th>
              <th className="px-2 py-2 text-left font-semibold">
                <SortHeader label="ລູກຄ້າ" />
              </th>
              <th className="px-2 py-2 text-right font-semibold">
                <SortHeader label="ມູນຄ່າທັງໝົດ" align="right" />
              </th>
              <th className="px-2 py-2 text-center font-semibold">
                <SortHeader label="ສະຖານະ" />
              </th>
              <th className="px-3 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 && (
              <tr>
                <td colSpan={7} className="py-20 text-center">
                  <div className="text-gray-500 text-sm mb-2">
                    ຍັງບໍ່ມີບິນອາກອນ
                  </div>
                  <Link
                    href="/invoices/new"
                    className="text-[#b91c1c] hover:underline text-sm font-medium"
                  >
                    ສ້າງບິນອາກອນໃໝ່
                  </Link>
                </td>
              </tr>
            )}
            {invoices.map((inv) => {
              const hasReversal =
                !inv.isCreditNote && inv.reversals.length > 0;
              return (
              <tr
                key={inv.id}
                className={`border-b border-gray-100 group cursor-pointer ${
                  hasReversal
                    ? "bg-red-50 hover:bg-red-100/70 text-red-700 line-through decoration-red-400/60"
                    : "hover:bg-[#b91c1c]/5"
                }`}
                title={
                  hasReversal
                    ? `ບິນນີ້ຖືກລົດໜີ້ໂດຍ ${inv.reversals.map((r) => r.number).join(", ")}`
                    : undefined
                }
              >
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    className="accent-[#b91c1c] opacity-0 group-hover:opacity-100 transition"
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1.5">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className={`font-mono text-[12px] hover:text-[#b91c1c] ${
                        hasReversal ? "text-red-700" : "text-gray-800"
                      }`}
                    >
                      {inv.number}
                    </Link>
                    {hasReversal && (
                      <span className="no-underline inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-700 border border-red-200 font-medium uppercase tracking-wider">
                        ຖືກລົດໜີ້
                      </span>
                    )}
                  </div>
                  {inv.isCreditNote && inv.reversed && (
                    <div className="text-[10px] text-gray-500 mt-0.5 no-underline">
                      ↩{" "}
                      <Link
                        href={`/invoices/${inv.reversed.id}`}
                        className="font-mono hover:text-[#b91c1c] hover:underline"
                      >
                        {inv.reversed.number}
                      </Link>
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 text-gray-700">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="block w-full"
                  >
                    {formatDate(inv.date)}
                  </Link>
                </td>
                <td className="px-2 py-2 text-gray-800">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="block w-full hover:text-[#b91c1c]"
                  >
                    {inv.customer.name}
                  </Link>
                </td>
                <td
                  className={`px-2 py-2 text-right tabular-nums font-medium ${
                    inv.isCreditNote ? "text-orange-700" : "text-gray-900"
                  }`}
                >
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="block w-full"
                  >
                    {inv.isCreditNote ? "- " : ""}
                    {formatMoney(inv.total, inv.currency as Currency)}
                  </Link>
                </td>
                <td className="px-2 py-2 text-center">
                  <StatusPill
                    status={inv.status}
                    isCreditNote={inv.isCreditNote}
                  />
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    {inv.status === "ISSUED" && (
                      <Link
                        href={`/invoices/${inv.id}/edit`}
                        className="text-[#b91c1c] hover:text-[#991b1b] text-[12px]"
                      >
                        ແກ້ໄຂ
                      </Link>
                    )}
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-gray-600 hover:text-gray-900 text-[12px]"
                    >
                      ເບິ່ງ
                    </Link>
                    <DeleteInvoiceButton id={inv.id} variant="row" />
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
          {invoices.length > 0 && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold text-gray-800">
                <td colSpan={4} className="px-3 py-2 text-right text-gray-600 text-[12px] uppercase tracking-wider">
                  ລວມ
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {formatMoney(totalSum, "LAK")}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`px-2.5 py-1 rounded text-[12px] font-medium transition ${
        active
          ? "bg-[#b91c1c]/10 text-[#b91c1c]"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </Link>
  );
}

function SortHeader({
  label,
  active,
  dir,
  align,
}: {
  label: string;
  active?: boolean;
  dir?: "asc" | "desc";
  align?: "right";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        align === "right" ? "flex-row-reverse" : ""
      } ${active ? "text-[#b91c1c]" : ""}`}
    >
      {label}
      {active && (
        <span className="text-[10px]">{dir === "desc" ? "▼" : "▲"}</span>
      )}
    </span>
  );
}

function ViewSwitcher({
  current,
  q,
  status,
}: {
  current: "list" | "kanban" | "pivot" | "graph";
  q?: string;
  status?: string;
}) {
  const buildUrl = (view: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (view !== "list") params.set("view", view);
    const qs = params.toString();
    return qs ? `/invoices?${qs}` : "/invoices";
  };
  const active = "bg-[#b91c1c]/10 text-[#b91c1c]";
  const idle = "hover:bg-gray-50";
  return (
    <div className="flex border border-gray-200 rounded overflow-hidden text-gray-500">
      <Link
        href={buildUrl("list")}
        title="ລາຍການ"
        className={`px-2 py-1 ${current === "list" ? active : idle}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </Link>
      <Link
        href={buildUrl("kanban")}
        title="Kanban"
        className={`px-2 py-1 ${current === "kanban" ? active : idle}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 4h7v16H4zM13 4h7v9h-7z" />
        </svg>
      </Link>
      <Link
        href={buildUrl("pivot")}
        title="Pivot"
        className={`px-2 py-1 ${current === "pivot" ? active : idle}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" d="M3 3h18v18H3zM3 9h18M9 3v18" />
        </svg>
      </Link>
      <Link
        href={buildUrl("graph")}
        title="Graph"
        className={`px-2 py-1 ${current === "graph" ? active : idle}`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      </Link>
    </div>
  );
}

function StatusPill({
  status,
  isCreditNote,
}: {
  status: string;
  isCreditNote: boolean;
}) {
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[11px] font-medium border border-red-200">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
        ຍົກເລີກ
      </span>
    );
  }
  if (isCreditNote) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 text-[11px] font-medium border border-orange-200">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        ໃບລົດໜີ້
      </span>
    );
  }
  if (status === "DRAFT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-[11px] font-medium border border-gray-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
        ຮ່າງ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
      ອອກແລ້ວ
    </span>
  );
}
