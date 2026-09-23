// /projects/bible-study/on/2026-10-05 → that week's plan (created on demand).
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isValidDay, weekStartOf } from "@/lib/dates";
import { ensureWeek } from "@/lib/recurring";

export default async function WeekByDate({ params }: { params: Promise<{ slug: string; date: string }> }) {
  await requireUser();
  const { slug, date } = await params;
  const project = await db.project.findUnique({ where: { slug } });
  if (!project || !isValidDay(date)) notFound();
  const week = await ensureWeek(project.id, weekStartOf(date));
  redirect(`/projects/${slug}/weeks/${week.id}`);
}
