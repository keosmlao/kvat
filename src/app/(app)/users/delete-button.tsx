"use client";

import { useTransition } from "react";
import { deleteUser } from "./actions";

export function DeleteUserButton({ id, disabled }: { id: string; disabled?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm("ຕ້ອງການລົບຜູ້ໃຊ້ນີ້ບໍ່?")) return;
        start(async () => {
          try {
            await deleteUser(id);
          } catch (e) {
            alert(e instanceof Error ? e.message : "ລົບບໍ່ສຳເລັດ");
          }
        });
      }}
      disabled={pending || disabled}
      className="text-red-600 hover:text-red-800 text-[12px] disabled:opacity-50 disabled:cursor-not-allowed"
      title={disabled ? "ບໍ່ສາມາດລົບ" : "ລົບ"}
    >
      ລົບ
    </button>
  );
}
