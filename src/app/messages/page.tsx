import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { getOrCreateConversation, listConversations, listMessages } from "@/lib/server/sessions";
import { replyMessageAction, sendMessageAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";

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
  const thread = activeId ? await listMessages(activeId) : null;

  return (
    <AppShell name={current.profile.fullName}>
      <p className="text-xs uppercase tracking-[0.22em] text-[#d4af37]">Inbox</p>
      <h1 className="mt-3 font-serif text-4xl">Messages</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="space-y-2">
          {conversations.length === 0 ? <p className="text-sm text-[#a0a0a0]">No conversations yet.</p> : null}
          {conversations.map((item) => (
            <Link key={item.id} href={`/messages?id=${item.id}`} className="block rounded-xl border border-[#2d2d2d] bg-[#1e1e1e] p-3 text-sm">
              <span className="flex items-center justify-between gap-2">
                {item.otherName}
                {item.unread ? <span className="size-2 rounded-full bg-[#d4af37]" /> : null}
              </span>
              {item.unread ? <p className="mt-1 text-xs text-[#d4af37]">New message</p> : null}
              <p className="mt-2 text-xs text-[#a0a0a0]">{item.lastPreview}</p>
              <p className="mt-2">
                <Link href={`/practice/with/${item.otherId}`} className="text-xs text-[#d4af37]">
                  Open sessions
                </Link>
              </p>
            </Link>
          ))}
        </aside>
        <section className="rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
          {thread ? (
            <>
              <h2 className="font-medium">{thread.otherName}</h2>
              <div className="mt-4 max-h-[50vh] space-y-3 overflow-auto">
                {thread.messages.map((message) => (
                  <div key={message.id} className={message.senderId === current.id ? "text-right" : "text-left"}>
                    <p className="inline-block rounded-xl border border-[#2d2d2d] px-3 py-2 text-sm">{message.body}</p>
                  </div>
                ))}
              </div>
              {thread.canReply ? (
                <form action={replyMessageAction} className="mt-4 flex gap-2">
                  <input type="hidden" name="otherId" value={thread.otherId} />
                  <input type="hidden" name="conversationId" value={thread.conversationId} />
                  <input name="body" className="h-10 flex-1 rounded-lg border border-[#2d2d2d] bg-[#111] px-3 text-sm" required />
                  <Button>Send</Button>
                </form>
              ) : (
                <p className="mt-4 text-sm text-[#a0a0a0]">New messages aren’t available with this person.</p>
              )}
            </>
          ) : params.to ? (
            <form action={sendMessageAction} className="space-y-3">
              <input type="hidden" name="otherId" value={params.to} />
              <textarea name="body" className="min-h-28 w-full rounded-lg border border-[#2d2d2d] bg-[#111] p-3" required />
              <Button>Send message</Button>
            </form>
          ) : (
            <p className="text-sm text-[#a0a0a0]">Choose a conversation.</p>
          )}
        </section>
      </div>
    </AppShell>
  );
}
