"use client";

import { useActionState, useState, useTransition } from "react";
import { t } from "@/lib/i18n/messages";
import {
  createCategory,
  renameCategory,
  toggleCategoryArchived,
  type LedgerState,
} from "../actions";

const tm = (k: string) => t("lo", "manage", k);

type Cat = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  archived: boolean;
  entryCount: number;
};

export function CategoryManager({ categories }: { categories: Cat[] }) {
  const income = categories.filter((c) => c.type === "INCOME");
  const expense = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Column
        title={tm("ledIncome")}
        type="INCOME"
        colour="emerald"
        categories={income}
      />
      <Column
        title={tm("ledExpense")}
        type="EXPENSE"
        colour="rose"
        categories={expense}
      />
    </div>
  );
}

function Column({
  title,
  type,
  colour,
  categories,
}: {
  title: string;
  type: "INCOME" | "EXPENSE";
  colour: "emerald" | "rose";
  categories: Cat[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded p-4">
      <h2 className={`text-[13px] font-medium mb-3 text-${colour}-700`}>
        {title}
      </h2>
      <AddRow type={type} />
      <div className="mt-3 divide-y divide-gray-100">
        {categories.map((c) => (
          <CategoryRow key={c.id} cat={c} />
        ))}
        {categories.length === 0 && (
          <p className="text-[12px] text-gray-400 italic py-2">{tm("ledCatNone")}</p>
        )}
      </div>
    </div>
  );
}

function AddRow({ type }: { type: "INCOME" | "EXPENSE" }) {
  const [state, action, pending] = useActionState<LedgerState, FormData>(
    createCategory,
    undefined,
  );
  return (
    <form action={action} className="flex gap-2">
      <input type="hidden" name="type" value={type} />
      <input
        type="text"
        name="name"
        placeholder={tm("ledCatNewPh")}
        required
        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-[13px]"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded text-[13px] font-medium disabled:opacity-50"
      >
        {pending ? "..." : tm("ledCatAdd")}
      </button>
      {state?.error && (
        <span className="text-[11px] text-red-600 self-center">
          {state.error}
        </span>
      )}
    </form>
  );
}

function CategoryRow({ cat }: { cat: Cat }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [renameState, renameAction] = useActionState<LedgerState, FormData>(
    renameCategory.bind(null, cat.id),
    undefined,
  );

  if (editing) {
    return (
      <form
        action={(fd) => {
          renameAction(fd);
          setEditing(false);
        }}
        className="py-2 flex gap-2"
      >
        <input
          type="text"
          name="name"
          defaultValue={cat.name}
          autoFocus
          className="flex-1 px-2 py-1 border border-gray-300 rounded text-[13px]"
        />
        <button
          type="submit"
          className="px-2 py-1 bg-slate-900 text-white rounded text-[12px]"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="px-2 py-1 border border-gray-300 rounded text-[12px]"
        >
          ✕
        </button>
        {renameState?.error && (
          <span className="text-[11px] text-red-600 self-center">
            {renameState.error}
          </span>
        )}
      </form>
    );
  }

  return (
    <div className="py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`text-[13px] ${cat.archived ? "text-gray-400 line-through" : "text-gray-800"}`}
        >
          {cat.name}
        </span>
        <span className="text-[10px] text-gray-400">({cat.entryCount})</span>
        {cat.archived && (
          <span className="text-[10px] uppercase text-gray-400">archived</span>
        )}
      </div>
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-[11px] px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded"
        >
          {tm("ledCatEdit")}
        </button>
        <button
          type="button"
          onClick={() => start(() => toggleCategoryArchived(cat.id))}
          disabled={pending}
          className="text-[11px] px-2 py-0.5 text-gray-600 hover:bg-gray-100 rounded"
        >
          {cat.archived ? tm("ledCatRestore") : tm("ledCatArchive")}
        </button>
      </div>
    </div>
  );
}
