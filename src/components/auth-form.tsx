"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export function AuthForm({
  mode,
  googleConfigured,
}: {
  mode: "login" | "signup";
  googleConfigured: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);

  async function onSubmit(formData: FormData) {
    setError("");
    setPending(true);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const name = String(formData.get("name") || "");
    try {
      if (mode === "signup") {
        if (!accepted) {
          setError("Please accept the Terms and Privacy Policy to continue.");
          setPending(false);
          return;
        }
        const result = await authClient.signUp.email({
          email,
          password,
          name: name || email.split("@")[0],
          callbackURL: "/onboarding",
        });
        if (result.error) {
          const code = (result.error as { code?: string }).code || "";
          const message = result.error.message || "";
          if (code === "USER_ALREADY_EXISTS" || /already exists|already registered/i.test(message)) {
            setError("That email already has an account. Use Log in instead.");
          } else if (/database|connect|timeout|ECONN/i.test(message)) {
            setError("The live database isn’t connected yet. Add DATABASE_URL in Vercel and redeploy.");
          } else {
            setError("We couldn’t create that account. Use a new email, a password of at least 8 characters, and tick the terms box.");
          }
          setPending(false);
          return;
        }
        router.push("/onboarding");
        return;
      }
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: "/home",
      });
      if (result.error) {
        setError("We couldn’t log you in. Check your email and password and try again.");
        setPending(false);
        return;
      }
      router.push("/home");
    } catch {
      setError("Something went wrong. Please try again in a moment.");
      setPending(false);
    }
  }

  return (
    <form action={onSubmit} className="space-y-4">
      {mode === "signup" ? (
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required placeholder="Your name" />
        </div>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required placeholder="you@email.com" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      {mode === "signup" ? (
        <label className="flex items-start gap-2 text-sm text-[#a0a0a0]">
          <Checkbox checked={accepted} onCheckedChange={(value) => setAccepted(Boolean(value))} />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-[#d4af37]">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[#d4af37]">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
      ) : (
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="text-[#d4af37]">
            Forgot password?
          </Link>
        </div>
      )}
      {error ? <p className="text-sm text-[#e07070]">{error}</p> : null}
      <Button type="submit" className="h-10 w-full gold-outline" disabled={pending}>
        {mode === "signup" ? "Create account" : "Log in"}
      </Button>
      {googleConfigured ? (
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          onClick={async () => {
            setError("");
            setPending(true);
            try {
              const result = await authClient.signIn.social({ provider: "google", callbackURL: "/home" });
              if (result.error) {
                setError("Google sign-in didn’t complete. Use a test-user Gmail, or try again in a moment.");
                setPending(false);
              }
            } catch {
              setError("Google sign-in didn’t complete. Check that this site URL is allowed in Google Cloud.");
              setPending(false);
            }
          }}
        >
          Continue with Google
        </Button>
      ) : (
        <p className="text-center text-xs text-[#a0a0a0]">
          Google sign-in is ready in the product. In this environment, use email until Google is connected.
        </p>
      )}
    </form>
  );
}
