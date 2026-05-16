import Link from "next/link";
import { requireManagement } from "@/lib/management-session";
import { LogoutButton } from "../logout/button";

// Auth-guarded layout. Wraps every (panel)/* route. /manage/login lives outside
// this group so unauthenticated users can still reach it.
export default async function ManagementPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireManagement();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/manage/tenants" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-[12px] font-semibold">
              M
            </div>
            <div>
              <div className="text-[14px] font-medium leading-tight">
                SMLAO Management
              </div>
              <div className="text-[10px] text-slate-300 leading-tight">
                ຄຸ້ມຄອງ tenant + plan
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 text-[12px]">
            <Link
              href="/manage/tenants"
              className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              Tenants
            </Link>
            <Link
              href="/manage/approvals"
              className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              Approvals
            </Link>
            <Link
              href="/manage/admins"
              className="px-2 py-1 rounded text-slate-300 hover:bg-white/10 hover:text-white transition"
            >
              Admins
            </Link>
            <span className="mx-2 text-slate-500">|</span>
            <span className="text-slate-300">{session.email}</span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  );
}
