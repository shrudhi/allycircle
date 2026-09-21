import { MoreHorizontal } from "lucide-react";
import { blockAction, reportAction } from "@/app/actions/app";
import { reportReasonLabels } from "@/lib/domain/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SafetyMenu({ userId }: { userId: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-lg p-2 text-[#a0a0a0]" aria-label="More">
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56 p-2">
        <form action={blockAction} className="px-1 py-1">
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" className="w-full text-left text-sm text-[#e07070]">
            Block
          </button>
        </form>
        <form action={reportAction} className="mt-2 space-y-2 border-t border-[#2d2d2d] px-1 pt-2">
          <input type="hidden" name="userId" value={userId} />
          <p className="text-xs text-[#a0a0a0]">Report</p>
          <select name="reason" className="h-8 w-full rounded-md border border-[#2d2d2d] bg-[#111] px-2 text-xs">
            {Object.entries(reportReasonLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea name="description" className="min-h-16 w-full rounded-md border border-[#2d2d2d] bg-[#111] p-2 text-xs" placeholder="Optional details" />
          <button type="submit" className="text-xs text-[#d4af37]">
            Submit report
          </button>
        </form>
        <DropdownMenuItem className="hidden" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
