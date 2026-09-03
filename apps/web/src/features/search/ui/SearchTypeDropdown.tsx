"use client";

import { useEffect, useRef, useState } from "react";
import { SEARCH_TYPES, type SearchTypeId } from "@/shared/api/nspd";

export function SearchTypeDropdown({
  value,
  onChange,
}: {
  value: SearchTypeId;
  onChange: (id: SearchTypeId) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SEARCH_TYPES.find((t) => t.id === value) ?? SEARCH_TYPES[0]!;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDocClick);
        document.removeEventListener("keydown", onKey);
      };
    }
  }, [open]);

  const isDefault = value === 1;

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={`Фильтр: ${current.label}`}
        aria-label={`Фильтр поиска: ${current.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative flex h-9 w-9 items-center justify-center rounded-lg border bg-white hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 ${isDefault ? "border-zinc-200 text-zinc-600" : "border-zinc-900 text-zinc-900 bg-zinc-50"}`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 6h18l-7 8v5l-3 1.5V14z" />
        </svg>
        {!isDefault && (
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-zinc-900 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lg">
          <div className="px-2 py-1 text-[10px] font-semibold tracking-wide text-zinc-400 uppercase">
            Тип поиска
          </div>
          <div className="space-y-0.5">
            {SEARCH_TYPES.map((t) => {
              const active = t.id === value;
              return (
                <label
                  key={t.id}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-zinc-50 ${active ? "bg-zinc-900 text-white hover:bg-zinc-900" : "text-zinc-700"}`}
                >
                  <input
                    type="radio"
                    name="searchType"
                    value={t.id}
                    checked={active}
                    onChange={() => {
                      onChange(t.id);
                      setOpen(false);
                    }}
                    className="h-3.5 w-3.5 accent-zinc-900"
                  />
                  <span
                    className={`flex-1 text-sm ${active ? "text-white" : "text-zinc-800"}`}
                  >
                    {t.label}
                  </span>
                  {active && <span className="text-xs">✓</span>}
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
