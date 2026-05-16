import "server-only";
import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];

/**
 * Save an uploaded image file to public/uploads/.
 * Returns the public URL path (e.g. "/uploads/abc.png"), or null if no file provided.
 */
export async function saveUploadedImage(
  file: File | null | undefined,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("ຮູບພາບຕ້ອງເປັນ PNG, JPG, WEBP ຫລື GIF");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("ຮູບໃຫຍ່ເກີນ 2MB");
  }

  const ext = (() => {
    const fromName = path.extname(file.name).toLowerCase();
    if (fromName && [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(fromName)) {
      return fromName;
    }
    return "." + (file.type.split("/")[1] || "png");
  })();

  const filename = `${crypto.randomUUID()}${ext}`;
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);
  return `/uploads/${filename}`;
}

/** Delete an uploaded image (no-op if path is invalid). */
export async function deleteUploadedImage(url?: string | null) {
  if (!url || !url.startsWith("/uploads/")) return;
  try {
    const filename = path.basename(url);
    await unlink(path.join(process.cwd(), "public", "uploads", filename));
  } catch {
    // ignore — file may already be deleted
  }
}
