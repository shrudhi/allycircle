import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { isGoogleLoginConfigured } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md elevator-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create your AllyCircle account</CardTitle>
          </CardHeader>
          <CardContent>
            <AuthForm mode="signup" googleConfigured={isGoogleLoginConfigured()} />
            <p className="mt-4 text-center text-sm text-[#a0a0a0]">
              Already here?{" "}
              <Link href="/login" className="text-[#d4af37]">
                Log in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
