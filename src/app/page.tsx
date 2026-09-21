import Link from "next/link";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const help = [
  "Sync calendars without the back-and-forth",
  "Sit with people in your actual field",
  "Leave as a better interviewer and a better candidate",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
        <Logo />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#a0a0a0] hover:text-white">
            Log in
          </Link>
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "gold-outline")}>
            Sign up
          </Link>
        </div>
      </header>
      <section className="mx-auto max-w-3xl px-4 pb-24 pt-16 text-center elevator-rise">
        <p className="mb-4 text-sm tracking-[0.18em] text-[#d4af37] uppercase">Your network. Your prep team.</p>
        <h1 className="font-serif text-4xl tracking-tight text-white md:text-6xl">
          Sit with people who actually do the work.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-[#a0a0a0]">
          Stop rehearsing interviews in front of a mirror. AllyCircle connects you with operators in your field
          to book slots, run mock interviews, and hit your next role with a real prep team.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 gold-outline")}>
            Create your profile
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6")}>
            Log in
          </Link>
        </div>
        <ul className="mx-auto mt-16 grid gap-4 text-left sm:grid-cols-3">
          {help.map((item) => (
            <li key={item} className="rounded-xl border border-[#2d2d2d] bg-[#1e1e1e] p-5 text-sm text-[#a0a0a0]">
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
