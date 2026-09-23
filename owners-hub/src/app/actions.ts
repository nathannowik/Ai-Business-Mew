"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  checkPassword,
  endSession,
  hashPassword,
  requireAdmin,
  requireUser,
  startSession,
} from "@/lib/auth";
import { isValidDay, todayStr, weekStartOf } from "@/lib/dates";
import { ensureWeek, syncUpcomingFromTemplate } from "@/lib/recurring";
import { notifyComment, notifyTaskAssigned } from "@/lib/notify";
import { deleteUpload } from "@/lib/storage";

const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

export type FormState = { error?: string; ok?: string } | undefined;

// ---------- Auth ----------

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (!user || !(await checkPassword(str(fd, "password"), user.passwordHash))) {
    return { error: "That email and password don't match." };
  }
  await startSession(user.id);
  const next = str(fd, "next");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}

// ---------- Tasks ----------

export async function setTaskDone(taskId: string, done: boolean) {
  const user = await requireUser();
  await db.task.update({
    where: { id: taskId },
    data: done ? { completedAt: new Date(), completedById: user.id } : { completedAt: null, completedById: null },
  });
  revalidatePath("/", "layout");
}

export async function addComment(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const taskId = str(fd, "taskId");
  const body = str(fd, "body");
  if (!body) return { error: "Write something first." };
  const c = await db.comment.create({ data: { taskId, authorId: user.id, body } });
  await notifyComment(c.id).catch((e) => console.error(e));
  revalidatePath(`/tasks/${taskId}`);
  return { ok: "Posted" };
}

export async function deleteComment(commentId: string) {
  const user = await requireUser();
  const c = await db.comment.findUnique({ where: { id: commentId } });
  if (!c || (c.authorId !== user.id && user.role !== "ADMIN")) return;
  await db.comment.delete({ where: { id: commentId } });
  revalidatePath(`/tasks/${c.taskId}`);
}

async function taskFields(fd: FormData) {
  const title = str(fd, "title");
  const dueDate = str(fd, "dueDate");
  const assigneeId = str(fd, "assigneeId");
  const projectId = str(fd, "projectId") || null;
  if (!title) return { error: "Give the task a title." } as const;
  if (!isValidDay(dueDate)) return { error: "Pick a due date." } as const;
  if (!assigneeId) return { error: "Choose who it's for." } as const;
  let weekId: string | null = null;
  if (projectId && fd.get("linkWeek") === "on") {
    weekId = (await ensureWeek(projectId, weekStartOf(dueDate))).id;
  }
  return { data: { title, description: str(fd, "description"), dueDate, assigneeId, projectId, weekId } } as const;
}

export async function createTask(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const fields = await taskFields(fd);
  if ("error" in fields) return { error: fields.error };
  const task = await db.task.create({ data: { ...fields.data, createdById: admin.id } });
  await notifyTaskAssigned(task.id, admin.id).catch((e) => console.error(e));
  revalidatePath("/", "layout");
  redirect(`/tasks/${task.id}`);
}

export async function updateTask(_: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = str(fd, "id");
  const before = await db.task.findUnique({ where: { id } });
  if (!before) return { error: "Task not found." };
  const fields = await taskFields(fd);
  if ("error" in fields) return { error: fields.error };
  await db.task.update({ where: { id }, data: fields.data });
  if (before.assigneeId !== fields.data.assigneeId) await notifyTaskAssigned(id, admin.id).catch((e) => console.error(e));
  revalidatePath("/", "layout");
  redirect(`/tasks/${id}`);
}

export async function deleteTask(taskId: string) {
  await requireAdmin();
  await db.task.delete({ where: { id: taskId } });
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- Weekly lesson pages ----------

const LESSON_FIELDS = [
  "topic",
  "scripture",
  "mainPoint",
  "outline",
  "discussionQuestions",
  "prayerFocus",
  "graphicBrief",
  "groupMeMessage",
  "outreachNotes",
  "notes",
] as const;

export async function saveLessonWeek(_: FormState, fd: FormData): Promise<FormState> {
  await requireUser();
  const id = str(fd, "id");
  const data: Record<string, string> = {};
  for (const f of LESSON_FIELDS) data[f] = String(fd.get(f) ?? "");
  data.status = fd.get("status") === "READY" ? "READY" : "DRAFT";
  await db.lessonWeek.update({ where: { id }, data });
  revalidatePath("/", "layout");
  return { ok: `Saved at ${new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: process.env.APP_TIMEZONE || "America/Chicago" })}` };
}

export async function openWeek(fd: FormData) {
  await requireUser();
  const projectId = str(fd, "projectId");
  const day = str(fd, "date");
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project || !isValidDay(day)) return;
  const week = await ensureWeek(projectId, weekStartOf(day));
  redirect(`/projects/${project.slug}/weeks/${week.id}`);
}

