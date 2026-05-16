"use client";

import { useTransition } from "react";
import { deleteCustomer } from "./actions";

export function DeleteCustomerButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("ຕ້ອງການລົບລູກຄ້ານີ້ບໍ່?")) return;
        start(() => deleteCustomer(id));
      }}
      disabled={pending}
      className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50"
    >
      ລົບ
    </button>
  );
}
