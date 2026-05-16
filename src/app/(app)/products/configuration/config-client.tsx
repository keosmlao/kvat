"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import {
  createUnit,
  updateUnit,
  deleteUnit,
  createCategory,
  updateCategory,
  deleteCategory,
  createType,
  updateType,
  deleteType,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  type ConfigState,
} from "./actions";

type Unit = {
  id: string;
  code: string;
  name: string;
  active: boolean;
  productCount: number;
};
type Category = Unit & { description: string };
type ProductType = Unit & { trackStock: boolean };
type Warehouse = Unit & { address: string };

type Tab = "units" | "categories" | "types" | "warehouses";

export function ConfigClient({
  units,
  categories,
  types,
  warehouses,
}: {
  units: Unit[];
  categories: Category[];
  types: ProductType[];
  warehouses: Warehouse[];
}) {
  const [tab, setTab] = useState<Tab>("units");

  return (
    <div className="-mx-4 md:-mx-6 -mt-4 md:-mt-6">
      {/* Control panel */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-4 md:px-6 pt-3 pb-1">
          <div className="text-[15px] flex items-center gap-2">
            <Link href="/products" className="text-gray-500 hover:underline">
              ສິນຄ້າ
            </Link>
            <span className="text-gray-300">›</span>
            <span className="font-medium text-gray-800">ການກຳນົດຄ່າ</span>
          </div>
        </div>
        <div className="px-4 md:px-6 pt-2">
          <div className="flex gap-1 text-[13px]">
            <TabBtn active={tab === "units"} onClick={() => setTab("units")}>
              ໜ່ວຍວັດແທກ ({units.length})
            </TabBtn>
            <TabBtn
              active={tab === "categories"}
              onClick={() => setTab("categories")}
            >
              ໝວດໝູ່ ({categories.length})
            </TabBtn>
            <TabBtn active={tab === "types"} onClick={() => setTab("types")}>
              ປະເພດ ({types.length})
            </TabBtn>
            <TabBtn
              active={tab === "warehouses"}
              onClick={() => setTab("warehouses")}
            >
              ສາງເກັບສິນຄ້າ ({warehouses.length})
            </TabBtn>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-4">
        {tab === "units" && <UnitsPanel items={units} />}
        {tab === "categories" && <CategoriesPanel items={categories} />}
        {tab === "types" && <TypesPanel items={types} />}
        {tab === "warehouses" && <WarehousesPanel items={warehouses} />}
      </div>
    </div>
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
          ? "border-[#b91c1c] text-[#b91c1c] font-medium"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

// ──────────── Units ────────────
function UnitsPanel({ items }: { items: Unit[] }) {
  const [state, formAction, pending] = useActionState<ConfigState, FormData>(
    createUnit,
    undefined,
  );

  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
          ໜ່ວຍວັດແທກ
        </h2>
        <span className="text-[12px] text-gray-500">{items.length} ລາຍການ</span>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-3 py-2 text-left font-semibold w-28">ລະຫັດ</th>
            <th className="px-2 py-2 text-left font-semibold">ຊື່</th>
            <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ສິນຄ້າ</th>
            <th className="px-3 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((u) => (
            <UnitRow key={u.id} item={u} />
          ))}
          <tr className="bg-gray-50/60 border-t border-gray-200">
            <td colSpan={5} className="px-3 py-2">
              <form action={formAction} className="flex gap-2 items-center">
                <input
                  name="code"
                  required
                  placeholder="ລະຫັດ (PCS)"
                  className="o-field w-28"
                />
                <input
                  name="name"
                  required
                  placeholder="ຊື່ (ອັນ)"
                  className="o-field max-w-xs"
                />
                <input type="hidden" name="active" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
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

function UnitRow({ item }: { item: Unit }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [active, setActive] = useState(item.active);
  const [pending, start] = useTransition();

  const save = () => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    fd.set("active", active ? "true" : "false");
    start(async () => {
      try {
        await updateUnit(item.id, fd);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ");
      }
    });
  };

  const remove = () => {
    if (!confirm(`ລົບ "${item.name}"?`)) return;
    start(async () => {
      try {
        await deleteUnit(item.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ລົບບໍ່ສຳເລັດ");
      }
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-yellow-50/30">
        <td className="px-3 py-1.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-[#b91c1c]"
          />
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">—</td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex justify-end gap-2 text-[12px]">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="text-emerald-700 hover:text-emerald-900 font-medium"
            >
              ບັນທຶກ
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ຍົກເລີກ
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-[#b91c1c]/5 group">
      <td className="px-3 py-1.5 font-mono text-[12px] text-gray-700">
        {item.code}
      </td>
      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
      <td className="px-2 py-1.5 text-center">
        <StatusPill active={item.active} />
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">
        {item.productCount}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition text-[12px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[#b91c1c] hover:text-[#991b1b]"
          >
            ແກ້ໄຂ
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending || item.productCount > 0}
            className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title={item.productCount > 0 ? "ມີສິນຄ້າໃຊ້ຢູ່" : "ລົບ"}
          >
            ລົບ
          </button>
        </div>
      </td>
    </tr>
  );
}

// ──────────── Categories ────────────
function CategoriesPanel({ items }: { items: Category[] }) {
  const [state, formAction, pending] = useActionState<ConfigState, FormData>(
    createCategory,
    undefined,
  );

  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
          ໝວດໝູ່ສິນຄ້າ
        </h2>
        <span className="text-[12px] text-gray-500">{items.length} ລາຍການ</span>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-3 py-2 text-left font-semibold w-28">ລະຫັດ</th>
            <th className="px-2 py-2 text-left font-semibold w-48">ຊື່</th>
            <th className="px-2 py-2 text-left font-semibold">ລາຍລະອຽດ</th>
            <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ສິນຄ້າ</th>
            <th className="px-3 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <CategoryRow key={c.id} item={c} />
          ))}
          <tr className="bg-gray-50/60 border-t border-gray-200">
            <td colSpan={6} className="px-3 py-2">
              <form action={formAction} className="flex gap-2 items-center flex-wrap">
                <input
                  name="code"
                  required
                  placeholder="ລະຫັດ"
                  className="o-field w-28"
                />
                <input
                  name="name"
                  required
                  placeholder="ຊື່"
                  className="o-field max-w-[200px]"
                />
                <input
                  name="description"
                  placeholder="ລາຍລະອຽດ (optional)"
                  className="o-field flex-1 min-w-[200px]"
                />
                <input type="hidden" name="active" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
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

function CategoryRow({ item }: { item: Category }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description);
  const [active, setActive] = useState(item.active);
  const [pending, start] = useTransition();

  const save = () => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    fd.set("description", description);
    fd.set("active", active ? "true" : "false");
    start(async () => {
      try {
        await updateCategory(item.id, fd);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ");
      }
    });
  };

  const remove = () => {
    if (!confirm(`ລົບ "${item.name}"?`)) return;
    start(async () => {
      try {
        await deleteCategory(item.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ລົບບໍ່ສຳເລັດ");
      }
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-yellow-50/30">
        <td className="px-3 py-1.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-[#b91c1c]"
          />
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">—</td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex justify-end gap-2 text-[12px]">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="text-emerald-700 hover:text-emerald-900 font-medium"
            >
              ບັນທຶກ
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ຍົກເລີກ
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-[#b91c1c]/5 group">
      <td className="px-3 py-1.5 font-mono text-[12px] text-gray-700">
        {item.code}
      </td>
      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
      <td className="px-2 py-1.5 text-gray-500">{item.description || "—"}</td>
      <td className="px-2 py-1.5 text-center">
        <StatusPill active={item.active} />
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">
        {item.productCount}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition text-[12px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[#b91c1c] hover:text-[#991b1b]"
          >
            ແກ້ໄຂ
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending || item.productCount > 0}
            className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title={item.productCount > 0 ? "ມີສິນຄ້າຢູ່" : "ລົບ"}
          >
            ລົບ
          </button>
        </div>
      </td>
    </tr>
  );
}

// ──────────── Types ────────────
function TypesPanel({ items }: { items: ProductType[] }) {
  const [state, formAction, pending] = useActionState<ConfigState, FormData>(
    createType,
    undefined,
  );

  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
          ປະເພດສິນຄ້າ
        </h2>
        <span className="text-[12px] text-gray-500">{items.length} ລາຍການ</span>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-3 py-2 text-left font-semibold w-32">ລະຫັດ</th>
            <th className="px-2 py-2 text-left font-semibold">ຊື່</th>
            <th className="px-2 py-2 text-center font-semibold w-24">ນັບຄັງ</th>
            <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ສິນຄ້າ</th>
            <th className="px-3 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <TypeRow key={t.id} item={t} />
          ))}
          <tr className="bg-gray-50/60 border-t border-gray-200">
            <td colSpan={6} className="px-3 py-2">
              <form action={formAction} className="flex gap-2 items-center flex-wrap">
                <input
                  name="code"
                  required
                  placeholder="ລະຫັດ"
                  className="o-field w-32"
                />
                <input
                  name="name"
                  required
                  placeholder="ຊື່"
                  className="o-field flex-1 min-w-[200px]"
                />
                <label className="flex items-center gap-1 text-[12px] text-gray-600">
                  <input
                    type="checkbox"
                    name="trackStock"
                    defaultChecked
                    value="true"
                    className="accent-[#b91c1c]"
                  />
                  ນັບຄັງ
                </label>
                <input type="hidden" name="active" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
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

function TypeRow({ item }: { item: ProductType }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [trackStock, setTrackStock] = useState(item.trackStock);
  const [active, setActive] = useState(item.active);
  const [pending, start] = useTransition();

  const save = () => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    fd.set("trackStock", trackStock ? "true" : "false");
    fd.set("active", active ? "true" : "false");
    start(async () => {
      try {
        await updateType(item.id, fd);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ");
      }
    });
  };

  const remove = () => {
    if (!confirm(`ລົບ "${item.name}"?`)) return;
    start(async () => {
      try {
        await deleteType(item.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ລົບບໍ່ສຳເລັດ");
      }
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-yellow-50/30">
        <td className="px-3 py-1.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={trackStock}
            onChange={(e) => setTrackStock(e.target.checked)}
            className="accent-[#b91c1c]"
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-[#b91c1c]"
          />
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">—</td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex justify-end gap-2 text-[12px]">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="text-emerald-700 hover:text-emerald-900 font-medium"
            >
              ບັນທຶກ
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ຍົກເລີກ
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-[#b91c1c]/5 group">
      <td className="px-3 py-1.5 font-mono text-[12px] text-gray-700">
        {item.code}
      </td>
      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
      <td className="px-2 py-1.5 text-center">
        {item.trackStock ? (
          <span className="text-emerald-600 text-base">✓</span>
        ) : (
          <span className="text-gray-300 text-base">×</span>
        )}
      </td>
      <td className="px-2 py-1.5 text-center">
        <StatusPill active={item.active} />
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">
        {item.productCount}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition text-[12px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[#b91c1c] hover:text-[#991b1b]"
          >
            ແກ້ໄຂ
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending || item.productCount > 0}
            className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title={item.productCount > 0 ? "ມີສິນຄ້າເປັນປະເພດນີ້" : "ລົບ"}
          >
            ລົບ
          </button>
        </div>
      </td>
    </tr>
  );
}

// ──────────── Warehouses ────────────
function WarehousesPanel({ items }: { items: Warehouse[] }) {
  const [state, formAction, pending] = useActionState<ConfigState, FormData>(
    createWarehouse,
    undefined,
  );

  return (
    <div className="bg-white border border-gray-200 rounded">
      <div className="px-4 py-2.5 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-[13px] font-semibold text-gray-800 uppercase tracking-wider">
          ສາງເກັບສິນຄ້າ
        </h2>
        <span className="text-[12px] text-gray-500">{items.length} ສາງ</span>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-600">
            <th className="px-3 py-2 text-left font-semibold w-28">ລະຫັດ</th>
            <th className="px-2 py-2 text-left font-semibold w-48">ຊື່</th>
            <th className="px-2 py-2 text-left font-semibold">ທີ່ຢູ່</th>
            <th className="px-2 py-2 text-center font-semibold w-20">ສະຖານະ</th>
            <th className="px-2 py-2 text-right font-semibold w-20">ສິນຄ້າ</th>
            <th className="px-3 py-2 w-32"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((w) => (
            <WarehouseRow key={w.id} item={w} />
          ))}
          <tr className="bg-gray-50/60 border-t border-gray-200">
            <td colSpan={6} className="px-3 py-2">
              <form action={formAction} className="flex gap-2 items-center flex-wrap">
                <input
                  name="code"
                  required
                  placeholder="ລະຫັດ (MAIN)"
                  className="o-field w-28"
                />
                <input
                  name="name"
                  required
                  placeholder="ຊື່ສາງ"
                  className="o-field max-w-[200px]"
                />
                <input
                  name="address"
                  placeholder="ທີ່ຢູ່ (optional)"
                  className="o-field flex-1 min-w-[200px]"
                />
                <input type="hidden" name="active" value="true" />
                <button
                  type="submit"
                  disabled={pending}
                  className="bg-[#b91c1c] hover:bg-[#991b1b] text-white px-3 py-1 rounded text-[13px] font-medium disabled:opacity-50"
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

function WarehouseRow({ item }: { item: Warehouse }) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(item.code);
  const [name, setName] = useState(item.name);
  const [address, setAddress] = useState(item.address);
  const [active, setActive] = useState(item.active);
  const [pending, start] = useTransition();

  const save = () => {
    const fd = new FormData();
    fd.set("code", code);
    fd.set("name", name);
    fd.set("address", address);
    fd.set("active", active ? "true" : "false");
    start(async () => {
      try {
        await updateWarehouse(item.id, fd);
        setEditing(false);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ບັນທຶກບໍ່ສຳເລັດ");
      }
    });
  };

  const remove = () => {
    if (!confirm(`ລົບ "${item.name}"?`)) return;
    start(async () => {
      try {
        await deleteWarehouse(item.id);
      } catch (e) {
        alert(e instanceof Error ? e.message : "ລົບບໍ່ສຳເລັດ");
      }
    });
  };

  if (editing) {
    return (
      <tr className="border-b border-gray-100 bg-yellow-50/30">
        <td className="px-3 py-1.5">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="o-cell w-full"
          />
        </td>
        <td className="px-2 py-1.5 text-center">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-[#b91c1c]"
          />
        </td>
        <td className="px-2 py-1.5 text-right text-gray-400">—</td>
        <td className="px-3 py-1.5 text-right">
          <div className="flex justify-end gap-2 text-[12px]">
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="text-emerald-700 hover:text-emerald-900 font-medium"
            >
              ບັນທຶກ
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ຍົກເລີກ
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-gray-100 hover:bg-[#b91c1c]/5 group">
      <td className="px-3 py-1.5 font-mono text-[12px] text-gray-700">
        {item.code}
      </td>
      <td className="px-2 py-1.5 text-gray-800 font-medium">{item.name}</td>
      <td className="px-2 py-1.5 text-gray-500">{item.address || "—"}</td>
      <td className="px-2 py-1.5 text-center">
        <StatusPill active={item.active} />
      </td>
      <td className="px-2 py-1.5 text-right tabular-nums text-gray-600">
        {item.productCount}
      </td>
      <td className="px-3 py-1.5 text-right">
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition text-[12px]">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-[#b91c1c] hover:text-[#991b1b]"
          >
            ແກ້ໄຂ
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending || item.productCount > 0}
            className="text-red-600 hover:text-red-800 disabled:opacity-30 disabled:cursor-not-allowed"
            title={item.productCount > 0 ? "ມີສິນຄ້າຢູ່ສາງນີ້" : "ລົບ"}
          >
            ລົບ
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatusPill({ active }: { active: boolean }) {
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-medium border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        ໃຊ້ງານ
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[11px] font-medium border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
      ປິດ
    </span>
  );
}
