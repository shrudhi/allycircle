import { Bell, CalendarDays, Home, MessageCircle, Search } from "lucide-react";
import { Logo } from "@/components/logo";
import { Initials } from "@/components/initials";
import { getSessionUser } from "@/lib/auth/session";
import { getAttentionCounts } from "@/lib/server/attention";

const nav = [
  { href: "/home", label: "Home", icon: Home, badge: "none" as const },
  { href: "/allies", label: "Find People", icon: Search, badge: "none" as const },
  { href: "/practice", label: "Sessions", icon: CalendarDays, badge: "practice" as const },
  { href: "/messages", label: "Messages", icon: MessageCircle, badge: "messages" as const },
];

function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-[#d4af37] px-1.5 text-[10px] font-semibold text-[#111]">
      {count > 9 ? "9+" : count}
    </span>
  );
}

export async function AppShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name?: string;
}) {
  const current = await getSessionUser();
  const displayName = name || current?.profile?.fullName || current?.name || "A";
  let counts = { unreadMessages: 0, unreadNotifications: 0, practiceAction: 0 };
  if (current?.profile?.onboardingComplete) {
    counts = await getAttentionCounts();
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#2d2d2d] bg-[#111111]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo href="/home" />
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => {
              const count =
                item.badge === "messages" ? counts.unreadMessages : item.badge === "practice" ? counts.practiceAction : 0;
              const href = item.badge === "practice" && count ? "/practice?tab=requests" : item.href;
              return (
                <a
                  key={item.href}
                  href={href}
                  className="gold-outline flex items-center rounded-lg px-3 py-2 text-sm text-[#a0a0a0] hover:text-white"
                >
                  {item.label}
                  <CountBadge count={count} />
                </a>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/notifications"
              aria-label="Notifications"
              className="gold-outline relative flex size-9 items-center justify-center rounded-lg text-[#a0a0a0]"
            >
              <Bell className="size-4" />
              {counts.unreadNotifications > 0 ? (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-[#d4af37]" />
              ) : null}
            </a>
            <a href="/settings" className="gold-outline rounded-full" aria-label="Profile and settings">
              <Initials name={displayName} photoPath={current?.profile?.photoPath} size="sm" />
            </a>
          </div>
        </div>
        <nav className="flex items-center justify-around border-t border-[#2d2d2d] px-2 py-2 md:hidden">
          {nav.map((item) => {
            const count =
              item.badge === "messages" ? counts.unreadMessages : item.badge === "practice" ? counts.practiceAction : 0;
            return (
              <a key={item.href} href={item.href} className="flex flex-col items-center gap-1 text-[11px] text-[#a0a0a0]">
                <span className="relative">
                  <item.icon className="size-4" />
                  {count > 0 ? <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-[#d4af37]" /> : null}
                </span>
                {item.label}
              </a>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 elevator-rise">{children}</main>
    </div>
  );
}
