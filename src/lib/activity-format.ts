// Shared helpers for rendering UserActivity rows in the timeline / feed UIs.
// Keep them dumb — no I/O.

export type ActionStyle = {
  label: string;
  cls: string;
  icon: string;
};

const STYLES: Record<string, ActionStyle> = {
  LOGIN:           { label: "ເຂົ້າລະບົບ",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "→" },
  LOGOUT:          { label: "ອອກ",         cls: "bg-gray-100 text-gray-700 border-gray-200",       icon: "←" },
  LOGIN_FAIL:      { label: "ເຂົ້າບໍ່ສຳເລັດ", cls: "bg-red-50 text-red-700 border-red-200",          icon: "✗" },
  CREATE:          { label: "ສ້າງ",         cls: "bg-blue-50 text-blue-700 border-blue-200",        icon: "+" },
  UPDATE:          { label: "ແກ້ໄຂ",        cls: "bg-amber-50 text-amber-700 border-amber-200",     icon: "✎" },
  DELETE:          { label: "ລົບ",          cls: "bg-red-50 text-red-700 border-red-200",          icon: "✕" },
  ISSUE:           { label: "ອອກ",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: "✓" },
  CANCEL:          { label: "ຍົກເລີກ",      cls: "bg-red-50 text-red-700 border-red-200",          icon: "✗" },
  ROLE_CHANGE:     { label: "ປ່ຽນບົດບາດ",   cls: "bg-purple-50 text-purple-700 border-purple-200",  icon: "⚡" },
  PASSWORD_CHANGE: { label: "ປ່ຽນລະຫັດ",    cls: "bg-purple-50 text-purple-700 border-purple-200",  icon: "🔒" },
};

const FALLBACK: ActionStyle = {
  label: "?",
  cls: "bg-gray-100 text-gray-700 border-gray-200",
  icon: "•",
};

export function actionStyle(action: string): ActionStyle {
  return STYLES[action] ?? FALLBACK;
}

// Build a deep-link to the related record if we know the type.
export function recordLink(
  recordType: string | null | undefined,
  recordId: string | null | undefined,
): string | null {
  if (!recordType || !recordId) return null;
  switch (recordType) {
    case "Invoice":          return `/invoices/${recordId}`;
    case "Quotation":        return `/quotations/${recordId}`;
    case "Customer":         return `/customers/${recordId}/edit`;
    case "Product":          return `/products/${recordId}/edit`;
    case "RecurringInvoice": return `/invoices/recurring/${recordId}`;
    case "User":             return `/users/${recordId}/edit`;
    default:                 return null;
  }
}
