import fs from "fs";
import path from "path";
import { getDb } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const db = await getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  if (!profile?.photoPath) return new Response("Not found", { status: 404 });
  const dir = path.join(process.cwd(), ".data", "uploads");
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const filepath = path.join(dir, `${userId}.${ext}`);
    if (fs.existsSync(filepath)) {
      const type = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
      return new Response(fs.readFileSync(filepath), {
        headers: { "Content-Type": type, "Cache-Control": "private, max-age=3600" },
      });
    }
  }
  return new Response("Not found", { status: 404 });
}
