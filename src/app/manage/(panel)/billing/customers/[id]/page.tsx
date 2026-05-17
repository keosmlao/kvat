import Link from "next/link";
import { notFound } from "next/navigation";
import { masterPrisma } from "@/lib/master-prisma";
import { CustomerForm } from "../customer-form";
import { OdooListPage } from "@/components/odoo/sheet";
import { ManagementChatter } from "@/components/management-chatter";
import { getManagementChatterData } from "@/lib/management-chatter";

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function fmtMoney(n: number, currency: string) {
  return (
    new Intl.NumberFormat("lo-LA", { maximumFractionDigits: 0 }).format(n) +
    " " +
    (currency === "LAK" ? "ກີບ" : currency)
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [customer, tenants, chatter] = await Promise.all([
    masterPrisma.billingCustomer.findUnique({
      where: { id },
      include: {
        _count: { select: { invoices: true } },
        invoices: {
          orderBy: { issueDate: "desc" },
          take: 20,
          select: {
            id: true,
            number: true,
            issueDate: true,
            amount: true,
            currency: true,
            status: true,
          },
        },
      },
    }),
    masterPrisma.tenant.findMany({
      where: { isTemplate: false },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    }),
    getManagementChatterData("BillingCustomer", id),
  ]);
  if (!customer) notFound();

  return (
    <OdooListPage
      title={customer.name}
      subtitle={`${customer.code} · ${customer.type === "TENANT" ? "SaaS Tenant" : "ລູກຄ້າພາຍນອກ"}`}
      actions={
        <Link
          href={`/manage/billing/new?customerId=${customer.id}`}
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium"
        >
          + ສ້າງໃບເກັບເງິນ
        </Link>
      }
    >
      <>
      <div className="mb-3">
        <Link
          href="/manage/billing/customers"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Customers
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-4">
            ແກ້ໄຂຂໍ້ມູນ
          </h3>
          <CustomerForm
            mode="edit"
            id={customer.id}
            invoiceCount={customer._count.invoices}
            tenants={tenants.map((t) => ({
              id: t.id,
              label: `${t.name} (/t/${t.slug})`,
            }))}
            initial={{
              name: customer.name,
              type: customer.type,
              tenantId: customer.tenantId ?? "",
              taxId: customer.taxId ?? "",
              phone: customer.phone ?? "",
              email: customer.email ?? "",
              address: customer.address ?? "",
              contactName: customer.contactName ?? "",
              notes: customer.notes ?? "",
            }}
          />
        </div>

        <div className="bg-white border border-gray-200 rounded p-5">
          <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
            ປະຫວັດໃບເກັບເງິນ ({customer._count.invoices})
          </h3>
          {customer.invoices.length === 0 ? (
            <p className="text-[12px] text-gray-400 italic">ຍັງບໍ່ມີ</p>
          ) : (
            <div className="divide-y divide-gray-100 text-[13px]">
              {customer.invoices.map((inv) => (
                <Link
                  key={inv.id}
                  href={`/manage/billing/${inv.id}`}
                  className="block py-2 hover:bg-gray-50 -mx-2 px-2 rounded"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[12px] text-gray-600">
                      {inv.number}
                    </div>
                    <div className="font-medium">
                      {fmtMoney(inv.amount, inv.currency)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-gray-500">
                      {DATE_FMT.format(inv.issueDate)}
                    </span>
                    <span
                      className={`text-[10px] uppercase ${
                        inv.status === "PAID"
                          ? "text-emerald-600"
                          : inv.status === "UNPAID"
                            ? "text-amber-600"
                            : "text-gray-400"
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 bg-white border border-gray-200 rounded overflow-hidden">
        <ManagementChatter
          recordType="BillingCustomer"
          recordId={id}
          revalidate={`/manage/billing/customers/${id}`}
          messages={chatter.messages}
          followers={chatter.followers}
          activities={chatter.activities}
          users={chatter.users}
          isFollowing={chatter.isFollowing}
          currentUserId={chatter.currentUserId}
        />
      </div>
      </>
    </OdooListPage>
  );
}
