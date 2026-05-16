export type VatMode = "EXCLUSIVE" | "INCLUSIVE" | "EXEMPT";

/**
 * Calculate VAT amount and total based on mode.
 * - EXCLUSIVE: subtotal is tax-free, VAT added on top → total = subtotal + vat
 * - INCLUSIVE: subtotal already includes VAT, extract → total = subtotal
 * - EXEMPT: no VAT → total = subtotal
 */
export function computeVat(
  afterDiscount: number,
  vatRate: number,
  vatMode: VatMode,
) {
  if (vatMode === "EXEMPT") {
    return { vatAmount: 0, total: afterDiscount };
  }
  if (vatMode === "INCLUSIVE") {
    const vatAmount = (afterDiscount * vatRate) / (1 + vatRate);
    return { vatAmount, total: afterDiscount };
  }
  // EXCLUSIVE
  const vatAmount = afterDiscount * vatRate;
  return { vatAmount, total: afterDiscount + vatAmount };
}
