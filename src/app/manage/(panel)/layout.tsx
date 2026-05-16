import Link from "next/link";
import { requireManagement } from "@/lib/management-session";
import { LogoutButton } from "../logout/button";
import { SidebarNav } from "./sidebar-nav";

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
      <header className="bg-slate-900 text-white sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/manage" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center text-[12px] font-semibold">
              M
            </div>
            <div>
              <div className="text-[14px] font-medium leading-tight">
                SMLAO Management
              </div>
              <div className="text-[10px] text-slate-300 leading-tight">
                ຄຸ້ມຄອງ tenant + ໃບເກັບເງິນ
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-[12px]">
            <span className="text-slate-300">{session.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <div className="flex-1 flex max-w-[1400px] mx-auto w-full">
        <SidebarNav />
        <main className="flex-1 px-5 py-5 min-w-0">{children}</main>
      </div>
    </div>
  );
}
