"use client";

import { useEffect } from "react";

export function JobsPoller() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      void fetch("/api/jobs");
    };
    const start = window.setTimeout(tick, 60000);
    const id = window.setInterval(tick, 180000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, []);
  return null;
}
