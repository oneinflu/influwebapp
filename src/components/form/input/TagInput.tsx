import { useState, useRef } from "react";
import type { FC } from "react";
import { CloseLineIcon } from "../../../icons";

type TagInputProps = {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
};

const TagInput: FC<TagInputProps> = ({
  values,
  onChange,
  placeholder,
  id,
  name,
  disabled = false,
  className = "",
}) => {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  function addTag(raw: string) {
    const tag = raw.trim();
    if (!tag) return;
    if (values.includes(tag)) {
      setInputValue("");
      return;
    }
    onChange([...values, tag]);
    setInputValue("");
  }

  function removeTag(idx: number) {
    const next = values.filter((_, i) => i !== idx);
    onChange(next);
    // focus input for smooth UX
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    const key = e.key;
    if (key === "Enter" || key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (key === "Backspace" && inputValue.length === 0 && values.length > 0) {
      // remove last tag on backspace when input empty
      e.preventDefault();
      removeTag(values.length - 1);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (disabled) return;
    const val = e.target.value;
    // If user types commas, split and add immediately
    if (val.includes(",")) {
      const parts = val.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) {
        const next = [...values];
        for (const p of parts) {
          if (!next.includes(p)) next.push(p);
        }
        onChange(next);
      }
      setInputValue("");
    } else {
      setInputValue(val);
    }
  }

  function handleBlur() {
    // Commit any pending text on blur
    addTag(inputValue);
  }

  const containerClasses = `flex min-h-11 w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-sm shadow-theme-xs flex-wrap dark:bg-gray-900 dark:text-white/90 ${disabled ? "bg-gray-100 border-gray-300 opacity-40 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700" : "bg-transparent text-gray-800 border-gray-300 focus-within:border-brand-300 focus-within:ring-3 focus-within:ring-brand-500/20 dark:border-gray-700"} ${className}`;

  return (
    <div className={containerClasses}>
      {values.map((tag, idx) => (
        <span
          key={`${tag}-${idx}`}
          className="inline-flex items-center gap-1 rounded-md border border-brand-300 bg-brand-50 px-2 py-1 text-xs text-brand-700 dark:border-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            onClick={() => removeTag(idx)}
            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded hover:bg-brand-100 dark:hover:bg-brand-900/30"
          >
            <CloseLineIcon className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        name={name}
        placeholder={placeholder}
        value={inputValue}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="flex-1 min-w-[10ch] bg-transparent outline-none placeholder:text-gray-400 dark:placeholder:text-white/30"
      />
    </div>
  );
};

export default TagInput;

