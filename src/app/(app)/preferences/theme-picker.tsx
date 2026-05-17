"use client";

import { useActionState } from "react";
import type { Theme } from "@/lib/theme";
import { updateTheme, type ThemeState } from "./actions";

type ThemeOption = { value: Theme; label: string };

export function ThemePicker({
  current,
  options,
}: {
  current: Theme;
  options: ThemeOption[];
}) {
  const [state, formAction, pending] = useActionState<ThemeState, FormData>(
    updateTheme,
    undefined,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <select
        name="theme"
        defaultValue={current}
        className="o-input w-44"
        disabled={pending}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="bg-odoo text-white px-3 py-1 rounded text-[12px] font-medium hover:bg-odoo-hover disabled:opacity-50"
      >
        {pending ? "..." : "✓"}
      </button>
      {state?.ok && (
        <span className="text-[11px] text-emerald-700">{state.ok}</span>
      )}
      {state?.error && (
        <span className="text-[11px] text-red-700">{state.error}</span>
      )}
    </form>
  );
}
