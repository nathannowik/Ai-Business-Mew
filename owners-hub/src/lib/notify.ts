// Email notifications: the daily to-do reminder, new-task alerts, and comments.
import { db } from "./db";
import { addDays, currentHour, formatDay, relativeDay, todayStr } from "./dates";
import { APP_URL, button, escapeHtml, layout, sendEmail } from "./email";
import { ensureRecurringTasks } from "./recurring";

export const REMINDER_HOUR = Number(process.env.REMINDER_HOUR ?? 7);

type TaskLine = { id: string; title: string; dueDate: string; week: { id: string; project: { slug: string } } | null };

function taskListHtml(tasks: TaskLine[], today: string) {
  return `<ul style="padding-left:18px;margin:8px 0">${tasks
    .map((t) => {
      const overdue = t.dueDate < today;
      const weekLink = t.week
        ? ` · <a href="${APP_URL}/projects/${t.week.project.slug}/weeks/${t.week.id}" style="color:#57534e">weekly plan</a>`
        : "";
      return `<li style="margin:6px 0"><a href="${APP_URL}/tasks/${t.id}" style="color:#1c1917;font-weight:600">${escapeHtml(t.title)}</a>
<span style="color:${overdue ? "#b91c1c" : "#78716c"};font-size:13px"> — ${overdue ? "overdue since " + formatDay(t.dueDate) : relativeDay(t.dueDate, today)}</span>${weekLink}</li>`;
    })
    .join("")}</ul>`;
}

/**
 * Send each person their daily to-do email once per day, at/after REMINDER_HOUR
 * in the company timezone. Returns how many emails were sent.
 */
export async function sendDailyReminders({ now = new Date(), force = false } = {}) {
  const today = todayStr(now);
  if (!force && currentHour(now) < REMINDER_HOUR) return 0;
  await ensureRecurringTasks(today, { force: true });

  const users = await db.user.findMany({ where: { emailReminders: true } });
  const yesterday = addDays(today, -1);
  let sent = 0;

  for (const user of users) {
    if (!force && user.lastDigestOn === today) continue;
    // Claim today's send first so two processes can't both send it.
    const claimed = await db.user.updateMany({
      where: { id: user.id, OR: [{ lastDigestOn: null }, { lastDigestOn: { not: today } }] },
      data: { lastDigestOn: today },
    });
    if (!force && claimed.count === 0) continue;

    const mine = await db.task.findMany({
      where: { assigneeId: user.id, completedAt: null, dueDate: { lte: today } },
      include: { week: { select: { id: true, project: { select: { slug: true } } } } },
      orderBy: { dueDate: "asc" },
    });

    let teamHtml = "";
    let teamText = "";
    if (user.role === "ADMIN") {
      const others = await db.task.findMany({
        where: { dueDate: yesterday, assigneeId: { not: user.id } },
        include: { assignee: true },
        orderBy: { assignee: { name: "asc" } },
      });
      if (others.length) {
        const byPerson = new Map<string, typeof others>();
        for (const t of others) byPerson.set(t.assignee.name, [...(byPerson.get(t.assignee.name) ?? []), t]);
        const rows = [...byPerson].map(([name, ts]) => {
          const done = ts.filter((t) => t.completedAt).length;
          const missed = ts.filter((t) => !t.completedAt).map((t) => t.title);
          return { name, done, total: ts.length, missed };
        });
        teamHtml = `<h2 style="font-size:15px;margin:20px 0 4px">Team yesterday</h2><ul style="padding-left:18px;margin:8px 0">${rows
          .map(
            (r) =>
              `<li style="margin:4px 0"><strong>${escapeHtml(r.name)}</strong>: ${r.done}/${r.total} done${
                r.missed.length ? ` <span style="color:#b91c1c">— open: ${r.missed.map(escapeHtml).join(", ")}</span>` : ""
              }</li>`,
          )
          .join("")}</ul>`;
        teamText = "\n\nTeam yesterday:\n" + rows.map((r) => `- ${r.name}: ${r.done}/${r.total} done${r.missed.length ? ` (open: ${r.missed.join(", ")})` : ""}`).join("\n");
      }
    }

    if (!mine.length && !teamHtml) continue;

    const first = user.name.split(" ")[0];
    const title = mine.length
      ? `Good morning ${first} — ${mine.length} thing${mine.length === 1 ? "" : "s"} on your list today`
      : `Good morning ${first} — your list is clear today`;
    const html = layout(
      title,
      (mine.length ? taskListHtml(mine, today) : `<p style="margin:0;color:#57534e">Nothing due today. 🙌</p>`) +
        teamHtml +
        button(`${APP_URL}/`, "Open my dashboard"),
    );
    const text =
      `${title}\n\n` +
      mine.map((t) => `- ${t.title} (${t.dueDate < today ? "overdue" : relativeDay(t.dueDate, today)}): ${APP_URL}/tasks/${t.id}`).join("\n") +
      teamText +
      `\n\nDashboard: ${APP_URL}/`;
    if (await sendEmail(user.email, title, html, text)) sent++;
  }
  return sent;
}

export async function notifyTaskAssigned(taskId: string, actorId: string) {
  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { assignee: true, week: { select: { id: true, project: { select: { slug: true } } } } },
  });
  if (!task || task.assigneeId === actorId || !task.assignee.emailReminders) return;
  const actor = await db.user.findUnique({ where: { id: actorId } });
  const subject = `New task: ${task.title} (due ${relativeDay(task.dueDate)})`;
  const html = layout(
    subject,
    `<p style="margin:0 0 8px;color:#57534e">${escapeHtml(actor?.name ?? "Someone")} assigned you a task.</p>` +
      (task.description ? `<p style="white-space:pre-wrap">${escapeHtml(task.description)}</p>` : "") +
      button(`${APP_URL}/tasks/${task.id}`, "Open task"),
  );
  await sendEmail(task.assignee.email, subject, html, `${subject}\n\n${task.description}\n\n${APP_URL}/tasks/${task.id}`);
}

/** Tell the assignee and the admins (minus the author) about a new comment. */
export async function notifyComment(commentId: string) {
  const c = await db.comment.findUnique({
    where: { id: commentId },
    include: { author: true, task: { include: { assignee: true } } },
  });
  if (!c) return;
  const admins = await db.user.findMany({ where: { role: "ADMIN" } });
  const recipients = new Map<string, string>();
  for (const u of [c.task.assignee, ...admins]) if (u.id !== c.authorId && u.emailReminders) recipients.set(u.id, u.email);
  const subject = `${c.author.name} commented on "${c.task.title}"`;
  const html = layout(
    subject,
    `<p style="white-space:pre-wrap;margin:0;padding:12px;background:#f5f5f4;border-radius:8px">${escapeHtml(c.body)}</p>` +
      button(`${APP_URL}/tasks/${c.taskId}#comments`, "Reply"),
  );
  for (const email of recipients.values()) {
    await sendEmail(email, subject, html, `${subject}:\n\n${c.body}\n\n${APP_URL}/tasks/${c.taskId}`);
  }
}
