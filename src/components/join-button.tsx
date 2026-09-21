"use client";

import { joinSessionAction } from "@/app/actions/app";
import { Button } from "@/components/ui/button";

export function JoinButton({ sessionId, pulse }: { sessionId: string; pulse: boolean }) {
  return (
    <Button
      className={pulse ? "gold-outline live-pulse" : "gold-outline"}
      onClick={async () => {
        const result = await joinSessionAction(sessionId);
        window.open(result.url, "_blank", "noopener,noreferrer");
      }}
    >
      Join Session
    </Button>
  );
}
