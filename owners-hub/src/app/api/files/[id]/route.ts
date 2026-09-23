import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readUpload } from "@/lib/storage";

const INLINE = /^(image\/(png|jpe?g|gif|webp|avif)|application\/pdf|text\/plain)$/;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response("Not signed in", { status: 401 });
  const { id } = await params;
  const a = await db.attachment.findUnique({ where: { id } });
  if (!a) return new Response("Not found", { status: 404 });
  let data: Buffer;
  try {
    data = await readUpload(a.storedName);
  } catch {
    return new Response("File missing from storage", { status: 404 });
  }
  const download = new URL(req.url).searchParams.has("download") || !INLINE.test(a.mimeType);
  const safeName = a.fileName.replace(/["\\\r\n]/g, "_");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": INLINE.test(a.mimeType) ? a.mimeType : "application/octet-stream",
      "Content-Length": String(data.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(a.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
