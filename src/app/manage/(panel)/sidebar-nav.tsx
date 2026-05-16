"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  // Whether this item is active for a given pathname. By default a startsWith
  // match — but "/manage" needs exact match so it doesn't also light up under
  // every nested route.
  exact?: boolean;
};

const SECTIONS: { title?: string; items: NavItem[] }[] = [
  {
    items: [
      { href: "/manage", label: "Dashboard", icon: "🏠", exact: true },
    ],
  },
  {
    title: "Tenants",
    items: [
      { href: "/manage/tenants", label: "Tenants", icon: "🏢" },
      { href: "/manage/approvals", label: "Approvals", icon: "✅" },
    ],
  },
  {
    title: "Billing",
    items: [
      { href: "/manage/billing", label: "ໃບເກັບເງິນ", icon: "🧾" },
      { href: "/manage/billing/customers", label: "ລູກຄ້າ", icon: "👥" },
      { href: "/manage/billing/products", label: "ສິນຄ້າ / ບໍລິການ", icon: "📦" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/manage/ledger", label: "ລາຍຮັບ-ລາຍຈ່າຍ", icon: "📊" },
      { href: "/manage/subscriptions", label: "ສັນຍາເຊົ່າ", icon: "🔄" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/manage/company", label: "ກຳນົດບໍລິສັດ", icon: "🏢" },
      { href: "/manage/etax-config", label: "eTax Gateway", icon: "🔌" },
      { href: "/manage/admins", label: "Admins", icon: "👥" },
    ],
  },
];

function isActive(href: string, pathname: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-56 flex-shrink-0 border-r border-gray-200 bg-white py-3">
      {SECTIONS.map((section, i) => (
        <div key={i} className="mb-3">
          {section.title && (
            <div className="px-4 py-1 text-[10px] uppercase tracking-widest text-gray-400 font-medium">
              {section.title}
            </div>
          )}
          {section.items.map((item) => {
            const active = isActive(item.href, pathname, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-1.5 text-[13px] transition border-l-2 ${
                  active
                    ? "bg-slate-100 text-slate-900 font-medium border-slate-900"
                    : "text-gray-600 hover:bg-gray-50 border-transparent"
                }`}
              >
                <span className="text-base w-5 text-center">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
