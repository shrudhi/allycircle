import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { ResetForm } from "@/components/reset-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md elevator-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Choose a new password</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-sm text-[#a0a0a0]">Loading reset form…</p>}>
              <ResetForm />
            </Suspense>
            <p className="mt-4 text-center text-sm">
              <Link href="/login" className="text-[#d4af37]">
                Back to log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
