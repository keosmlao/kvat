import Link from "next/link";
import { ProductForm } from "../product-form";
import { OdooListPage } from "@/components/odoo/sheet";

export default function NewProductPage() {
  return (
    <OdooListPage title="ເພີ່ມສິນຄ້າ / ບໍລິການ">
      <>
      <div className="mb-3">
        <Link
          href="/manage/billing/products"
          className="text-[12px] text-gray-500 hover:text-gray-800"
        >
          ← Products
        </Link>
      </div>
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
      </>
    </OdooListPage>
  );
}
