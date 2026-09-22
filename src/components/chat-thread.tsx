import { replyMessageAction } from "@/app/actions/app";
import { formatDateOnly, formatTimeOnly } from "@/lib/domain/timezone";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: Date;
};

function dayKey(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayLabel(date: Date, timeZone: string) {
  const key = dayKey(date, timeZone);
  const today = dayKey(new Date(), timeZone);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = dayKey(yesterdayDate, timeZone);
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return formatDateOnly(date, timeZone);
}

export function ChatThread({
  currentUserId,
  otherName,
  timezone,
  messages,
  canReply,
  otherId,
  next,
}: {
  currentUserId: string;
  otherName: string;
  timezone: string;
  messages: ChatMessage[];
  canReply: boolean;
  otherId: string;
  next: string;
}) {
  let lastDay = "";

  return (
    <div className="flex min-h-[28rem] flex-col rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e]">
      <div className="border-b border-[#2d2d2d] px-5 py-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[#d4af37]">Conversation</p>
        <h2 className="mt-1 font-serif text-2xl">{otherName}</h2>
      </div>
      <div className="flex-1 space-y-3 overflow-auto px-4 py-5">
        {messages.length === 0 ? (
          <p className="text-sm text-[#a0a0a0]">No messages yet. Say hello when you’re ready.</p>
        ) : null}
        {messages.map((message) => {
          const mine = message.senderId === currentUserId;
          const day = dayKey(message.createdAt, timezone);
          const showDay = day !== lastDay;
          lastDay = day;
          return (
            <div key={message.id}>
              {showDay ? (
                <p className="mb-3 mt-2 text-center text-[11px] uppercase tracking-[0.14em] text-[#8a8a8a]">
                  {dayLabel(message.createdAt, timezone)}
                </p>
              ) : null}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] md:max-w-[70%]", mine ? "items-end text-right" : "items-start text-left")}>
                  <p
                    className={cn(
                      "whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6",
                      mine ? "rounded-br-md bg-[#d4af37] text-[#111]" : "rounded-bl-md bg-[#111] text-white ring-1 ring-[#2d2d2d]"
                    )}
                  >
                    {message.body}
                  </p>
                  <p className="mt-1 text-[11px] text-[#8a8a8a]">{formatTimeOnly(message.createdAt, timezone)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {canReply ? (
        <form action={replyMessageAction} className="flex gap-2 border-t border-[#2d2d2d] p-3">
          <input type="hidden" name="otherId" value={otherId} />
          <input type="hidden" name="next" value={next} />
          <input
            name="body"
            autoComplete="off"
            placeholder={`Message ${otherName}`}
            className="h-11 flex-1 rounded-full border border-[#2d2d2d] bg-[#111] px-4 text-sm"
            required
          />
          <button type="submit" className="h-11 rounded-full bg-[#d4af37] px-5 text-sm font-medium text-[#111]">
            Send
          </button>
        </form>
      ) : (
        <p className="border-t border-[#2d2d2d] px-4 py-3 text-sm text-[#a0a0a0]">New messages aren’t available with this person.</p>
      )}
    </div>
  );
}
