import { useEffect, useMemo } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import Label from "./Label";
import { CalenderIcon } from "../../icons";
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
}: PropsType) {
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const uaMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    return coarse || uaMobile;
  }, []);

  const formatDate = (d?: DateOption) => {
    if (!d) return "";
    if (typeof d === "string") return d;
    if (d instanceof Date) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    }
    // flatpickr also accepts arrays; return first if present
    if (Array.isArray(d)) {
      const first = d[0];
      if (first instanceof Date) {
        const yyyy = first.getFullYear();
        const mm = String(first.getMonth() + 1).padStart(2, "0");
        const dd = String(first.getDate()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd}`;
      }
      if (typeof first === "string") return first;
    }
    return "";
  };

  useEffect(() => {
    if (isMobile) return; // Use native input on mobile; skip flatpickr init
    const flatPickr = flatpickr(`#${id}`, {
      mode: mode || "single",
      static: true,
      monthSelectorType: "static",
      dateFormat: "Y-m-d",
      defaultDate,
      onChange,
    });

    return () => {
      if (!Array.isArray(flatPickr)) {
        flatPickr.destroy();
      }
    };
  }, [mode, onChange, id, defaultDate, isMobile]);

  return (
    <div>
      {label && <Label htmlFor={id}>{label}</Label>}

      <div className="relative">
        {isMobile ? (
          <input
            id={id}
            type="date"
            value={formatDate(defaultDate)}
            onChange={(e) => {
              const val = e.target.value;
              const date = val ? new Date(val) : undefined;
              if (onChange) {
                const hooks = Array.isArray(onChange) ? onChange : [onChange];
                hooks.forEach((fn) => {
                  // Provide 4 args to satisfy Flatpickr Hook signature
                  fn(
                    date ? [date] : [],
                    val,
                    undefined as unknown as never,
                    undefined as unknown as never
                  );
                });
              }
            }}
            placeholder={placeholder || "YYYY-MM-DD"}
            className="h-11 w-full rounded-lg border px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700 dark:focus:border-brand-800"
          />
        ) : (
          <input
            id={id}
            placeholder={placeholder}
            className="h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3  dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30  bg-transparent text-gray-800 border-gray-300 focus:border-brand-300 focus:ring-brand-500/20 dark:border-gray-700  dark:focus:border-brand-800"
          />
        )}

        <span className="absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400">
          <CalenderIcon className="size-6" />
        </span>
      </div>
    </div>
  );
}