export async function deleteAttachment(attachmentId: string) {
  const user = await requireUser();
  const a = await db.attachment.findUnique({ where: { id: attachmentId } });
  if (!a || (a.uploaderId !== user.id && user.role !== "ADMIN")) return;
  await db.attachment.delete({ where: { id: attachmentId } });
  await deleteUpload(a.storedName);
  revalidatePath("/", "layout");
}

// ---------- Projects & recurring tasks (admin) ----------

export async function updateProject(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  await db.project.update({
    where: { id: str(fd, "id") },
    data: {
      name: str(fd, "name") || undefined,
      description: str(fd, "description"),
      meetingDay: Number(str(fd, "meetingDay")),
      meetingTime: str(fd, "meetingTime"),
      location: str(fd, "location"),
    },
  });
  revalidatePath("/", "layout");
  return { ok: "Saved" };
}

export async function saveRecurring(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const title = str(fd, "title");
  const assigneeId = str(fd, "assigneeId");
  const dayOfWeek = Number(str(fd, "dayOfWeek"));
  if (!title) return { error: "Give it a title." };
  if (!assigneeId) return { error: "Choose who it's for." };
  if (!(dayOfWeek >= 0 && dayOfWeek <= 6)) return { error: "Choose a day." };
  const data = { title, description: str(fd, "description"), assigneeId, dayOfWeek };
  const t = id
    ? await db.recurringTask.update({ where: { id }, data })
    : await db.recurringTask.create({ data: { ...data, projectId: str(fd, "projectId"), startsOn: todayStr() } });
  await syncUpcomingFromTemplate(t.id);
  revalidatePath("/", "layout");
  return { ok: id ? "Updated — upcoming to-dos changed too" : "Added — it's on the to-do lists now" };
}

export async function setRecurringActive(id: string, active: boolean) {
  await requireAdmin();
  await db.recurringTask.update({ where: { id }, data: { active, ...(active ? { startsOn: todayStr() } : {}) } });
  await syncUpcomingFromTemplate(id);
  revalidatePath("/", "layout");
}

// ---------- People ----------

export async function saveUser(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "id");
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const role = fd.get("role") === "ADMIN" ? "ADMIN" : "MEMBER";
  const password = str(fd, "password");
  if (!name || !email.includes("@")) return { error: "Name and a valid email are required." };
  const clash = await db.user.findFirst({ where: { email, NOT: id ? { id } : undefined } });
  if (clash) return { error: "Someone already uses that email." };
  if (id) {
    if (role !== "ADMIN") {
      const otherAdmins = await db.user.count({ where: { role: "ADMIN", NOT: { id } } });
      if (otherAdmins === 0) return { error: "Keep at least one admin." };
    }
    if (password && password.length < 8) return { error: "Passwords need at least 8 characters." };
    await db.user.update({
      where: { id },
      data: { name, email, role, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
    });
  } else {
    if (password.length < 8) return { error: "Set a starting password (8+ characters)." };
    await db.user.create({ data: { name, email, role, passwordHash: await hashPassword(password) } });
  }
  revalidatePath("/", "layout");
  return { ok: password ? "Saved — share the new password with them" : "Saved" };
}

export async function updateMyProfile(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  if (!name || !email.includes("@")) return { error: "Name and a valid email are required." };
  const clash = await db.user.findFirst({ where: { email, NOT: { id: user.id } } });
  if (clash) return { error: "Someone already uses that email." };
  await db.user.update({
    where: { id: user.id },
    data: { name, email, emailReminders: fd.get("emailReminders") === "on" },
  });
  revalidatePath("/", "layout");
  return { ok: "Saved" };
}

export async function changeMyPassword(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  if (!(await checkPassword(str(fd, "current"), user.passwordHash))) return { error: "Current password is wrong." };
  const next = str(fd, "next");
  if (next.length < 8) return { error: "New password needs at least 8 characters." };
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Password changed" };
}
