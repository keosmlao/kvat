"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { runAllDueRecurring } from "./actions";

export function RunDueButton({ count }: { count: number }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`ສ້າງ invoice ສຳລັບ ${count} template ທີ່ຄົບກຳນົດ?`)) return;
        start(async () => {
          const r = await runAllDueRecurring();
          if (r.failed > 0) {
            alert(
              `ສ້າງສຳເລັດ ${r.generated} / ບໍ່ສຳເລັດ ${r.failed}\n\n${r.errors.join("\n")}`,
            );
          } else {
            alert(`✓ ສ້າງ ${r.generated} invoice ສຳເລັດ`);
          }
          router.refresh();
        });
      }}
      className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
    >
      {pending ? "ກຳລັງ..." : `🔔 Run due (${count})`}
    </button>
  );
}
