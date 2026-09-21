"use client";

import { useState } from "react";
import { SearchSelect } from "@/components/search-select";
import { getTimeZones } from "@/lib/domain/timezone";

export function TimezoneSelect({ name, defaultValue }: { name: string; defaultValue?: string }) {
  const [zone] = useState(
    () => defaultValue || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  );
  const options = getTimeZones().map((item) => ({ value: item, label: item.replaceAll("_", " ") }));
  return (
    <div className="space-y-2">
      <SearchSelect
        key={zone}
        name={name}
        options={options}
        defaultValue={zone}
        placeholder="We’ll detect your timezone"
      />
      <p className="text-xs text-[#a0a0a0]">
        We pick this from your current location. Change it if you travel or want times in another zone.
      </p>
    </div>
  );
}
