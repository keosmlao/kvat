// Convert a non-negative integer to its Lao spelling. Designed for invoice
// "amount in words" lines, e.g. 500000 → "ຫ້າແສນກີບຖ້ວນ".
//
// Limits: handles up to 12 digits (trillions); negatives become "ລົບ ..." prefix.
// Fractional parts (kip cents — uncommon) are dropped; callers should round first.

const DIGITS = ["ສູນ", "ໜຶ່ງ", "ສອງ", "ສາມ", "ສີ່", "ຫ້າ", "ຫົກ", "ເຈັດ", "ແປດ", "ເກົ້າ"];

// Place names for groups of 3 digits past thousands. "ພັນ" handles the first
// non-thousand digit inside a million-group; the spelling pattern is:
//   1,234,567 → ໜຶ່ງລ້ານ ສອງແສນ ສາມໝື່ນ ສີ່ພັນ ຫ້າຮ້ອຍ ຫົກສິບເຈັດ
const PLACE_1000 = ["", "ພັນ", "ໝື່ນ", "ແສນ"]; // 10^3..10^5 inside a million

function below1000(n: number): string {
  // 0..999 inclusive. Returns "" for 0 so callers can omit empty groups.
  if (n === 0) return "";
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const u = n % 10;
  let out = "";
  if (h > 0) out += `${DIGITS[h]}ຮ້ອຍ`;
  if (t > 0) {
    if (t === 1) out += "ສິບ";
    else if (t === 2) out += "ຊາວ";
    else out += `${DIGITS[t]}ສິບ`;
  }
  if (u > 0) {
    // ເອັດ replaces ໜຶ່ງ when it's the units digit AND there's a higher digit
    // (e.g. 21 = ຊາວເອັດ, but 1 alone stays ໜຶ່ງ).
    if (u === 1 && (t > 0 || h > 0)) out += "ເອັດ";
    else out += DIGITS[u];
  }
  return out;
}

// Recursively convert by chopping off millions: anything >= 1,000,000 prints
// the upper part + "ລ້ານ" + the lower part. Inside a million we use PLACE_1000.
function intToWords(n: number): string {
  if (n === 0) return DIGITS[0];

  const parts: string[] = [];
  let value = Math.floor(n);

  if (value >= 1_000_000) {
    const upper = Math.floor(value / 1_000_000);
    parts.push(`${intToWords(upper)}ລ້ານ`);
    value = value % 1_000_000;
  }

  // Now value is < 1,000,000. Split into 4 digit groups: hundred-thousands,
  // ten-thousands, thousands, then 0..999 leftover.
  const groups = [
    Math.floor(value / 100_000),       // ແສນ
    Math.floor((value % 100_000) / 10_000), // ໝື່ນ
    Math.floor((value % 10_000) / 1_000),   // ພັນ
  ];
  const placeOrder = ["ແສນ", "ໝື່ນ", "ພັນ"];
  for (let i = 0; i < 3; i++) {
    if (groups[i] > 0) {
      parts.push(`${DIGITS[groups[i]]}${placeOrder[i]}`);
    }
  }
  const tail = below1000(value % 1000);
  if (tail) parts.push(tail);

  return parts.join("");
}

/**
 * Format a money amount as Lao words, e.g. 500_000 → "ຫ້າແສນກີບຖ້ວນ".
 * Currency suffix defaults to "ກີບ" and "ຖ້ວນ" is appended when there are no
 * fractional units — the convention on Lao tax invoices.
 */
export function moneyInLaoWords(amount: number, unit = "ກີບ"): string {
  if (!Number.isFinite(amount)) return "";
  const isNegative = amount < 0;
  const integer = Math.floor(Math.abs(amount));
  const words = intToWords(integer);
  const prefix = isNegative ? "ລົບ " : "";
  return `${prefix}${words}${unit}ຖ້ວນ`;
}
