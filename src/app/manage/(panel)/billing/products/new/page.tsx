import Link from "next/link";
import { ProductForm } from "../product-form";

export default function NewProductPage() {
  return (
    <div>
      <div className="mb-4">
        <Link
          href="/manage/billing/products"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Products
        </Link>
      </div>
      <h1 className="text-[22px] font-medium text-gray-900 mb-5">
        ເພີ່ມສິນຄ້າ / ບໍລິການ
      </h1>
      <div className="bg-white border border-gray-200 rounded p-5 max-w-2xl">
        <ProductForm
          mode="create"
          initial={{
            name: "",
            kind: "SERVICE",
            description: "",
            unit: "ໜ່ວຍ",
            priceLak: 0,
            active: true,
          }}
        />
      </div>
    </div>
  );
}
