"use client";

import { authClient } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function ForgotForm() {
  const [done, setDone] = useState(false);
  return (
    <form
      action={async (formData) => {
        await authClient.requestPasswordReset({
          email: String(formData.get("email") || ""),
          redirectTo: "/reset-password",
        });
        setDone(true);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <Button className="w-full" type="submit">
        Send reset link
      </Button>
      {done ? (
        <p className="text-sm text-[#a0a0a0]">
          If that email is on AllyCircle, you’ll get a reset link. Check the development inbox if you’re testing locally.
        </p>
      ) : null}
    </form>
  );
}
