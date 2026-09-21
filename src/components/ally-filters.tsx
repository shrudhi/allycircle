"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { professionalFields } from "@/lib/config/fields";
import { suggestedTopics } from "@/lib/config/topics";
import { experienceBands } from "@/lib/domain/scheduling";

const days = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

export type AllyFilterValues = {
  tab: string;
  q?: string;
  field?: string;
  exp?: string;
  company?: string;
  topic?: string;
  avail?: string;
  format?: string;
};

function hrefWith(values: AllyFilterValues, patch: Partial<AllyFilterValues>) {
  const next = { ...values, ...patch };
  const params = new URLSearchParams();
  params.set("tab", next.tab || "for-you");
  if (next.q) params.set("q", next.q);
  if (next.field) params.set("field", next.field);
  if (next.exp) params.set("exp", next.exp);
  if (next.company) params.set("company", next.company);
  if (next.topic) params.set("topic", next.topic);
  if (next.avail) params.set("avail", next.avail);
  if (next.format) params.set("format", next.format);
  return `/allies?${params.toString()}`;
}

export function AllyFilters({ values }: { values: AllyFilterValues }) {
  const router = useRouter();
  const chips: { key: string; label: string; href: string }[] = [];
  if (values.field) {
    const label = professionalFields.find((field) => field.id === values.field)?.label || values.field;
    chips.push({ key: "field", label, href: hrefWith(values, { field: "" }) });
  }
  if (values.exp) {
    const label = experienceBands.find((band) => band.value === values.exp)?.label || values.exp;
    chips.push({ key: "exp", label, href: hrefWith(values, { exp: "" }) });
  }
  if (values.company) chips.push({ key: "company", label: values.company, href: hrefWith(values, { company: "" }) });
  if (values.topic) chips.push({ key: "topic", label: values.topic, href: hrefWith(values, { topic: "" }) });
  if (values.avail === "today") chips.push({ key: "avail", label: "Available today", href: hrefWith(values, { avail: "" }) });
  else if (values.avail === "week") chips.push({ key: "avail", label: "This week", href: hrefWith(values, { avail: "" }) });
  else if (values.avail && days.find((day) => day.value === values.avail)) {
    chips.push({
      key: "avail",
      label: days.find((day) => day.value === values.avail)!.label,
      href: hrefWith(values, { avail: "" }),
    });
  }
  if (values.format === "interview_me") chips.push({ key: "format", label: "Interview Me", href: hrefWith(values, { format: "" }) });
  if (values.format === "reciprocal_swap") chips.push({ key: "format", label: "Reciprocal Swap", href: hrefWith(values, { format: "" }) });

  return (
    <form
      className="mt-6 space-y-3 rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        router.push(
          hrefWith(values, {
            q: String(data.get("q") || ""),
            field: String(data.get("field") || ""),
            exp: String(data.get("exp") || ""),
            company: String(data.get("company") || ""),
            topic: String(data.get("topic") || ""),
            avail: String(data.get("avail") || ""),
            format: String(data.get("format") || ""),
          })
        );
      }}
    >
      <input type="hidden" name="tab" value={values.tab} />
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs text-[#a0a0a0]">
          Role / Domain
          <select name="field" defaultValue={values.field || ""} className="mt-1 h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm text-white">
            <option value="">All domains</option>
            {professionalFields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#a0a0a0]">
          Relevant experience
          <select name="exp" defaultValue={values.exp || ""} className="mt-1 h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm text-white">
            <option value="">Any</option>
            {experienceBands.map((band) => (
              <option key={band.value} value={band.value}>
                {band.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#a0a0a0]">
          Company
          <input name="company" defaultValue={values.company || ""} placeholder="Type a company" className="mt-1 h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-sm text-white" />
        </label>
        <label className="text-xs text-[#a0a0a0]">
          Can interview me on
          <input name="topic" defaultValue={values.topic || ""} list="topic-options" placeholder="Product Sense, Behavioral…" className="mt-1 h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-sm text-white" />
          <datalist id="topic-options">
            {suggestedTopics.map((topic) => (
              <option key={topic.id} value={topic.label} />
            ))}
          </datalist>
        </label>
        <label className="text-xs text-[#a0a0a0]">
          Availability
          <select name="avail" defaultValue={values.avail || ""} className="mt-1 h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm text-white">
            <option value="">Any</option>
            <option value="today">Available today</option>
            <option value="week">This week</option>
            {days.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#a0a0a0]">
          Practice format
          <select name="format" defaultValue={values.format || ""} className="mt-1 h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-2 text-sm text-white">
            <option value="">Anyone who can interview me</option>
            <option value="interview_me">Interview Me</option>
            <option value="reciprocal_swap">Reciprocal Swap</option>
          </select>
        </label>
      </div>
      <input name="q" defaultValue={values.q || ""} placeholder="Search by name, role, company, or topic" className="h-10 w-full rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-sm" />
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="rounded-lg bg-[#d4af37] px-4 py-2 text-sm font-medium text-[#111]">
          Apply filters
        </button>
        {chips.length ? (
          <Link href={`/allies?tab=${values.tab || "for-you"}`} className="text-sm text-[#a0a0a0]">
            Clear all
          </Link>
        ) : null}
      </div>
      {chips.length ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <Link key={chip.key} href={chip.href} className="rounded-full border border-[#d4af37]/40 px-3 py-1 text-xs text-[#d4af37]">
              {chip.label} ×
            </Link>
          ))}
        </div>
      ) : null}
    </form>
  );
}
