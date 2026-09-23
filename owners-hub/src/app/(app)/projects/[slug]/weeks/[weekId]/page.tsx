import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, DAY_NAMES, dateInWeek, formatDay, formatWeek, todayStr, weekStartOf } from "@/lib/dates";
import { deleteAttachment, saveLessonWeek } from "@/app/actions";
import { formatBytes } from "@/lib/storage";
import { TaskRow, taskRowInclude } from "@/components/TaskRow";
import { UploadForm } from "@/components/UploadForm";
import { CopyButton } from "@/components/CopyButton";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton, StateForm, SubmitButton } from "@/components/forms";

export async function generateMetadata({ params }: { params: Promise<{ weekId: string }> }) {
  const w = await db.lessonWeek.findUnique({ where: { id: (await params).weekId }, select: { weekStart: true, topic: true } });
  return { title: w ? `${formatWeek(w.weekStart)}${w.topic ? ` — ${w.topic}` : ""}` : "Week" };
}

type Field = { name: string; label: string; hint?: string; rows: number; placeholder?: string; copy?: boolean };

const SECTIONS: { title: string; fields: Field[] }[] = [
  {
    title: "The lesson",
    fields: [
      { name: "scripture", label: "Scripture", rows: 2, placeholder: "e.g. John 15:1–17" },
      { name: "mainPoint", label: "Main point / big idea", rows: 2, placeholder: "The one thing we want everyone to walk away with" },
      { name: "outline", label: "Lesson outline", rows: 10, placeholder: "Opening, teaching points, illustrations, closing…" },
      { name: "discussionQuestions", label: "Discussion questions", rows: 6, placeholder: "1.\n2.\n3." },
      { name: "prayerFocus", label: "Prayer focus", rows: 3 },
    ],
  },
  {
    title: "Getting the word out",
    fields: [
      {
        name: "graphicBrief",
        label: "Graphic brief",
        hint: "What the graphic should say / feel like. Upload the finished graphic in Files.",
        rows: 4,
        placeholder: "Title text, verse to feature, colors/vibe, sizes needed (IG post, story, GroupMe)…",
      },
      { name: "groupMeMessage", label: "GroupMe message", hint: "Draft it here, then copy & paste into GroupMe.", rows: 5, copy: true },
      { name: "outreachNotes", label: "Outreach to new creators", hint: "Who we're inviting this week and follow-ups.", rows: 4 },
    ],
  },
  { title: "Other", fields: [{ name: "notes", label: "Notes", rows: 4, placeholder: "Anything else for this week" }] },
];

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: process.env.APP_TIMEZONE || "America/Chicago",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function WeekPage({ params }: { params: Promise<{ slug: string; weekId: string }> }) {
  const user = await requireUser();
  const { slug, weekId } = await params;
  const week = await db.lessonWeek.findUnique({
    where: { id: weekId },
    include: {
      project: true,
      tasks: { include: taskRowInclude, orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }] },
      attachments: { include: { uploader: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!week || week.project.slug !== slug) notFound();
  const today = todayStr();
  const meeting = dateInWeek(week.weekStart, week.project.meetingDay);
  const isThisWeek = week.weekStart === weekStartOf(today);
  const values = week as unknown as Record<string, string>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/projects/${slug}`} className="text-sm text-stone-500 hover:underline">← {week.project.name}</Link>
          <h1 className="mt-1 text-2xl font-bold">
            {formatWeek(week.weekStart)}
            {isThisWeek && <span className="pill ml-2 bg-brand align-middle text-white">This week</span>}
          </h1>
          <p className="text-sm text-stone-600">
            Meets {DAY_NAMES[week.project.meetingDay]}, {formatDay(meeting, { month: "long", day: "numeric" })}
            {week.project.meetingTime && ` · ${week.project.meetingTime}`}
            {week.project.location && ` · ${week.project.location}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/projects/${slug}/on/${addDays(week.weekStart, -7)}`} className="btn-secondary">← Prev</Link>
          <Link href={`/projects/${slug}/on/${addDays(week.weekStart, 7)}`} className="btn-secondary">Next →</Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sidebar first on phones: what's due and where to upload. */}
        <aside className="space-y-6 lg:order-2">
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">This week's to-dos</h2>
              <span className="text-xs text-stone-500">
                {week.tasks.filter((t) => t.completedAt).length}/{week.tasks.length} done
              </span>
            </div>
            {week.tasks.length === 0 ? (
              <p className="px-4 py-4 text-sm text-stone-500">No tasks linked to this week.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {week.tasks.map((t) => (
                  <TaskRow key={t.id} task={{ ...t, week: null }} today={today} showAssignee />
                ))}
              </ul>
            )}
            {user.role === "ADMIN" && (
              <div className="border-t border-stone-100 px-4 py-3">
                <Link href={`/tasks/new?project=${week.projectId}&due=${meeting < today ? today : meeting}`} className="text-sm font-semibold text-brand hover:underline">
                  + Add a one-off task for this week
                </Link>
              </div>
            )}
          </section>

          <section className="card" id="files">
            <div className="card-header">
              <h2 className="card-title">Files & graphics</h2>
              <span className="text-xs text-stone-500">{week.attachments.length}</span>
            </div>
            <div className="p-4">
              <UploadForm weekId={week.id} />
            </div>
            {week.attachments.length > 0 && (
              <ul className="grid grid-cols-2 gap-3 border-t border-stone-100 p-4">
                {week.attachments.map((a) => {
                  const isImage = /^image\/(png|jpe?g|gif|webp|avif)$/.test(a.mimeType);
                  return (
                    <li key={a.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                      <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="block aspect-square bg-stone-100">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={`/api/files/${a.id}`} alt={a.caption || a.fileName} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <span className="flex h-full items-center justify-center text-3xl">{a.mimeType === "application/pdf" ? "📄" : "📎"}</span>
                        )}
                      </a>
                      <div className="space-y-1 p-2">
                        <p className="truncate text-xs font-medium" title={a.fileName}>{a.caption || a.fileName}</p>
                        <p className="flex items-center gap-1 text-[11px] text-stone-500">
                          <Avatar user={a.uploader} /> {timeFmt.format(a.createdAt)} · {formatBytes(a.size)}
                        </p>
                        <div className="flex items-center justify-between">
                          <a href={`/api/files/${a.id}?download`} className="text-xs font-semibold text-brand hover:underline">Download</a>
                          {(a.uploaderId === user.id || user.role === "ADMIN") && (
                            <ConfirmButton action={deleteAttachment.bind(null, a.id)} confirmText={`Delete ${a.fileName}?`} className="text-xs text-stone-400 hover:text-red-700">
                              Delete
                            </ConfirmButton>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>

        <section className="lg:order-1 lg:col-span-2">
          <StateForm action={saveLessonWeek} className="card space-y-6 p-5">
            <input type="hidden" name="id" value={week.id} />
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="label" htmlFor="topic">Topic / title</label>
                <input id="topic" name="topic" defaultValue={week.topic} className="input text-lg font-semibold" placeholder="This week's lesson title" />
              </div>
              <div>
                <label className="label" htmlFor="status">Status</label>
                <select id="status" name="status" defaultValue={week.status} className="input">
                  <option value="DRAFT">Draft — still planning</option>
                  <option value="READY">Ready — lesson is final</option>
                </select>
              </div>
            </div>

            {SECTIONS.map((s) => (
              <fieldset key={s.title} className="space-y-4">
                <legend className="card-title mb-3">{s.title}</legend>
                {s.fields.map((f) => (
                  <div key={f.name}>
                    <div className="flex items-center justify-between">
                      <label className="label" htmlFor={f.name}>{f.label}</label>
                      {f.copy && <CopyButton targetId={f.name} label="Copy message" />}
                    </div>
                    <textarea id={f.name} name={f.name} rows={f.rows} defaultValue={values[f.name]} placeholder={f.placeholder} className="input leading-relaxed" />
                    {f.hint && <p className="hint">{f.hint}</p>}
                  </div>
                ))}
              </fieldset>
            ))}

            <div className="sticky bottom-20 flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-white/95 p-3 shadow-lg backdrop-blur md:bottom-4">
              <span className="text-xs text-stone-500">Last saved {timeFmt.format(week.updatedAt)} · everyone can edit</span>
              <SubmitButton className="btn-primary shrink-0 whitespace-nowrap">Save lesson plan</SubmitButton>
            </div>
          </StateForm>
        </section>
      </div>
    </div>
  );
}
