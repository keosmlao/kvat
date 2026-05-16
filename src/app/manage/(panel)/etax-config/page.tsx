import { masterPrisma } from "@/lib/master-prisma";
import { EtaxConfigForm } from "./form";

const DATETIME_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Vientiane",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default async function EtaxConfigPage() {
  const config = await masterPrisma.etaxConfig.findUnique({ where: { id: 1 } });
  const initial = {
    gateway: config?.gateway ?? "",
    env: config?.env ?? "dev",
    username: config?.username ?? "",
    secret: config?.secret ?? "",
  };
  const configured = Boolean(initial.username && initial.secret);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-medium text-gray-900">
          eTax Gateway — ການຕັ້ງຄ່າສ່ວນກາງ
        </h1>
        <p className="text-[12px] text-gray-500 mt-1">
          ຄ່າເຫຼົ່ານີ້ໃຊ້ສຳລັບທຸກ tenant ໃນລະບົບ. ການປ່ຽນແປງມີຜົນກັບການອອກບິນຫຼັງຈາກນັ້ນທັນທີ.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded p-5 mb-4">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          {configured ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              ກຳນົດຄ່າຄົບແລ້ວ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-amber-700">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              ຍັງບໍ່ຄົບ — invoice ຈະບໍ່ສາມາດສົ່ງເຂົ້າ eTax ໄດ້
            </span>
          )}
          {config?.updatedAt && (
            <span className="text-[11px] text-gray-400 ml-auto">
              ອັບເດດ: {DATETIME_FMT.format(config.updatedAt)}
            </span>
          )}
        </div>
        <EtaxConfigForm initial={initial} />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded p-4 text-[12px] text-gray-600 space-y-1">
        <p className="font-medium text-gray-700">ໝາຍເຫດ:</p>
        <ul className="list-disc list-inside space-y-0.5 ml-2">
          <li>Username + Secret ໄດ້ມາຈາກ Lao MoF ຕອນສະໝັກບັນຊີ agent (ໃຊ້ຮ່ວມກັນທຸກ tenant)</li>
          <li>TIN ຂອງຜູ້ອອກບິນດຶງຈາກ Setting ຂອງແຕ່ລະ tenant — tenant ຕ້ອງຕັ້ງ Tax ID ໃນໜ້າ Settings → Company</li>
          <li>ໃນ env dev ໃຊ້ສຳລັບທົດສອບ — invoice ບໍ່ມີຜົນທາງພາສີ</li>
        </ul>
      </div>
    </div>
  );
}
