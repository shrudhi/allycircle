"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SearchOption = { value: string; label: string };

export function SearchSelect({
  name,
  options,
  defaultValue,
  placeholder = "Search and select",
  allowCustom = false,
  className,
}: {
  name: string;
  options: SearchOption[];
  defaultValue?: string;
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
}) {
  const initial = options.find((item) => item.value === defaultValue) ||
    (defaultValue ? { value: defaultValue, label: defaultValue } : null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchOption | null>(initial);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (item) => item.label.toLowerCase().includes(needle) || item.value.toLowerCase().includes(needle)
    );
  }, [options, query]);

  const canAdd = allowCustom && query.trim() && !filtered.some((item) => item.label.toLowerCase() === query.trim().toLowerCase());

  return (
    <div className={cn("relative", className)}>
      <input type="hidden" name={name} value={selected?.value || ""} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-left text-sm"
        >
          <span className={selected ? "truncate text-white" : "text-[#a0a0a0]"}>
            {selected?.label || placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-[#a0a0a0]" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] min-w-64 p-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type to search"
            className="mb-2 h-8 w-full rounded-md border border-[#2d2d2d] bg-[#111] px-2 text-sm"
            autoFocus
          />
          <div className="max-h-56 overflow-auto">
            {filtered.map((item) => (
              <button
                key={item.value}
                type="button"
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#1e1e1e]"
                onClick={() => {
                  setSelected(item);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
            {canAdd ? (
              <button
                type="button"
                className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[#d4af37]"
                onClick={() => {
                  const value = query.trim();
                  setSelected({ value, label: value });
                  setQuery("");
                  setOpen(false);
                }}
              >
                Use “{query.trim()}”
              </button>
            ) : null}
            {filtered.length === 0 && !canAdd ? (
              <p className="px-2 py-2 text-xs text-[#a0a0a0]">No matches. Try another search.</p>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
