import Link from "next/link";

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-4 pb-3 border-b border-gray-200">
      <div>
        <h1 className="text-[20px] font-light text-gray-900 leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[12px] text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      {action?.href && (
        <Link
          href={action.href}
          className="inline-flex items-center gap-1.5 bg-odoo text-white px-3 py-1.5 rounded text-[13px] font-medium hover:bg-odoo-hover transition tracking-wide"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          {action.label}
        </Link>
      )}
    </div>
  );
}
