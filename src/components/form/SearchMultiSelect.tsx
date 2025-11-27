import React, { useEffect, useMemo, useRef, useState } from "react";
import { CloseLineIcon } from "../../icons";

type Option = { value: string; label: string };

type Props = {
  options?: Option[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export default function SearchMultiSelect({
  options = [],
  values,
  onChange,
  placeholder = "Select...",
  className = "",
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function addValue(raw: string) {
    const v = raw.trim();
    if (!v) return;
    if (values.includes(v)) { setQuery(""); return; }
    onChange([...values, v]);
    setQuery("");
  }

  function removeValue(idx: number) {
    const next = values.filter((_, i) => i !== idx);
    onChange(next);
  }

  function toggleValue(v: string) {
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addValue(query);
    } else if (e.key === "Backspace" && query.length === 0 && values.length > 0) {
      e.preventDefault();
      removeValue(values.length - 1);
    }
  }

  const containerClasses = `flex min-h-11 w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-sm shadow-theme-xs flex-wrap dark:bg-gray-900 dark:text-white/90 ${disabled ? "bg-gray-100 border-gray-300 opacity-40 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700" : "bg-transparent text-gray-800 border-gray-300 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/20 dark:border-gray-700"} ${className}`;

  return (
    <div className="w-full" ref={containerRef}>
      <div className={containerClasses} onClick={() => !disabled && setOpen(true)}>
        {values.map((v, idx) => (
          <span
            key={`${v}-${idx}`}
            className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-xs text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
          >
            {v}
            <button
              type="button"
              aria-label={`Remove ${v}`}
              onClick={(e) => { e.stopPropagation(); removeValue(idx); }}
              className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-brand-100 dark:hover:bg-brand-900/30"
            >
              <CloseLineIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 min-w-[10ch] bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-white/30"
        />
      </div>

      {open && (
        <div className="relative z-50 mt-1">
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute left-0 top-full z-50 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
            <div className="p-2 border-b border-gray-200 dark:border-gray-800">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              />
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No results</div>
              ) : (
                filtered.map((opt) => {
                  const selected = values.includes(opt.value);
                  return (
                    <div
                      key={opt.value}
                      className={`w-full cursor-pointer border-b border-gray-200 last:border-b-0 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/10 ${selected ? "bg-gray-100 dark:bg-white/5" : ""}`}
                      onClick={() => toggleValue(opt.value)}
                    >
                      <div className="px-3 py-2 text-sm text-gray-800 dark:text-white/90 flex items-center justify-between">
                        <span>{opt.label}</span>
                        {selected && <span className="text-theme-xs text-brand-600">Selected</span>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {/* Add custom entry */}
            {query.trim() && (
              <button
                type="button"
                onClick={() => addValue(query)}
                className="m-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/10"
              >
                Add "{query.trim()}"
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
