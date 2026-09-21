import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-full border border-[#2d2d2d] bg-[#1e1e1e] text-sm font-semibold text-[#d4af37]">
        AC
      </span>
      <span className="text-lg font-semibold tracking-tight">AllyCircle</span>
    </Link>
  );
}
