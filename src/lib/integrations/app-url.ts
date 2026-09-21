export function appUrl() {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  if (explicit && !explicit.includes("placeholder")) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  return "http://127.0.0.1:43131";
}
