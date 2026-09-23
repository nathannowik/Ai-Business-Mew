# Owners Hub

A shared to-do dashboard and weekly planning space for the owners (Nathan,
Kyler, Isaac). It starts with the **Bible Study**; other parts of the business
get added as new projects later.

## What it does

- **Today dashboard**: your to-dos for today plus anything overdue, each with a
  checkbox. The *Team today* panel shows everyone's progress, and the project
  list shows everything we're involved in.
- **Tasks link to the work**: every task opens a detail page, and a button goes
  straight to that week's plan (lesson plan, files, uploads).
- **Weekly plans**: one page per week with the basics: topic, scripture, main
  point, outline, discussion questions, prayer focus, graphic brief, GroupMe
  message (with a copy button), outreach notes, and other notes. Anyone can edit it.
- **Files & graphics**: upload images, PDFs, docs, and design files to the week
  (no video). Everyone can view and download them.
- **Weekly to-dos repeat automatically**: set up once (e.g. "Create Bible study
  graphic, Kyler, every Tuesday") and it lands on the list every week. Editing
  one updates the upcoming copies, and pausing one removes them.
- **Notes & comments on every task** for updates and review. The assignee and
  admins get an email.
- **Email reminders**: a daily "here's your list" email (default 7 AM), plus
  emails for new tasks and comments. Admins also get a summary of what the team
  finished yesterday. Each person can turn emails off in Settings.
- **Roles**: *Admin* (Nathan) creates and assigns tasks and manages weekly to-dos
  and people. *Members* check things off, comment, edit plans, and upload.
  Everyone can see everyone's tasks.

Works on phones (bottom tab bar) and computers. On iPhone use Share → *Add to
Home Screen* to get an app icon.

## Run it locally

```bash
cd owners-hub
cp .env.example .env        # fill in SEED_*_EMAIL if you like
npm install
npx prisma migrate deploy   # creates the SQLite database
npm run db:seed             # the 3 owners + Bible Study + weekly to-dos
npm run dev                 # http://localhost:3100
```

Sign in with any owner's email and `SEED_PASSWORD` (default `change-me-now`),
then change it under Settings.

`npm test` runs the tests. `npm run reminders:send -- --force` sends today's
reminder emails right away.

## Put it online (Render, about $7–8/month)

1. In Render, go to **New → Blueprint**, pick this repo, and set the blueprint
   path to `owners-hub/render.yaml`.
2. Fill in the prompted values:
   - `APP_URL`: the site's address, e.g. `https://owners-hub.onrender.com`
   - `SEED_PASSWORD` and `SEED_NATHAN_EMAIL` / `SEED_KYLER_EMAIL` / `SEED_ISAAC_EMAIL`:
     the real emails and a temporary password
   - Email: any SMTP provider. The easiest is a Gmail account with an
     [app password](https://support.google.com/accounts/answer/185833)
     (`SMTP_HOST=smtp.gmail.com`, `SMTP_USER=you@gmail.com`,
     `SMTP_PASS=<app password>`, `EMAIL_FROM=Owners Hub <you@gmail.com>`).
     Resend, Postmark, or SendGrid SMTP work too.
3. Deploy. The database and uploads live on the attached disk (`/data`), and
   first-time setup runs automatically on an empty database.

The daily reminder runs inside the server every 10 minutes and sends once per
person per day after `REMINDER_HOUR` in `APP_TIMEZONE`. If you host somewhere
that puts the app to sleep, set `CRON_SECRET` and have a free cron service hit
`/api/cron/reminders?key=<CRON_SECRET>` each morning.

A `Dockerfile` is included for other hosts. Mount a volume at `/data`.

## How it's built

Next.js 15 (App Router, server actions) · Prisma + SQLite · Tailwind ·
nodemailer. Self-contained in this folder, independent of the rest of the repo.

```
prisma/schema.prisma      data model (User, Project, LessonWeek, RecurringTask, Task, Comment, Attachment)
prisma/seed.ts            first-run people, Bible Study project, default weekly to-dos
src/app/(app)/            pages: dashboard, tasks, projects/[slug], weeks, team, settings
src/app/actions.ts        all form actions (create/check off tasks, save plans, comments…)
src/app/api/              file upload/download, reminder cron hook
src/lib/recurring.ts      weekly to-do generation
src/lib/notify.ts         reminder, new-task, and comment emails
src/lib/dates.ts          company-timezone date helpers (weeks run Mon–Sun)
```

### Adding the next area of the business

`Project` is already generic. Create a new project row and it appears on the
dashboard with its own weekly to-dos. The weekly plan fields are Bible
Study–specific (`LessonWeek`), so a new area with different fields gets its own
page and model.
