import Link from "next/link";
import { ReactNode } from "react";

/**
 * Wraps a page in Odoo's classic "form view" chrome — breadcrumb, action bar,
 * white sheet with shadow. Designed to host any of the smaller pieces below
 * (NotebookTabs, Field, StatusBar) but they each work standalone too.
 */
export function OdooLayout({
  breadcrumb,
  actions,
  status,
  children,
}: {
  breadcrumb: { href: string; label: string }[];
  actions: ReactNode;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="odoo -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-4 md:px-6 pt-2 pb-1">
        {breadcrumb.map((crumb, i) => (
          <span key={crumb.href}>
            {i > 0 && <span className="mx-1.5 text-gray-400">›</span>}
            {i < breadcrumb.length - 1 ? (
              <Link href={crumb.href} className="hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-700">{crumb.label}</span>
            )}
          </span>
        ))}
      </div>

      {/* Action / status bar */}
      <div className="bg-white border-y border-gray-200 mx-4 md:mx-6 rounded-t-md px-3 py-2 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">{actions}</div>
        {status}
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 mx-4 md:mx-6 rounded-b-md shadow-sm">
        {children}
      </div>

      <OdooStyles />
    </div>
  );
}

/**
 * Lightweight wrapper — for pages that want the sheet aesthetic without the
 * full breadcrumb/action-bar chrome.
 */
export function OdooSheet({ children }: { children: ReactNode }) {
  return (
    <div className="odoo bg-white border border-gray-200 rounded-md shadow-sm">
      {children}
      <OdooStyles />
    </div>
  );
}

/**
 * Big "INV/####" style heading at the top of the sheet body. Pass `tag`
 * for the small uppercase label above (e.g. "ບິນອາກອນ" / "ບິນຮ່າງ").
 */
export function OdooHeading({
  tag,
  title,
}: {
  tag?: string;
  title: ReactNode;
}) {
  return (
    <div className="px-8 pt-6 pb-2">
      {tag && (
        <div className="text-[11px] uppercase tracking-widest text-gray-500 font-medium">
          {tag}
        </div>
      )}
      <h1 className="text-[28px] leading-tight font-light text-gray-900 mb-6">
        {title}
      </h1>
    </div>
  );
}

/**
 * Two-column Odoo header — typically holds customer/date/currency/etc.
 * Children should be Field elements.
 */
