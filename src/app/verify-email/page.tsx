import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { emailVerificationRequired } from "@/lib/auth/email-policy";
import { Logo } from "@/components/logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function VerifyEmailPage() {
  const current = await getSessionUser();
  if (!current) redirect("/login");
  if (current.emailVerified) {
    redirect(current.profile?.onboardingComplete ? "/home" : "/onboarding");
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center px-4">
      <div className="w-full rounded-2xl border border-[#2d2d2d] bg-[#1e1e1e] p-8">
        <Logo href="/" />
        <h1 className="mt-6 text-2xl font-semibold">Confirm your email</h1>
        <p className="mt-3 text-sm text-[#a0a0a0]">
          We sent a confirmation link to <span className="text-white">{current.email}</span>. Confirm it before
          finding allies or sending practice requests.
        </p>
        {emailVerificationRequired() ? null : (
          <p className="mt-3 text-sm text-[#a0a0a0]">
            In this preview, mail is stored locally. Open the development inbox if you need the link.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dev/inbox" className={cn(buttonVariants(), "gold-outline")}>
            Open development inbox
          </Link>
          <Link href="/home" className={cn(buttonVariants({ variant: "outline" }))}>
            Try Home again
          </Link>
        </div>
      </div>
    </div>
  );
}
