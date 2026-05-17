"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/(app)/actions";
import { t, type Locale } from "@/lib/i18n/messages";

type Item = { href: string; key: string; adminOnly?: boolean };

type FeatureKey = "dashboard" | "pos" | "reports" | "todo";
type ItemWithFeature = Item & { feature?: FeatureKey };

const menuItems: ItemWithFeature[] = [
  { href: "/dashboard",  key: "dashboard",  feature: "dashboard" },
  { href: "/pos",        key: "pos",        feature: "pos" },
  { href: "/todo",       key: "todo",       feature: "todo" },
  { href: "/quotations", key: "quotations" },
  { href: "/invoices",   key: "invoices" },
  { href: "/products",   key: "products" },
  { href: "/customers",  key: "customers" },
  { href: "/reports",    key: "reports",    feature: "reports" },
];

const configItems: Item[] = [
  { href: "/settings",                key: "settings",      adminOnly: true },
  { href: "/users",                   key: "users",         adminOnly: true },
  { href: "/activity",                key: "activity",      adminOnly: true },
  { href: "/products/configuration",  key: "productConfig" },
  { href: "/addresses",               key: "addresses",     adminOnly: true },
];

export function TopBar({
  user,
  features,
  locale,
}: {
  user: { name: string; role: "ADMIN" | "STAFF" };
  features: {
    dashboard: boolean;
    pos: boolean;
    reports: boolean;
    chatter: boolean;
    creditNotes: boolean;
    todo: boolean;
  };
  locale: Locale;
}) {
  const tr = (k: string) => t(locale, "nav", k);
  const pathname = usePathname();
  const [appsOpen, setAppsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const visibleConfig = configItems.filter(
    (i) => !i.adminOnly || user.role === "ADMIN",
  );

  const currentItem = [...menuItems, ...configItems].find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );
  const currentLabel = currentItem ? tr(currentItem.key) : "SMLAO";

  return (
    <header className="o-topbar no-print sticky top-0 z-40 shadow-sm">
      <div className="flex items-center h-11 px-2">
        {/* Apps grid (module switcher) */}
        <button
          type="button"
          onClick={() => setAppsOpen((v) => !v)}
          className="w-10 h-11 flex items-center justify-center hover:bg-white/10 transition"
          title={tr("apps")}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="5" cy="5" r="1.6" />
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="19" cy="5" r="1.6" />
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
            <circle cx="5" cy="19" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
            <circle cx="19" cy="19" r="1.6" />
          </svg>
        </button>

        {/* App brand */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 h-11 hover:bg-white/10 transition"
        >
          <span className="w-6 h-6 rounded bg-white text-odoo font-bold text-[11px] flex items-center justify-center">
            S
          </span>
          <span className="font-semibold text-[14px] tracking-wide">
            {currentLabel}
          </span>
        </Link>

        <div className="w-px h-5 bg-white/20 mx-1" />

        {/* Horizontal module menu */}
        <nav className="flex items-center h-11 flex-1 min-w-0">
          {menuItems
            .filter((item) => !item.feature || features[item.feature])
            .map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative h-11 px-3 flex items-center text-[13px] whitespace-nowrap transition ${
                  active
                    ? "text-white bg-white/10 font-medium"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tr(item.key)}
                {active && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-white" />
                )}
              </Link>
            );
          })}

          {visibleConfig.length > 0 && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setConfigOpen((v) => !v)}
                className={`h-11 px-3 flex items-center gap-1 text-[13px] transition ${
                  configOpen
                    ? "bg-white/10 text-white"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                {tr("config")}
                <svg
                  className="w-3 h-3 opacity-80"
                  fill="currentColor"
                  viewBox="0 0 12 12"
                >
                  <path d="M3 4.5l3 3 3-3z" />
                </svg>
              </button>
              {configOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setConfigOpen(false)}
                  />
                  <div className="absolute left-0 top-11 z-20 bg-white text-gray-700 rounded-b shadow-lg border border-gray-200 min-w-[180px] py-1">
                    {visibleConfig.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setConfigOpen(false)}
                        className="block px-4 py-2 text-[13px] hover:bg-odoo/10 hover:text-odoo"
                      >
                        {tr(item.key)}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center h-11">
          <button
            type="button"
            className="w-10 h-11 flex items-center justify-center hover:bg-white/10 transition"
            title={tr("searchTitle")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
          </button>
          <button
            type="button"
            className="w-10 h-11 flex items-center justify-center hover:bg-white/10 transition relative"
            title={tr("notifications")}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* User dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserOpen((v) => !v)}
              className="h-11 px-2 flex items-center gap-2 hover:bg-white/10 transition"
            >
              <span className="w-7 h-7 rounded-full bg-white/20 text-white font-semibold text-[12px] flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="text-[13px] hidden sm:block">{user.name}</span>
              <svg
                className="w-3 h-3 opacity-80"
                fill="currentColor"
                viewBox="0 0 12 12"
              >
                <path d="M3 4.5l3 3 3-3z" />
              </svg>
            </button>
            {userOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setUserOpen(false)}
                />
                <div className="absolute right-0 top-11 z-20 bg-white text-gray-700 rounded-b shadow-lg border border-gray-200 min-w-[200px] py-1">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <div className="text-[13px] font-medium text-gray-800">
                      {user.name}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {user.role === "ADMIN" ? tr("admin") : tr("staff")}
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setUserOpen(false)}
                    className="block px-4 py-2 text-[13px] hover:bg-odoo/10 hover:text-odoo"
                  >
                    {tr("profile")}
                  </Link>
                  <Link
                    href="/preferences"
                    onClick={() => setUserOpen(false)}
                    className="block px-4 py-2 text-[13px] hover:bg-odoo/10 hover:text-odoo"
                  >
                    {tr("preferences")}
                  </Link>
                  <div className="border-t border-gray-100" />
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50"
                    >
                      {tr("logout")}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Apps grid drawer */}
      {appsOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setAppsOpen(false)}
          />
          <div className="absolute left-0 right-0 top-11 bg-white text-gray-700 shadow-xl z-40 border-b border-gray-200">
            <div className="max-w-5xl mx-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {[
                ...menuItems.filter(
                  (item) => !item.feature || features[item.feature],
                ),
                ...visibleConfig,
              ].map((item) => {
                const label = tr(item.key);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setAppsOpen(false)}
                    className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-odoo/5 border border-transparent hover:border-odoo/20 transition"
                  >
                    <div className="w-12 h-12 rounded-lg bg-odoo/10 text-odoo flex items-center justify-center font-bold text-lg">
                      {label.charAt(0)}
                    </div>
                    <span className="text-[13px] text-gray-700 text-center">
                      {label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </header>
  );
}
