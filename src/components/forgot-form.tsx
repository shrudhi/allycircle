"use client";

import { authClient } from "@/lib/auth/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function ForgotForm() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      action={async (formData) => {
        setError("");
        setDone(false);
        try {
          const result = await authClient.requestPasswordReset({
            email: String(formData.get("email") || ""),
            redirectTo: "/reset-password",
          });
          if (result.error) {
            setError("We couldn’t start a reset. Try Log in with Google, or check that this email already has an account.");
            return;
          }
          setDone(true);
        } catch {
          setError("We couldn’t start a reset. Try Log in with Google instead.");
        }
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <button type="submit" className="h-10 w-full rounded-lg bg-[#d4af37] text-sm font-medium text-[#111]">
        Send reset link
      </button>
      {error ? <p className="text-sm text-[#e07070]">{error}</p> : null}
      {done ? (
        <p className="text-sm text-[#a0a0a0]">
          If that email is on AllyCircle, a reset was requested. If nothing arrives, a sending domain is not verified
          yet — use <span className="text-white">Continue with Google</span> on the log in page instead.
        </p>
      ) : (
        <p className="text-sm text-[#a0a0a0]">
          Reset mail only arrives after Resend has a verified domain. Until then, log in with Google.
        </p>
      )}
    </form>
  );
}
