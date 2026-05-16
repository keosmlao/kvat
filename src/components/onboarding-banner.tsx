import Link from "next/link";

// Shown for the first 7 days after a tenant signs up, only on /dashboard.
// Helps new owners discover the setup steps without a tour overlay.
export function OnboardingBanner({
  tenantCreatedAt,
  ownerName,
}: {
  tenantCreatedAt: Date;
  ownerName: string;
}) {
  const days = Math.floor(
    (Date.now() - tenantCreatedAt.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days >= 7) return null;

  return (
    <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded p-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl">👋</div>
        <div className="flex-1">
          <h3 className="text-[14px] font-medium text-gray-900">
            ຍິນດີຕ້ອນຮັບ, {ownerName}!
          </h3>
          <p className="text-[12px] text-gray-600 mt-1">
            ເລີ່ມຕົ້ນດ້ວຍ 4 ຂັ້ນຕອນງ່າຍໆເພື່ອອອກບິນຄັ້ງທຳອິດ:
          </p>
          <ol className="text-[12px] text-gray-700 mt-2 space-y-1 list-decimal list-inside">
            <li>
              <Link
                href="/settings"
                className="text-[#b91c1c] hover:underline"
              >
                ຕັ້ງຄ່າຮ້ານ
              </Link>{" "}
              — ຊື່, ເລກ TIN, ທີ່ຢູ່, logo
            </li>
            <li>
              <Link
                href="/settings?section=etax"
                className="text-[#b91c1c] hover:underline"
              >
                ເຊື່ອມ eTax Gateway
              </Link>{" "}
              — ໃສ່ username/secret ຈາກ ກົມສ່ວຍສາ
            </li>
            <li>
              <Link
                href="/products/new"
                className="text-[#b91c1c] hover:underline"
              >
                ເພີ່ມສິນຄ້າ
              </Link>{" "}
              ແລະ{" "}
              <Link
                href="/customers/new"
                className="text-[#b91c1c] hover:underline"
              >
                ລູກຄ້າ
              </Link>
            </li>
            <li>
              <Link
                href="/invoices/new"
                className="text-[#b91c1c] hover:underline"
              >
                ອອກບິນຄັ້ງທຳອິດ
              </Link>
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
