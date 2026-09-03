"use client";

export function SearchInput({
  value,
  onChange,
  onClear,
  onSubmit,
  placeholder = "Поиск по объектам…",
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  onSubmit?: () => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400">
        ⌕
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit?.();
        }}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-8 pr-8 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-300"
      />
      {value && (
        <button
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
          aria-label="Очистить"
        >
          ✕
        </button>
      )}
    </div>
  );
}
