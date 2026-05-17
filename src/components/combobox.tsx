"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type ComboboxOption = {
  value: string;
  /** Main display label */
  label: string;
  /** Optional left-side code/badge (e.g. SKU) */
  badge?: string;
  /** Optional right-side meta info (e.g. stock count) */
  meta?: string;
  /** Optional muted hint line below label */
  hint?: string;
  /** Optional searchable string. Defaults to badge + label. */
  search?: string;
  disabled?: boolean;
};

type Props = {
  options: ComboboxOption[];
  /** Form field name (uncontrolled mode, renders hidden input) */
  name?: string;
  /** Initial value for uncontrolled mode */
  defaultValue?: string;
  /** Controlled value */
  value?: string;
  /** Controlled change handler */
  onChange?: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  /** Tailwind class for trigger button */
  triggerClassName?: string;
};

export function Combobox({
  options,
  name,
  defaultValue = "",
  value: controlledValue,
  onChange,
  placeholder = "ເລືອກ...",
  emptyText = "ບໍ່ພົບລາຍການ",
  required,
  disabled,
  className,
  triggerClassName,
}: Props) {
  const isControlled = controlledValue !== undefined;
  const [inner, setInner] = useState(defaultValue);
  const value = isControlled ? controlledValue! : inner;

  const setValue = (v: string) => {
    if (!isControlled) setInner(v);
    onChange?.(v);
  };

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return options;
    return options.filter((o) => {
      const text = (
        o.search ?? `${o.badge ?? ""} ${o.label}`
      ).toLowerCase();
      return text.includes(q);
    });
  }, [options, query]);

  const activeHighlight = Math.min(
    highlight,
    Math.max(0, filtered.length - 1),
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${activeHighlight}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeHighlight, open]);

  const selected = options.find((o) => o.value === value);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeHighlight];
      if (opt && !opt.disabled) {
        setValue(opt.value);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  function toggleOpen() {
    if (disabled) return;
    setOpen((current) => {
      const next = !current;
      if (next) {
        setQuery("");
        setHighlight(0);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
      return next;
    });
  }

  return (
    <div ref={rootRef} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`w-full flex items-center justify-between gap-2 text-left ${
          triggerClassName ??
          "px-2 py-1.5 border-b border-gray-300 bg-transparent hover:border-gray-400 focus:outline-none focus:border-odoo focus:bg-white text-[13px]"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex-1 truncate flex items-center gap-1.5">
          {selected ? (
            <>
              {selected.badge && (
                <span className="font-mono text-[11px] text-gray-500">
                  {selected.badge}
                </span>
              )}
              <span className="text-gray-800">{selected.label}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </span>
        <svg
          className={`w-3 h-3 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          fill="currentColor"
          viewBox="0 0 12 12"
        >
          <path d="M3 4.5l3 3 3-3z" />
        </svg>
      </button>

      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
          required={required}
        />
      )}

      {open && (
        <div className="absolute z-30 mt-1 w-full min-w-[260px] bg-white border border-gray-200 rounded shadow-lg">
          <div className="p-1.5 border-b border-gray-100 relative">
            <svg
              className="absolute left-3.5 top-3 w-3.5 h-3.5 text-gray-400"
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
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onKey}
              placeholder="ຄົ້ນຫາ..."
              className="w-full pl-7 pr-2 py-1 text-[13px] border border-transparent rounded focus:outline-none focus:border-odoo"
            />
          </div>
          <ul
            ref={listRef}
            className="max-h-64 overflow-auto py-1"
            role="listbox"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-gray-400 text-[12px] text-center">
                {emptyText}
              </li>
            ) : (
              filtered.map((o, i) => {
                const isSelected = o.value === value;
                const isHighlighted = i === activeHighlight;
                return (
                  <li key={o.value} data-idx={i}>
                    <button
                      type="button"
                      disabled={o.disabled}
                      onMouseEnter={() => setHighlight(i)}
                      onClick={() => {
                        if (o.disabled) return;
                        setValue(o.value);
                        setOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-[13px] flex items-center gap-2 transition ${
                        o.disabled
                          ? "opacity-50 cursor-not-allowed"
                          : "cursor-pointer"
                      } ${
                        isHighlighted
                          ? "bg-odoo/10 text-odoo"
                          : "text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      {isSelected && (
                        <span className="text-odoo text-xs">✓</span>
                      )}
                      {o.badge && (
                        <span className="font-mono text-[11px] text-gray-500 flex-shrink-0">
                          {o.badge}
                        </span>
                      )}
                      <span className="flex-1 truncate">
                        <span className="block truncate">{o.label}</span>
                        {o.hint && (
                          <span className="block text-[11px] text-gray-500 truncate">
                            {o.hint}
                          </span>
                        )}
                      </span>
                      {o.meta && (
                        <span className="text-[11px] text-gray-500 flex-shrink-0">
                          {o.meta}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
