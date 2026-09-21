"use client";

import { useEffect } from "react";

export function JobsPoller() {
  useEffect(() => {
    const tick = () => {
      void fetch("/api/jobs");
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);
  return null;
}
