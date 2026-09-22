import { blockAction, reportAction } from "@/app/actions/app";
import { reportReasonLabels } from "@/lib/domain/types";

export function SafetyMenu({ userId }: { userId: string }) {
  return (
    <details className="relative">
      <summary className="cursor-pointer list-none rounded-lg p-2 text-[#a0a0a0]" aria-label="More">
        ···
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-[#2d2d2d] bg-[#1e1e1e] p-3 shadow-lg">
        <form action={blockAction}>
          <input type="hidden" name="userId" value={userId} />
          <button type="submit" className="w-full text-left text-sm text-[#e07070]">
            Block
          </button>
        </form>
        <form action={reportAction} className="mt-2 space-y-2 border-t border-[#2d2d2d] pt-2">
          <input type="hidden" name="userId" value={userId} />
          <p className="text-xs text-[#a0a0a0]">Report</p>
          <select name="reason" className="h-8 w-full rounded-md border border-[#2d2d2d] bg-[#111] px-2 text-xs">
            {Object.entries(reportReasonLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            className="min-h-16 w-full rounded-md border border-[#2d2d2d] bg-[#111] p-2 text-xs"
            placeholder="Optional details"
          />
          <button type="submit" className="text-xs text-[#d4af37]">
            Submit report
          </button>
        </form>
      </div>
    </details>
  );
}
