"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export type SearchFacet = {
  /** URL param name */
  key: string;
  /** What's visible in the bubble (e.g., "Customer: Acme") */
  label: string;
  /** Current value (for display + removal) */
  value: string;
};

export type SearchOption = {
  /** URL param name */
  key: string;
  /** Group label (e.g., "ຄົ້ນຫາ ເລກບິນ") */
  label: string;
  /** Optional predefined values (categorical) */
  values?: { value: string; label: string }[];
};

/**
 * Odoo-like search bar with facet bubbles.
 * Active filters appear as removable chips. Click empty input to choose facet.
 */
export function OdooSearch({
  facets,
  options,
  placeholder = "ຄົ້ນຫາ...",
}: {
  facets: SearchFacet[];
  options: SearchOption[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const navigate = (params: URLSearchParams) => {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const currentParams = () => {
    const sp = new URLSearchParams();
    facets.forEach((f) => sp.set(f.key, f.value));
    return sp;
  };

  const applyFacet = (key: string, value: string) => {
    const sp = currentParams();
    if (value) sp.set(key, value);
    else sp.delete(key);
    navigate(sp);
    setOpen(false);
    setQuery("");
  };

  const removeFacet = (key: string) => {
    const sp = currentParams();
    sp.delete(key);
    navigate(sp);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      // Default to first option's key (typically a "q" search-anywhere)
      const def = options[0];
      if (def) applyFacet(def.key, query.trim());
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    } else if (
      e.key === "Backspace" &&
      query === "" &&
      facets.length > 0
    ) {
      removeFacet(facets[facets.length - 1].key);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative flex items-center gap-1.5 flex-wrap px-2 py-1 border border-gray-300 rounded bg-white focus-within:border-[#b91c1c] focus-within:ring-2 focus-within:ring-[#b91c1c]/15 transition w-full max-w-md min-w-[240px]"
    >
      <svg
        className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
        />
      </svg>

      {facets.map((f) => (
        <span key={f.key} className="o-facet">
          {f.label}
          <button
            type="button"
            onClick={() => removeFacet(f.key)}
            className="o-facet-x"
            aria-label={`Remove ${f.label}`}
          >
            ×
          </button>
        </span>
      ))}

      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={facets.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[60px] outline-none bg-transparent text-[13px] py-0.5"
      />

      {open && (
        <div className="absolute left-0 top-full mt-1 w-full bg-white border border-gray-200 rounded shadow-lg z-30 py-1 text-[13px] max-h-72 overflow-auto">
          {options.map((opt) => {
            if (opt.values) {
              const filtered = opt.values.filter((v) =>
                v.label.toLowerCase().includes(query.toLowerCase()),
              );
              if (filtered.length === 0 && query) return null;
              return (
                <div key={opt.key} className="px-2 py-1">
                  <div className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                    {opt.label}
                  </div>
                  {filtered.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      onClick={() => applyFacet(opt.key, v.value)}
                      className="block w-full text-left px-2 py-1 rounded hover:bg-[#b91c1c]/10 hover:text-[#b91c1c]"
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              );
            }
            // Free-text option
            if (!query) return null;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => applyFacet(opt.key, query.trim())}
                className="block w-full text-left px-3 py-1.5 hover:bg-[#b91c1c]/10 hover:text-[#b91c1c]"
              >
                <span className="text-[10px] uppercase tracking-wider text-gray-400">
                  {opt.label}
                </span>{" "}
                <span className="font-medium">&ldquo;{query}&rdquo;</span>
              </button>
            );
          })}
          {!query && options.every((o) => !o.values) && (
            <div className="px-3 py-2 text-[12px] text-gray-400">
              ພິມເພື່ອຄົ້ນຫາ...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
