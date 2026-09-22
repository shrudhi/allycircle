import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getOrCreateConversation, listConversations, listMessages } from "@/lib/server/sessions";
import { ChatThread } from "@/components/chat-thread";
import { formatInTimeZone } from "@/lib/domain/timezone";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ to?: string; id?: string }>;
}) {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const params = await searchParams;
  let activeId = params.id;
  if (params.to && !activeId) {
    const conversation = await getOrCreateConversation(params.to);
    activeId = conversation.id;
  }
  const conversations = await listConversations();
  const thread = activeId ? await listMessages(activeId) : conversations[0] ? await listMessages(conversations[0].id) : null;
  const zone = current.profile.timezone;

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">Inbox</p>
      <h1 className="mt-3 font-serif text-4xl">Messages</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="space-y-2">
          {conversations.length === 0 ? <p className="text-sm text-[#a0a0a0]">No conversations yet.</p> : null}
          {conversations.map((item) => {
            const selected = thread?.conversationId === item.id;
            return (
              <a
                key={item.id}
                href={`/messages?id=${item.id}`}
                className={`block rounded-xl border p-3 text-sm ${
                  selected ? "border-[#d4af37] bg-[#1e1e1e]" : "border-[#2d2d2d] bg-[#1e1e1e]"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{item.otherName}</span>
                  {item.unread ? <span className="size-2 rounded-full bg-[#d4af37]" /> : null}
                </span>
                <p className="mt-1 line-clamp-2 text-xs text-[#a0a0a0]">{item.lastPreview || "No messages yet"}</p>
                <p className="mt-2 text-[11px] text-[#8a8a8a]">{formatInTimeZone(item.lastMessageAt, zone)}</p>
              </a>
            );
          })}
        </aside>
        {thread ? (
          <ChatThread
            currentUserId={current.id}
            otherName={thread.otherName}
            timezone={zone}
            messages={thread.messages}
            canReply={thread.canReply}
            otherId={thread.otherId}
            next={`/messages?id=${thread.conversationId}`}
          />
        ) : (
          <p className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-6 text-sm text-[#a0a0a0]">Choose a conversation.</p>
        )}
      </div>
    </AppShell>
  );
}
