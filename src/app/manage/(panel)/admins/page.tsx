import { masterPrisma } from "@/lib/master-prisma";
import { getManagementSession } from "@/lib/management-session";
import { CreateAdminForm, DeleteAdminButton } from "./admins-ui";
import { OdooListPage } from "@/components/odoo/sheet";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

const DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function AdminsPage() {
  const session = await getManagementSession();
  const admins = await masterPrisma.managementUser.findMany({
    orderBy: { createdAt: "asc" },
  });

  return (
    <OdooListPage
      title={tm("adminsTitle")}
      subtitle={`${tm("admAccountsPrefix")} ${admins.length} ${tm("admAccountsSuffix")}`}
    >
      <>
      <div className="bg-white border border-gray-200 rounded p-4 mb-4">
        <h3 className="text-[12px] uppercase tracking-widest text-gray-500 font-medium mb-3">
          {tm("admAddNewBtn")}
        </h3>
        <CreateAdminForm />
      </div>

      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">{tm("admColName")}</th>
              <th className="px-3 py-2 text-left">{tm("admColCreated")}</th>
              <th className="px-3 py-2 text-right">{tm("admColAction")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((a) => {
              const isSelf = session?.managementUserId === a.id;
              return (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono">{a.email}</td>
                  <td className="px-3 py-2">
                    {a.name}
                    {isSelf && (
                      <span className="ml-1 text-[11px] text-gray-400">(you)</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-[12px]">
                    {DATE_FMT.format(a.createdAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!isSelf && <DeleteAdminButton id={a.id} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
    </OdooListPage>
  );
}
