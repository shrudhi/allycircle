import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listNotifications } from "@/lib/server/sessions";
import { markReadAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function NotificationsPage() {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const items = await listNotifications();
  return (
    <AppShell name={current.profile.fullName}>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Notifications</h1>
        <form action={markReadAction}>
          <Button variant="outline">Mark all read</Button>
        </form>
      </div>
      <div className="mt-6 space-y-3">
        {items.length === 0 ? <p className="text-[#a0a0a0]">You’re all caught up.</p> : null}
        {items.map((item) => (
          <Link key={item.id} href={item.href || "/home"} className="block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
            <p className="font-medium">{item.title}</p>
            <p className="mt-1 text-sm text-[#a0a0a0]">{item.body}</p>
            {!item.readAt ? <p className="mt-2 text-xs text-[#d4af37]">New</p> : null}
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
