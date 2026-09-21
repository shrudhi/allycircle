"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function MultiSearchSelect({
  name,
  options,
  defaultValues = [],
  placeholder = "Search or add your own",
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValues?: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>(defaultValues);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return options.filter(
      (item) =>
        !selected.includes(item.label) &&
        (!needle || item.label.toLowerCase().includes(needle))
    );
  }, [options, query, selected]);

  const canAdd =
    Boolean(query.trim()) &&
    !selected.some((item) => item.toLowerCase() === query.trim().toLowerCase()) &&
    !options.some((item) => item.label.toLowerCase() === query.trim().toLowerCase());

  function add(label: string) {
    const value = label.trim();
    if (!value) return;
    setSelected((current) => (current.includes(value) ? current : [...current, value]));
    setQuery("");
    setOpen(false);
  }

  return (
    <div>
      {selected.map((item) => (
        <input key={item} type="hidden" name={name} value={item} />
      ))}
      <div className="flex flex-wrap gap-2">
        {selected.map((item) => (
          <button
            key={item}
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#161616] px-3 py-1 text-xs"
            onClick={() => setSelected((current) => current.filter((entry) => entry !== item))}
          >
            {item}
            <X className="size-3" />
          </button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className="rounded-full border border-dashed border-[#2d2d2d] px-3 py-1 text-xs text-[#a0a0a0]">
            {placeholder}
          </PopoverTrigger>
          <PopoverContent align="start" className="min-w-64 p-2">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search topics"
              className="mb-2 h-8 w-full rounded-md border border-[#2d2d2d] bg-[#111] px-2 text-sm"
              autoFocus
            />
            <div className="max-h-56 overflow-auto">
              {filtered.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-[#1e1e1e]"
                  onClick={() => add(item.label)}
                >
                  {item.label}
                </button>
              ))}
              {canAdd ? (
                <button
                  type="button"
                  className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[#d4af37]"
                  onClick={() => add(query)}
                >
                  Add “{query.trim()}”
                </button>
              ) : null}
              {filtered.length === 0 && !canAdd ? (
                <p className="px-2 py-2 text-xs text-[#a0a0a0]">No listed topics match. Add your own above.</p>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
