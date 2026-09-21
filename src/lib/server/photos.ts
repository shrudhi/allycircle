import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { productConfig } from "@/lib/config/product";
import { getDb, getNow } from "@/lib/db";
import { profiles } from "@/lib/db/schema";

export function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function saveProfilePhoto(userId: string, file: File | null) {
  if (!file || file.size === 0) return null;
  if (file.size > productConfig.photoMaxBytes) {
    throw new Error("Please use an image under 2 MB.");
  }
  if (!productConfig.photoMimeTypes.includes(file.type as (typeof productConfig.photoMimeTypes)[number])) {
    throw new Error("Please use a JPG, PNG, or WebP photo.");
  }
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const dir = path.join(process.cwd(), ".data", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${userId}.${ext}`;
  const filepath = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
  const db = await getDb();
  const now = await getNow();
  const photoPath = `/api/photos/${userId}?v=${now.getTime()}`;
  await db.update(profiles).set({ photoPath, updatedAt: now }).where(eq(profiles.userId, userId));
  return photoPath;
}
