"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LOCALES, type Locale } from "@/lib/i18n/messages";
import { updateLocale, type LocaleState } from "./actions";

export function LocalePicker({ current }: { current: Locale }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<LocaleState, FormData>(
    updateLocale,
    undefined,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [router, state?.ok]);

  return (
    <form ref={formRef} action={formAction} className="flex items-center justify-end gap-2">
      <select
        name="locale"
        defaultValue={current}
        className="o-field w-44 text-right"
        disabled={pending}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {LOCALES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.native} ({l.label})
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="sr-only"
      >
        Save
      </button>
      {pending && <span className="text-[11px] text-gray-400">...</span>}
      {state?.ok && (
        <span className="text-[11px] text-emerald-700">{state.ok}</span>
      )}
      {state?.error && (
        <span className="text-[11px] text-red-700">{state.error}</span>
      )}
    </form>
  );
}
