"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") || "";
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!token) {
    return (
      <p className="text-sm text-[#a0a0a0]">
        Open the reset link from your email. In this preview, that link lands in the{" "}
        <a href="/dev/inbox" className="text-[#d4af37]">
          development inbox
        </a>
        .
      </p>
    );
  }

  return (
    <form
      action={async (formData) => {
        setError("");
        setPending(true);
        const password = String(formData.get("password") || "");
        const confirm = String(formData.get("confirm") || "");
        if (password !== confirm) {
          setError("Those passwords don’t match.");
          setPending(false);
          return;
        }
        const result = await authClient.resetPassword({
          newPassword: password,
          token,
        });
        if (result.error) {
          setError("That reset link is invalid or expired. Request a new one.");
          setPending(false);
          return;
        }
        router.push("/login");
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input id="confirm" name="confirm" type="password" required minLength={8} />
      </div>
      {error ? <p className="text-sm text-[#e07070]">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={pending}>
        Save new password
      </Button>
    </form>
  );
}
