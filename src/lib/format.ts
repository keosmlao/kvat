export const CURRENCIES = ["LAK", "USD", "THB"] as const;
export type Currency = (typeof CURRENCIES)[number];

export function formatMoney(amount: number, currency: Currency = "LAK") {
  if (currency === "LAK") {
    return new Intl.NumberFormat("lo-LA", {
      maximumFractionDigits: 0,
    }).format(amount) + " ກີບ";
  }
  if (currency === "USD") {
    return "$" + new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  return "฿" + new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("lo-LA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return (
    date.toLocaleDateString("lo-LA") +
    " " +
    date.toLocaleTimeString("lo-LA", { hour: "2-digit", minute: "2-digit" })
  );
}

