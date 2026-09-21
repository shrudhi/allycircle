"use client";

import { Bookmark } from "lucide-react";
import { toggleSaveAction } from "@/app/actions/app";

export function BookmarkButton({ allyId, saved }: { allyId: string; saved: boolean }) {
  return (
    <form action={toggleSaveAction.bind(null, allyId)}>
      <button
        type="submit"
        aria-label={saved ? "Remove bookmark" : "Bookmark"}
        className="rounded-lg p-2 text-[#a0a0a0] hover:text-[#d4af37]"
      >
        <Bookmark className={`size-4 ${saved ? "fill-[#d4af37] text-[#d4af37]" : ""}`} />
      </button>
    </form>
  );
}
