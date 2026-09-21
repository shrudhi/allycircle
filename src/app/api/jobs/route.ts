import { processJobs } from "@/lib/server/jobs";

export async function GET() {
  await processJobs();
  return Response.json({ ok: true });
}
