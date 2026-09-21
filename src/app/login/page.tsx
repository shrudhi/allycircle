import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthForm } from "@/components/auth-form";
import { isGoogleLoginConfigured } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md elevator-rise">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
          </CardHeader>
          <CardContent>
            <AuthForm mode="login" googleConfigured={isGoogleLoginConfigured()} />
            <p className="mt-4 text-center text-sm text-[#a0a0a0]">
              New here?{" "}
              <Link href="/signup" className="text-[#d4af37]">
                Sign up
              </Link>
            </p>
            {process.env.NODE_ENV !== "production" ? (
              <p className="mt-6 rounded-lg border border-[#2d2d2d] bg-[#161616] p-3 text-xs text-[#a0a0a0]">
                Local test accounts use password <span className="text-white">Practice123!</span> — for example{" "}
                <span className="text-white">avery.chen@test.allycircle.local</span>
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
