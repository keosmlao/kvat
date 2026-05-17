"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { t, type Locale } from "@/lib/i18n/messages";

type NavItem = {
  href: string;
  key: string;          // i18n key in manage.* namespace
  icon: string;
  exact?: boolean;
  badge?: number;
};

type Section = { titleKey?: string; items: NavItem[] };

const SECTIONS: Section[] = [
  {
    items: [
      { href: "/manage",         key: "navDashboard", icon: "D", exact: true },
      { href: "/manage/inbox",   key: "navInbox",     icon: "I" },
      { href: "/manage/reports", key: "navReports",   icon: "R" },
    ],
  },
  {
    titleKey: "groupTenants",
    items: [
      { href: "/manage/tenants",   key: "navTenants",   icon: "T" },
      { href: "/manage/approvals", key: "navApprovals", icon: "A" },
    ],
  },
  {
    titleKey: "groupBilling",
    items: [
      { href: "/manage/quotes",             key: "navQuotes",      icon: "Q" },
      { href: "/manage/billing",            key: "navBilling",     icon: "B" },
      { href: "/manage/billing/customers",  key: "navBillingCust", icon: "C" },
      { href: "/manage/billing/products",   key: "navBillingProd", icon: "P" },
    ],
  },
  {
    titleKey: "groupFinance",
    items: [
      { href: "/manage/ledger",        key: "navLedger",        icon: "L" },
      { href: "/manage/subscriptions", key: "navSubscriptions", icon: "S" },
    ],
  },
  {
    titleKey: "groupSystem",
    items: [
      { href: "/manage/company",     key: "navCompany",    icon: "Co" },
      { href: "/manage/etax-config", key: "navEtaxConfig", icon: "E" },
      { href: "/manage/admins",      key: "navAdmins",     icon: "Ad" },
      { href: "/manage/audit",       key: "navAudit",      icon: "Au" },
    ],
  },
];

const STORAGE_KEY = "smlao-mgmt-sidebar-collapsed";

function isActive(href: string, pathname: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ locale = "lo" }: { locale?: Locale } = {}) {
  const tm = (k: string) => t(locale, "manage", k);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      return v === "1";
    } catch {
      return false;
    }
  });

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <aside
      className={`hidden md:flex flex-shrink-0 border-r border-gray-200 bg-white flex-col transition-[width] duration-150 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      <button
        type="button"
        onClick={toggle}
        title={collapsed ? tm("collapseExpand") : tm("collapseShrink")}
        className="flex items-center justify-end h-9 px-2 border-b border-gray-100 text-gray-400 hover:text-gray-700"
      >
        <span className="text-[14px]">{collapsed ? "›" : "‹"}</span>
      </button>
      <div className="flex-1 overflow-y-auto py-3">
        {SECTIONS.map((section, i) => (
          <div key={i} className="mb-3">
            {section.titleKey && !collapsed && (
              <div className="px-4 py-1 text-[10px] uppercase tracking-widest text-gray-400 font-medium">
                {tm(section.titleKey)}
              </div>
            )}
            {section.titleKey && collapsed && i > 0 && (
              <div className="mx-3 my-2 border-t border-gray-100" />
            )}
            {section.items.map((item) => {
              const active = isActive(item.href, pathname, item.exact);
              const label = tm(item.key);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? label : undefined}
                  className={`flex items-center gap-2 px-4 py-1.5 text-[13px] transition border-l-2 ${
                    active
                      ? "bg-[#875a7b]/10 text-[#875a7b] font-medium border-[#875a7b]"
                      : "text-gray-600 hover:bg-gray-50 border-transparent"
                  } ${collapsed ? "justify-center px-0" : ""}`}
                >
                  <span className="w-5 h-5 rounded bg-gray-100 text-[10px] leading-5 text-center font-medium text-gray-500">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="text-[10px] bg-[#875a7b] text-white px-1.5 rounded-full min-w-[18px] text-center">
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}
