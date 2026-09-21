import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { listMySessions } from "@/lib/server/sessions";
import { listRequests } from "@/lib/server/requests";
import { formatInTimeZone } from "@/lib/domain/timezone";

export default async function PracticePage() {
  const current = await getSessionUser();
  if (!current?.profile) redirect("/login");
  const [sessions, requests] = await Promise.all([listMySessions(), listRequests()]);
  const upcoming = sessions.filter((row) => row.state === "scheduled" || row.state === "awaiting_attendance");
  const history = sessions.filter((row) => ["completed", "did_not_happen", "cancelled"].includes(row.state));

  return (
    <AppShell name={current.profile.fullName}>
      <h1 className="text-3xl font-semibold">My Practice</h1>
      <section className="mt-8">
        <h2 className="text-lg font-medium">Upcoming</h2>
        <div className="mt-3 space-y-3">
          {upcoming.length === 0 ? <p className="text-sm text-[#a0a0a0]">No confirmed sessions yet.</p> : null}
          {upcoming.map((session) => (
            <Link key={session.id} href={`/practice/sessions/${session.id}`} className="gold-outline block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
              <p className="font-medium">{session.otherName}</p>
              <p className="text-sm text-[#a0a0a0]">{formatInTimeZone(session.startUtc, current.profile.timezone)} · {session.format.replaceAll("_", " ")}</p>
              {session.joinOpen ? <p className="mt-2 text-sm text-[#d4af37]">Join Session is available</p> : null}
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-medium">Requests</h2>
        <div className="mt-3 space-y-3">
          {requests.slice(0, 12).map((request) => (
            <Link key={request.id} href={`/practice/requests/${request.id}`} className="block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
              <p className="font-medium">{request.otherName}</p>
              <p className="text-sm text-[#a0a0a0]">
                {request.direction} · {request.state.replaceAll("_", " ")} · {request.format.replaceAll("_", " ")}
              </p>
            </Link>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-lg font-medium">History</h2>
        <div className="mt-3 space-y-3">
          {history.map((session) => (
            <Link key={session.id} href={`/practice/sessions/${session.id}`} className="block rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-4">
              <p className="font-medium">{session.otherName}</p>
              <p className="text-sm text-[#a0a0a0]">
                {formatInTimeZone(session.startUtc, current.profile.timezone)} · {session.state.replaceAll("_", " ")}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
