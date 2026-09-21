import Link from "next/link";
import { Logo } from "@/components/logo";
import { ForgotForm } from "@/components/forgot-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md elevator-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Reset your password</CardTitle>
          </CardHeader>
          <CardContent>
            <ForgotForm />
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
