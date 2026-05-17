import Link from "next/link";
import { requireManagement } from "@/lib/management-session";
import { LogoutButton } from "../logout/button";
import { SidebarNav } from "./sidebar-nav";
import { t } from "@/lib/i18n/messages";

const tm = (k: string) => t("lo", "manage", k);

// Auth-guarded layout. Wraps every (panel)/* route. /manage/login lives outside
// this group so unauthenticated users can still reach it.
export default async function ManagementPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireManagement();

  return (
    <div className="min-h-screen bg-[#f6f7f9] flex flex-col">
      <header className="bg-[#875a7b] text-white sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 py-2.5 flex items-center justify-between">
          <Link href="/manage" className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-white/15 flex items-center justify-center text-[12px] font-semibold">
              M
            </div>
            <div>
              <div className="text-[14px] font-medium leading-tight">
                SMLAO Management
              </div>
              <div className="text-[10px] text-white/75 leading-tight">
                {tm("navManageDesc")}
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-3 text-[12px]">
            <span className="text-white/75">{session.email}</span>
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
