import { processJobs } from "@/lib/server/jobs";
import { getSessionUser } from "@/lib/auth/session";

async function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization") || "";
  const query = new URL(request.url).searchParams.get("secret");
  if (secret && (header === `Bearer ${secret}` || query === secret)) return true;
  const current = await getSessionUser();
  if (current) return true;
  return process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  if (!(await authorized(request))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  await processJobs();
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  return GET(request);
}