export function OdooHeaderGrid({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div className="px-8 grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1 mb-4">
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

/**
 * Single field row — label in left column, input in right. Matches the
 * Odoo invoice form's grid-cols-[130px_1fr] pattern exactly.
 */
export function Field({
  label,
  required,
  emphasis,
  children,
}: {
  label: string;
  required?: boolean;
  emphasis?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] items-center gap-2 py-0.5">
      <label
        className={`text-[13px] ${emphasis ? "text-gray-700 font-medium" : "text-gray-500"}`}
      >
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div>{children}</div>
    </div>
  );
}

/**
 * Notebook (tab strip) — red underline on the active tab. Pass `tabs`
 * with `{ key, label, active, onClick }` for client-side switching.
 */
export type NotebookTab = {
  key: string;
  label: ReactNode;
};

export function NotebookTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: NotebookTab[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="border-b border-gray-200 mt-2 px-8">
      <div className="flex gap-1 text-[13px]">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`px-3 py-2 border-b-2 -mb-px transition ${
                isActive
                  ? "border-odoo text-odoo font-medium"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Generic 3-step status chip row (Draft → Posted → Paid style). Pass
 * a custom `steps` array to reuse on quotations/orders/etc.
 */
export type StatusStep = { key: string; label: string };

export function StatusBar({
  steps,
  current,
}: {
  steps: StatusStep[];
  current: string;
}) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const active = s.key === current;
        return (
          <div key={s.key} className="flex items-center">
            <span
              className={`px-3 py-1 text-[12px] uppercase tracking-wider rounded-sm font-medium transition ${
                active
                  ? "bg-odoo text-white"
                  : "text-gray-400"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="text-gray-300 text-xs">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Subtle "Save" / "Discard" red+gray primary button pair used in Odoo's
 * default top-left action area.
 */
export function PrimaryButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="bg-odoo text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-odoo-hover disabled:opacity-50 transition tracking-wide"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  disabled,
  type = "button",
  onClick,
  href,
  danger,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button" | "reset";
  onClick?: () => void;
  href?: string;
  danger?: boolean;
}) {
  const cls = `${
    danger
      ? "text-red-700 hover:bg-red-50"
      : "text-gray-700 hover:bg-gray-100"
  } px-2.5 py-1 rounded text-[13px]`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/**
 * Standardised chrome for list/index pages — title block on the left,
 * primary action buttons on the right, then the content area underneath.
 * Use this on every "browse a list of things" page for visual consistency.
 */
export function OdooListPage({
  title,
  subtitle,
  actions,
  filters,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="odoo -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[18px] font-medium text-gray-800">{title}</h1>
            {subtitle && (
              <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-1.5 flex-wrap">{actions}</div>
          )}
        </div>
        {filters && <div className="mt-2">{filters}</div>}
      </div>
      <div className="px-4 md:px-6 py-4">{children}</div>
      <OdooStyles />
    </div>
  );
}

export function OdooPager({
  page,
  pageSize,
  total,
  hrefForPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  hrefForPage: (page: number) => string;
}) {
  const safeTotal = Math.max(0, total);
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = safeTotal === 0 ? 0 : (current - 1) * pageSize + 1;
  const end = Math.min(current * pageSize, safeTotal);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[12px] text-gray-500 tabular-nums">
        {start}-{end} / {safeTotal}
      </span>
      <div className="flex border border-gray-200 rounded overflow-hidden">
        {current > 1 ? (
          <Link
            href={hrefForPage(current - 1)}
            className="px-1.5 py-1 text-gray-600 hover:bg-gray-50"
            aria-label="Previous page"
          >
            ‹
          </Link>
        ) : (
          <button
            type="button"
            className="px-1.5 py-1 text-gray-400 disabled:opacity-40"
            disabled
            aria-label="Previous page"
          >
            ‹
          </button>
        )}
        {current < totalPages ? (
          <Link
            href={hrefForPage(current + 1)}
            className="px-1.5 py-1 text-gray-600 hover:bg-gray-50 border-l border-gray-200"
            aria-label="Next page"
          >
            ›
          </Link>
        ) : (
          <button
            type="button"
            className="px-1.5 py-1 text-gray-400 border-l border-gray-200 disabled:opacity-40"
            disabled
            aria-label="Next page"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Embed once per page (OdooLayout already includes it). Defines the
 * `.o-input` and `.o-cell` classes that input/textarea/select should
 * use throughout to get the Odoo aesthetic.
 */
export function OdooStyles() {
  return (
    <style>{`
      .odoo { color: #1f2937; }
      .o-input {
        width: 100%;
        padding: 0.3rem 0.4rem;
        border: 1px solid transparent;
        border-bottom: 1px solid #e5e7eb;
        border-radius: 0;
        font-size: 13px;
        background: transparent;
        color: #1f2937;
        transition: all 0.12s;
      }
      .o-input:hover:not(:disabled) { border-bottom-color: #9ca3af; }
      .o-input:focus {
        outline: none;
        border-color: transparent;
        border-bottom-color: var(--odoo-primary);
        background: #fff;
        box-shadow: 0 1px 0 0 var(--odoo-primary);
      }
      .o-input:disabled { color: #9ca3af; cursor: not-allowed; }
      .o-cell {
        width: 100%;
        padding: 0.25rem 0.35rem;
        border: 1px solid transparent;
        border-radius: 2px;
        font-size: 13px;
        background: transparent;
        transition: all 0.1s;
      }
      .o-cell:hover { background: #fff; border-color: #e5e7eb; }
      .o-cell:focus {
        outline: none;
        background: #fff;
        border-color: var(--odoo-primary);
        box-shadow: 0 0 0 2px rgba(113, 75, 103, 0.14);
      }
    `}</style>
  );
}
