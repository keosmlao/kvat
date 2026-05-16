"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { CustomerFormState } from "./actions";
import { ImageUpload } from "@/components/image-upload";

type Action = (prev: CustomerFormState, fd: FormData) => Promise<CustomerFormState>;

type Initial = {
  code: string;
  name: string;
  imageUrl: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  provinceId: string | null;
  districtId: string | null;
  villageId: string | null;
};

type Province = { id: string; name: string };
type District = { id: string; name: string; provinceId: string };
type Village = { id: string; name: string; districtId: string };

export function CustomerForm({
  action,
  initial,
  chatter,
  provinces,
  districts,
  villages,
}: {
  action: Action;
  initial?: Initial;
  chatter?: React.ReactNode;
  provinces: Province[];
  districts: District[];
  villages: Village[];
}) {
  const [state, formAction, pending] = useActionState<CustomerFormState, FormData>(
    action,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  const [name, setName] = useState(initial?.name ?? "");
  const [tab, setTab] = useState<"contact" | "billing" | "notes">("contact");
  const [provinceId, setProvinceId] = useState(initial?.provinceId ?? "");
  const [districtId, setDistrictId] = useState(initial?.districtId ?? "");
  const [villageId, setVillageId] = useState(initial?.villageId ?? "");
  const isNew = !initial;

  const districtOptions = districts.filter((d) => d.provinceId === provinceId);
  const villageOptions = villages.filter((v) => v.districtId === districtId);

  return (
    <>
    <form action={formAction}>
      {/* Breadcrumb */}
      <div className="text-xs text-gray-500 px-1 mb-2">
        <Link href="/customers" className="hover:underline">
          ລູກຄ້າ
        </Link>
        <span className="mx-1.5 text-gray-400">›</span>
        <span className="text-gray-700">
          {isNew ? "ໃໝ່" : initial?.name ?? "ແກ້ໄຂ"}
        </span>
      </div>

      {/* Action bar */}
      <div className="bg-white border border-gray-200 rounded-t-md px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#b91c1c] text-white px-3 py-1 rounded text-[13px] font-medium hover:bg-[#991b1b] disabled:opacity-50 transition tracking-wide"
          >
            {pending ? "ກຳລັງບັນທຶກ..." : "ບັນທຶກ"}
          </button>
          <Link
            href="/customers"
            className="border border-gray-300 text-gray-700 px-3 py-1 rounded text-[13px] font-medium hover:bg-gray-50 transition"
          >
            ຍົກເລີກ
          </Link>
        </div>
      </div>

      {/* Sheet */}
      <div className="bg-white border-x border-b border-gray-200 rounded-b-md shadow-sm">
        <div className="px-6 md:px-10 pt-6 pb-6">
          {/* Top: avatar + title */}
          <div className="flex gap-6 items-start mb-6">
            <ImageUpload
              name="image"
              defaultUrl={initial?.imageUrl}
              shape="circle"
              size="md"
              placeholder="ຮູບ"
            />

            <div className="flex-1 min-w-0">
              <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                ຊື່ລູກຄ້າ
              </label>
              <input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ຊື່ ຫລື ບໍລິສັດ..."
                className="w-full text-[24px] font-light text-gray-900 border-0 border-b border-gray-200 hover:border-gray-400 focus:border-[#b91c1c] focus:outline-none focus:ring-0 pb-1 mb-1 bg-transparent"
              />
              {fe.name && (
                <p className="text-xs text-red-600 mb-2">{fe.name[0]}</p>
              )}
              <div className="text-[12px] text-gray-500">
                ບຸກຄົນ ຫລື ນິຕິບຸກຄົນ
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-3">
            <div className="flex gap-1 text-[13px]">
              <TabBtn active={tab === "contact"} onClick={() => setTab("contact")}>
                ຂໍ້ມູນຕິດຕໍ່
              </TabBtn>
              <TabBtn active={tab === "billing"} onClick={() => setTab("billing")}>
                ຂໍ້ມູນບິນ
              </TabBtn>
              <TabBtn active={tab === "notes"} onClick={() => setTab("notes")}>
                ໝາຍເຫດພາຍໃນ
              </TabBtn>
            </div>
          </div>

          {tab === "contact" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              <div>
                <Field label="ລະຫັດ" required error={fe.code?.[0]}>
                  <input
                    name="code"
                    required
                    defaultValue={initial?.code}
                    className="o-field"
                    placeholder="ເຊັ່ນ: C0001"
                  />
                </Field>
                <Field label="ໂທລະສັບ" error={fe.phone?.[0]}>
                  <input
                    name="phone"
                    defaultValue={initial?.phone ?? ""}
                    className="o-field"
                    placeholder="020 5xxx xxxx"
                  />
                </Field>
                <Field label="Email" error={fe.email?.[0]}>
                  <input
                    name="email"
                    type="email"
                    defaultValue={initial?.email ?? ""}
                    className="o-field"
                    placeholder="email@example.com"
                  />
                </Field>
              </div>
              <div>
                <Field
                  label="ເລກອາກອນ"
                  error={fe.taxId?.[0]}
                  hint="(TIN)"
                >
                  <input
                    name="taxId"
                    defaultValue={initial?.taxId ?? ""}
                    className="o-field"
                  />
                </Field>
              </div>
            </div>
          )}

          {tab === "contact" && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <h3 className="text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-2">
                ທີ່ຢູ່
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1">
                <Field label="ແຂວງ">
                  <select
                    name="provinceId"
                    value={provinceId}
                    onChange={(e) => {
                      setProvinceId(e.target.value);
                      setDistrictId("");
                      setVillageId("");
                    }}
                    className="o-field"
                  >
                    <option value="">— ເລືອກແຂວງ —</option>
                    {provinces.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ເມືອງ">
                  <select
                    name="districtId"
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value);
                      setVillageId("");
                    }}
                    disabled={!provinceId}
                    className="o-field"
                  >
                    <option value="">
                      {provinceId ? "— ເລືອກເມືອງ —" : "ເລືອກແຂວງກ່ອນ"}
                    </option>
                    {districtOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="ບ້ານ">
                  <select
                    name="villageId"
                    value={villageId}
                    onChange={(e) => setVillageId(e.target.value)}
                    disabled={!districtId}
                    className="o-field"
                  >
                    <option value="">
                      {districtId
                        ? villageOptions.length === 0
                          ? "ບໍ່ມີຂໍ້ມູນ — ກວດທີ່ admin"
                          : "— ເລືອກບ້ານ —"
                        : "ເລືອກເມືອງກ່ອນ"}
                    </option>
                    {villageOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="mt-2 grid grid-cols-[140px_1fr] items-start gap-2">
                <label className="text-[13px] text-gray-600 pt-1">
                  ລາຍລະອຽດ
                </label>
                <div>
                  <textarea
                    name="address"
                    rows={2}
                    defaultValue={initial?.address ?? ""}
                    className="o-field w-full resize-none"
                    placeholder="ບ້ານເລກທີ, ຖະໜົນ, ຊອຍ ..."
                  />
                  {fe.address && (
                    <p className="text-xs text-red-600 mt-0.5">
                      {fe.address[0]}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === "billing" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
              <div>
                <Field label="ເງື່ອນໄຂການຊຳລະ">
                  <input className="o-field" placeholder="ຈ່າຍທັນທີ" disabled />
                </Field>
                <Field label="ສະກຸນເງິນ">
                  <input className="o-field" placeholder="LAK" disabled />
                </Field>
              </div>
              <div>
                <Field label="ບັນຊີຮັບ">
                  <input className="o-field" placeholder="ບັນຊີລູກໜີ້" disabled />
                </Field>
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-gray-500 font-medium mb-1">
                ໝາຍເຫດພາຍໃນ
              </label>
              <textarea
                rows={5}
                className="o-field w-full resize-none"
                placeholder="ຂໍ້ມູນເພີ່ມເຕີມສຳລັບພະນັກງານ..."
                disabled
              />
            </div>
          )}

          {state?.error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {state.error}
            </div>
          )}
        </div>
      </div>
    </form>
    {chatter ? (
      <div className="mt-4 bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        {chatter}
      </div>
    ) : (
      <div className="mt-4 bg-white border border-gray-200 rounded-md px-6 md:px-10 py-3 text-[12px] text-gray-400 italic">
        ບັນທຶກກ່ອນຈຶ່ງສາມາດສົ່ງຂໍ້ຄວາມ ຫລື ສ້າງກິດຈະກຳໄດ້
      </div>
    )}
    </>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2 py-1">
      <label className="text-[13px] text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {hint && (
          <span className="text-[11px] text-gray-400 ml-1">{hint}</span>
        )}
      </label>
      <div>
        {children}
        {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
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
