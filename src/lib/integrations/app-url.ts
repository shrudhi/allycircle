export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:43131").replace(/\/$/, "");
}
