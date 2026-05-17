"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import {
  createProvince,
  updateProvince,
  deleteProvince,
  createDistrict,
  updateDistrict,
  deleteDistrict,
  createVillage,
  updateVillage,
  deleteVillage,
  type AddrState,
} from "./actions";

type ProvinceItem = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  active: boolean;
  districtCount: number;
  customerCount: number;
};

type DistrictItem = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  provinceId: string;
  provinceName: string;
  active: boolean;
  villageCount: number;
  customerCount: number;
};

type VillageItem = {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  districtId: string;
  districtName: string;
  provinceId: string;
  provinceName: string;
  active: boolean;
  customerCount: number;
};

type Tab = "provinces" | "districts" | "villages";

export function AddressClient({
  provinces,
  districts,
  villages,
}: {
  provinces: ProvinceItem[];
  districts: DistrictItem[];
  villages: VillageItem[];
}) {
  const [tab, setTab] = useState<Tab>("provinces");
  const [filterProvince, setFilterProvince] = useState<string>("");
  const [filterDistrict, setFilterDistrict] = useState<string>("");

  const filteredDistricts = useMemo(
    () =>
      filterProvince
        ? districts.filter((d) => d.provinceId === filterProvince)
        : districts,
    [districts, filterProvince],
  );

  const filteredVillages = useMemo(
    () =>
      villages
        .filter((v) => !filterProvince || v.provinceId === filterProvince)
        .filter((v) => !filterDistrict || v.districtId === filterDistrict),
    [villages, filterProvince, filterDistrict],
  );

  return (
    <>
      <div className="bg-white border border-gray-200 rounded mb-4 px-3 pt-2 flex gap-1 text-[13px]">
        <TabBtn
          active={tab === "provinces"}
          onClick={() => setTab("provinces")}
        >
          ແຂວງ ({provinces.length})
        </TabBtn>
        <TabBtn
          active={tab === "districts"}
          onClick={() => setTab("districts")}
        >
          ເມືອງ ({districts.length})
        </TabBtn>
        <TabBtn
          active={tab === "villages"}
          onClick={() => setTab("villages")}
        >
          ບ້ານ ({villages.length})
        </TabBtn>
      </div>

      {tab === "provinces" && <ProvincesPanel items={provinces} />}
      {tab === "districts" && (
        <DistrictsPanel
          items={filteredDistricts}
          provinces={provinces}
          filterProvince={filterProvince}
          onFilter={setFilterProvince}
        />
      )}
      {tab === "villages" && (
        <VillagesPanel
          items={filteredVillages}
          provinces={provinces}
          districts={districts}
          filterProvince={filterProvince}
          filterDistrict={filterDistrict}
          onFilterProvince={(p) => {
            setFilterProvince(p);
            setFilterDistrict("");
          }}
          onFilterDistrict={setFilterDistrict}
        />
      )}
    </>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 border-b-2 -mb-px transition ${
        active
          ? "border-odoo text-odoo font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────── Provinces ───────────────
function ProvincesPanel({ items }: { items: ProvinceItem[] }) {
  const [state, formAction, pending] = useActionState<AddrState, FormData>(
    createProvince,
    undefined,
  );
  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-2.5 border-b border-gray-200">
        <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
          ແຂວງ
        </h2>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-3 py-2 text-left font-semibold w-24">ລະຫັດ</th>
            <th className="px-2 py-2 text-left font-semibold">ຊື່</th>
            <th className="px-2 py-2 text-left font-semibold">ຊື່ EN</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ເມືອງ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ລູກຄ້າ</th>
            <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
            <th className="px-3 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <ProvinceRow key={p.id} item={p} />
          ))}
          <tr className="bg-gray-50/60 border-t border-gray-200">
            <td colSpan={7} className="px-3 py-2">
              <form action={formAction} className="flex gap-2 items-center flex-wrap">
                <input name="code" required placeholder="ລະຫັດ" className="o-field w-24" />
                <input name="name" required placeholder="ຊື່ແຂວງ" className="o-field max-w-[200px]" />
                <input name="nameEn" placeholder="ຊື່ EN" className="o-field max-w-[200px]" />
                <input type="hidden" name="active" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
                >
                  {pending ? "..." : "+ ເພີ່ມ"}
                </button>
                {state?.error && (
                  <span className="text-[12px] text-red-600">{state.error}</span>
                )}
              </form>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ProvinceRow({ item }: { item: ProvinceItem }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [nameEn, setNameEn] = useState(item.nameEn);
  const [active, setActive] = useState(item.active);
  const [pending, start] = useTransition();
  const usedCount = item.districtCount + item.customerCount;

  const save = () => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    fd.set("nameEn", nameEn);
    fd.set("active", active ? "true" : "false");
    start(async () => {
      try {
        await updateProvince(item.id, fd);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
      }
    });
  };
  const remove = () => {
    if (!confirm(`ລົບ "${item.name}"?`)) return;
    start(async () => {
      try {
        await deleteProvince(item.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
      }
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-yellow-50/30">
        <td className="px-3 py-1.5">
          <input value={code} onChange={(e) => setCode(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5">
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">{item.districtCount}</td>
        <td className="px-2 py-1.5 text-right text-gray-400">{item.customerCount}</td>
        <td className="px-2 py-1.5 text-center">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-odoo" />
        </td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex justify-end gap-2 text-[12px]">
            <button onClick={save} disabled={pending} className="text-emerald-700 hover:text-emerald-900 font-medium">
              ບັນທຶກ
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-700">
              ຍົກເລີກ
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-odoo/5 group">
      <td className="px-3 py-1.5 font-mono text-[12px] text-gray-700">{item.code}</td>
      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
      <td className="px-2 py-1.5 text-gray-500">{item.nameEn || "—"}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{item.districtCount}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{item.customerCount}</td>
      <td className="px-2 py-1.5 text-center">
        {item.active ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />ໃຊ້ງານ
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />ປິດ
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition text-[12px]">
          <button onClick={() => setEditing(true)} className="text-odoo hover:text-odoo-hover">
            ແກ້ໄຂ
          </button>
          <button
            onClick={remove}
            disabled={pending || usedCount > 0}
            className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ລົບ
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────── Districts ───────────────
function DistrictsPanel({
  items,
  provinces,
  filterProvince,
  onFilter,
}: {
  items: DistrictItem[];
  provinces: ProvinceItem[];
  filterProvince: string;
  onFilter: (id: string) => void;
}) {
  const [state, formAction, pending] = useActionState<AddrState, FormData>(
    createDistrict,
    undefined,
  );
  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
          ເມືອງ
        </h2>
        <select
          value={filterProvince}
          onChange={(e) => onFilter(e.target.value)}
          className="text-[13px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-odoo"
        >
          <option value="">ກັ່ນຕອງ: ທຸກແຂວງ</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-3 py-2 text-left font-semibold w-24">ລະຫັດ</th>
            <th className="px-2 py-2 text-left font-semibold">ຊື່</th>
            <th className="px-2 py-2 text-left font-semibold">ຊື່ EN</th>
            <th className="px-2 py-2 text-left font-semibold w-40">ແຂວງ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ບ້ານ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ລູກຄ້າ</th>
            <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
            <th className="px-3 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((d) => (
            <DistrictRow key={d.id} item={d} provinces={provinces} />
          ))}
          <tr className="bg-gray-50/60 border-t border-gray-200">
            <td colSpan={8} className="px-3 py-2">
              <form action={formAction} className="flex gap-2 items-center flex-wrap">
                <input name="code" required placeholder="ລະຫັດ" className="o-field w-24" />
                <input name="name" required placeholder="ຊື່ເມືອງ" className="o-field max-w-[180px]" />
                <input name="nameEn" placeholder="EN" className="o-field max-w-[140px]" />
                <select name="provinceId" required defaultValue={filterProvince} className="o-field max-w-[200px]">
                  <option value="">ເລືອກແຂວງ...</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <input type="hidden" name="active" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
                >
                  {pending ? "..." : "+ ເພີ່ມ"}
                </button>
                {state?.error && (
                  <span className="text-[12px] text-red-600">{state.error}</span>
                )}
              </form>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function DistrictRow({ item, provinces }: { item: DistrictItem; provinces: ProvinceItem[] }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [nameEn, setNameEn] = useState(item.nameEn);
  const [provinceId, setProvinceId] = useState(item.provinceId);
  const [active, setActive] = useState(item.active);
  const [pending, start] = useTransition();
  const usedCount = item.villageCount + item.customerCount;

  const save = () => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    fd.set("nameEn", nameEn);
    fd.set("provinceId", provinceId);
    fd.set("active", active ? "true" : "false");
    start(async () => {
      try {
        await updateDistrict(item.id, fd);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
      }
    });
  };
  const remove = () => {
    if (!confirm(`ລົບ "${item.name}"?`)) return;
    start(async () => {
      try {
        await deleteDistrict(item.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
      }
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-yellow-50/30">
        <td className="px-3 py-1.5">
          <input value={code} onChange={(e) => setCode(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5">
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5">
          <select value={provinceId} onChange={(e) => setProvinceId(e.target.value)} className="o-cell w-full">
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">{item.villageCount}</td>
        <td className="px-2 py-1.5 text-right text-gray-400">{item.customerCount}</td>
        <td className="px-2 py-1.5 text-center">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-odoo" />
        </td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex justify-end gap-2 text-[12px]">
            <button onClick={save} disabled={pending} className="text-emerald-700 hover:text-emerald-900 font-medium">
              ບັນທຶກ
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-700">
              ຍົກເລີກ
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-odoo/5 group">
      <td className="px-3 py-1.5 font-mono text-[12px] text-gray-700">{item.code}</td>
      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
      <td className="px-2 py-1.5 text-gray-500">{item.nameEn || "—"}</td>
      <td className="px-2 py-1.5 text-gray-600">{item.provinceName}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{item.villageCount}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{item.customerCount}</td>
      <td className="px-2 py-1.5 text-center">
        {item.active ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />ໃຊ້ງານ
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />ປິດ
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition text-[12px]">
          <button onClick={() => setEditing(true)} className="text-odoo hover:text-odoo-hover">
            ແກ້ໄຂ
          </button>
          <button
            onClick={remove}
            disabled={pending || usedCount > 0}
            className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ລົບ
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────── Villages ───────────────
function VillagesPanel({
  items,
  provinces,
  districts,
  filterProvince,
  filterDistrict,
  onFilterProvince,
  onFilterDistrict,
}: {
  items: VillageItem[];
  provinces: ProvinceItem[];
  districts: DistrictItem[];
  filterProvince: string;
  filterDistrict: string;
  onFilterProvince: (id: string) => void;
  onFilterDistrict: (id: string) => void;
}) {
  const [state, formAction, pending] = useActionState<AddrState, FormData>(
    createVillage,
    undefined,
  );
  const districtsForFilter = filterProvince
    ? districts.filter((d) => d.provinceId === filterProvince)
    : districts;

  const [formProvince, setFormProvince] = useState(filterProvince);
  const districtsForForm = formProvince
    ? districts.filter((d) => d.provinceId === formProvince)
    : [];

  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
          ບ້ານ
        </h2>
        <div className="flex gap-2">
          <select
            value={filterProvince}
            onChange={(e) => onFilterProvince(e.target.value)}
            className="text-[13px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-odoo"
          >
            <option value="">ທຸກແຂວງ</option>
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={filterDistrict}
            onChange={(e) => onFilterDistrict(e.target.value)}
            disabled={!filterProvince}
            className="text-[13px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-odoo"
          >
            <option value="">ທຸກເມືອງ</option>
            {districtsForFilter.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-3 py-2 text-left font-semibold w-24">ລະຫັດ</th>
            <th className="px-2 py-2 text-left font-semibold">ຊື່ບ້ານ</th>
            <th className="px-2 py-2 text-left font-semibold w-36">ເມືອງ</th>
            <th className="px-2 py-2 text-left font-semibold w-36">ແຂວງ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ລູກຄ້າ</th>
            <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
            <th className="px-3 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-gray-500">
                ຍັງບໍ່ມີຂໍ້ມູນບ້ານ — ກົດ &quot;+ ເພີ່ມ&quot; ດ້ານລຸ່ມ
              </td>
            </tr>
          )}
          {items.map((v) => (
            <VillageRow key={v.id} item={v} provinces={provinces} districts={districts} />
          ))}
          <tr className="bg-gray-50/60 border-t border-gray-200">
            <td colSpan={7} className="px-3 py-2">
              <form action={formAction} className="flex gap-2 items-center flex-wrap">
                <input name="code" placeholder="ລະຫັດ (optional)" className="o-field w-32" />
                <input name="name" required placeholder="ຊື່ບ້ານ" className="o-field max-w-[180px]" />
                <select
                  value={formProvince}
                  onChange={(e) => setFormProvince(e.target.value)}
                  className="o-field max-w-[160px]"
                >
                  <option value="">ແຂວງ...</option>
                  {provinces.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <select name="districtId" required disabled={!formProvince} className="o-field max-w-[160px]">
                  <option value="">ເມືອງ...</option>
                  {districtsForForm.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <input type="hidden" name="active" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-odoo hover:bg-odoo-hover text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
                >
                  {pending ? "..." : "+ ເພີ່ມ"}
                </button>
                {state?.error && (
                  <span className="text-[12px] text-red-600">{state.error}</span>
                )}
              </form>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function VillageRow({
  item,
  provinces,
  districts,
}: {
  item: VillageItem;
  provinces: ProvinceItem[];
  districts: DistrictItem[];
}) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [provinceId, setProvinceId] = useState(item.provinceId);
  const [districtId, setDistrictId] = useState(item.districtId);
  const [active, setActive] = useState(item.active);
  const [pending, start] = useTransition();
  const districtOpts = districts.filter((d) => d.provinceId === provinceId);

  const save = () => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    fd.set("districtId", districtId);
    fd.set("active", active ? "true" : "false");
    start(async () => {
      try {
        await updateVillage(item.id, fd);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
      }
    });
  };
  const remove = () => {
    if (!confirm(`ລົບ "${item.name}"?`)) return;
    start(async () => {
      try {
        await deleteVillage(item.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບໍ່ສຳເລັດ");
      }
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-yellow-50/30">
        <td className="px-3 py-1.5">
          <input value={code} onChange={(e) => setCode(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5">
          <input value={name} onChange={(e) => setName(e.target.value)} className="o-cell w-full" />
        </td>
        <td className="px-2 py-1.5">
          <select
            value={districtId}
            onChange={(e) => setDistrictId(e.target.value)}
            className="o-cell w-full"
          >
            {districtOpts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5">
          <select
            value={provinceId}
            onChange={(e) => {
              setProvinceId(e.target.value);
              setDistrictId("");
            }}
            className="o-cell w-full"
          >
            {provinces.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">{item.customerCount}</td>
        <td className="px-2 py-1.5 text-center">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-odoo" />
        </td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex justify-end gap-2 text-[12px]">
            <button onClick={save} disabled={pending} className="text-emerald-700 hover:text-emerald-900 font-medium">
              ບັນທຶກ
            </button>
            <button onClick={() => setEditing(false)} className="text-gray-500 hover:text-gray-700">
              ຍົກເລີກ
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-odoo/5 group">
      <td className="px-3 py-1.5 font-mono text-[12px] text-gray-700">{item.code || "—"}</td>
      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
      <td className="px-2 py-1.5 text-gray-600">{item.districtName}</td>
      <td className="px-2 py-1.5 text-gray-600">{item.provinceName}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">{item.customerCount}</td>
      <td className="px-2 py-1.5 text-center">
        {item.active ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />ໃຊ້ງານ
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />ປິດ
          </span>
        )}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition text-[12px]">
          <button onClick={() => setEditing(true)} className="text-odoo hover:text-odoo-hover">
            ແກ້ໄຂ
          </button>
          <button
            onClick={remove}
            disabled={pending || item.customerCount > 0}
            className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ລົບ
          </button>
        </div>
      </td>
    </tr>
  );
}
