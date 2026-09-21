import Link from "next/link";
import { Bell, CalendarDays, Home, MessageCircle, Search, Settings } from "lucide-react";
import { Logo } from "@/components/logo";
import { Initials } from "@/components/initials";
import { getSessionUser } from "@/lib/auth/session";
import { getAttentionCounts } from "@/lib/server/attention";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/app/actions/auth";

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
              return (
                <Link
                  key={item.href}
                  href={item.badge === "practice" && count ? "/practice?tab=requests" : item.href}
                  className="gold-outline flex items-center rounded-lg px-3 py-2 text-sm text-[#a0a0a0] hover:text-white"
                >
                  {item.label}
                  <CountBadge count={count} />
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              aria-label="Notifications"
              className="gold-outline relative flex size-9 items-center justify-center rounded-lg text-[#a0a0a0]"
            >
              <Bell className="size-4" />
              {counts.unreadNotifications > 0 ? (
                <span className="absolute right-1 top-1 size-2 rounded-full bg-[#d4af37]" />
              ) : null}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="gold-outline rounded-full">
                <Initials name={displayName} photoPath={current?.profile?.photoPath} size="sm" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-52">
                <DropdownMenuItem>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="size-4" /> Profile & Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/record">Your record</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/settings#calendar">Calendar connection</Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link href="/notifications">Notifications</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={signOutAction}>
                  <button type="submit" className="flex w-full px-1.5 py-1 text-left text-sm">
                    Sign out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <nav className="flex items-center justify-around border-t border-[#2d2d2d] px-2 py-2 md:hidden">
          {nav.map((item) => {
            const count =
              item.badge === "messages" ? counts.unreadMessages : item.badge === "practice" ? counts.practiceAction : 0;
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 text-[11px] text-[#a0a0a0]">
                <span className="relative">
                  <item.icon className="size-4" />
                  {count > 0 ? <span className="absolute -right-1 -top-1 size-1.5 rounded-full bg-[#d4af37]" /> : null}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 elevator-rise">{children}</main>
    </div>
  );
}
