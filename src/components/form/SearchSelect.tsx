import React, { useEffect, useMemo, useRef, useState } from "react";

type Option = { value: string; label: string };

type SearchSelectProps = {
  options: Option[];
  placeholder?: string;
  defaultValue?: string;
  className?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function SearchSelect({
  options,
  placeholder = "Select an option",
  defaultValue = "",
  className = "",
  onChange,
  disabled = false,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
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
        setFocusedIndex(-1);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleOutside);
      return () => document.removeEventListener("mousedown", handleOutside);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      // focus search on open
      inputRef.current?.focus();
    }
  }, [open]);

  const selectValue = (v: string) => {
    setValue(v);
    onChange(v);
    setOpen(false);
    setQuery("");
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    switch (e.key) {
      case "Escape":
        setOpen(false);
        setFocusedIndex(-1);
        break;
      case "ArrowDown":
        setFocusedIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        break;
      case "ArrowUp":
        setFocusedIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        break;
      case "Enter":
        if (focusedIndex >= 0 && filtered[focusedIndex]) {
          selectValue(filtered[focusedIndex].value);
        }
        break;
    }
  };

  const currentLabel = options.find((o) => o.value === value)?.label || "";

  return (
    <div className="w-full" ref={containerRef}>
      <div
        className="relative z-50 inline-block w-full"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((o) => !o)}
          onKeyDown={handleKeyDown}
          className={`h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs outline-hidden focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 ${
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          } ${className}`}
          aria-label={placeholder}
        >
          <span className={`${value ? "text-gray-800 dark:text-white/90" : "text-gray-400 dark:text-gray-400"}`}>
            {currentLabel || placeholder}
          </span>
        </button>

        {open && (
          <>
            {/* Overlay to prevent seeing/interaction with underlying inputs */}
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => {
                setOpen(false);
                setFocusedIndex(-1);
              }}
              aria-hidden="true"
            />
            <div
              className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
              role="listbox"
              aria-label={placeholder}
            >
              <div className="p-2 border-b border-gray-200 dark:border-gray-800">
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-9 w-full rounded-md border border-gray-300 bg-transparent px-3 text-sm placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  placeholder="Search..."
                  aria-label="Search options"
                />
              </div>
              <div className="max-h-60 overflow-y-auto">
                {filtered.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">No results</div>
                ) : (
                  filtered.map((opt, index) => {
                    const isFocused = index === focusedIndex;
                    const isSelected = opt.value === value;
                    return (
                      <div
                        key={opt.value}
                        className={`w-full cursor-pointer border-b border-gray-200 last:border-b-0 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-white/10 ${
                          isFocused ? "bg-gray-50 dark:bg-white/10" : ""
                        } ${isSelected ? "bg-gray-100 dark:bg-white/5" : ""}`}
                        onClick={() => selectValue(opt.value)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="px-3 py-2 text-sm text-gray-800 dark:text-white/90">{opt.label}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
