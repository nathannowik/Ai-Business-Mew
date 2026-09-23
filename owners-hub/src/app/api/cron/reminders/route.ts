// Optional hook for an external scheduler (e.g. cron-job.org) in case the host
// sleeps and the in-process scheduler can't run: GET /api/cron/reminders?key=CRON_SECRET
import { NextResponse } from "next/server";
import { sendDailyReminders } from "@/lib/notify";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const key = new URL(req.url).searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!secret || key !== secret) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const sent = await sendDailyReminders();
  return NextResponse.json({ ok: true, sent });
}
