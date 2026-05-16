"use client";

import { useTransition } from "react";
import { deleteProduct } from "./actions";

export function DeleteProductButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("ຕ້ອງການລົບສິນຄ້ານີ້ບໍ່?")) return;
        start(() => deleteProduct(id));
      }}
      disabled={pending}
      className="text-red-600 hover:text-red-800 text-[12px] disabled:opacity-50"
    >
      ລົບ
    </button>
  );
}
