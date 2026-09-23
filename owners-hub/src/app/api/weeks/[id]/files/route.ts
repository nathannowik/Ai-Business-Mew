import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { MAX_UPLOAD_BYTES, isAllowedUpload, saveUpload } from "@/lib/storage";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const week = await db.lessonWeek.findUnique({ where: { id } });
  if (!week) return NextResponse.json({ error: "Week not found" }, { status: 404 });

  const form = await req.formData();
  const caption = String(form.get("caption") ?? "").trim();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });

  for (const f of files) {
    if (f.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: `${f.name} is too big (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).` }, { status: 400 });
    }
    if (!isAllowedUpload(f.name, f.type)) {
      return NextResponse.json({ error: `${f.name}: videos and audio aren't supported yet.` }, { status: 400 });
    }
  }
  for (const f of files) {
    const storedName = await saveUpload(Buffer.from(await f.arrayBuffer()), f.name);
    await db.attachment.create({
      data: {
        weekId: id,
        uploaderId: user.id,
        fileName: f.name.slice(0, 200),
        storedName,
        mimeType: f.type || "application/octet-stream",
        size: f.size,
        caption,
      },
    });
  }
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true, count: files.length });
}
