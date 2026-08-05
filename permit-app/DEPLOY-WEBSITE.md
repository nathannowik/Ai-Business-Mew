# Put PermitPilot online (get a testable website URL)

This turns the app into a real website you can open in any browser and share. You don't
need to touch any code — you'll connect this repo to a hosting service and paste a few
settings. Pick **one** of the options below.

On first startup the site automatically sets up the database, loads the sample data, and
creates your admin login, so it's ready to use the moment it finishes deploying.

**Your login (change the password after first sign-in):**
- Email: `admin@permitpilot.local`
- Password: `permitpilot`

---

## Option 1 — Render (recommended, ~$7/mo, keeps your data)

Render runs the app as a small always-on server with a saved disk, so anything you enter
sticks around.

1. Go to **https://render.com** and sign up (use "Sign in with GitHub").
2. Click **New +** → **Web Service**.
3. Connect your GitHub and pick the repository **`nathannowik/ai-business-mew`**.
4. On the setup screen, set:
   - **Name:** `permitpilot` (or anything)
   - **Branch:** `claude/permit-application-system-8e8037` (or `main` if you've merged it)
   - **Root Directory:** `permit-app`  ← important
   - **Runtime / Language:** **Docker** (Render should detect the Dockerfile automatically)
   - **Instance Type:** **Starter** ($7/mo) — needed for a saved disk
5. Scroll to **Advanced** → **Add Disk**:
   - **Name:** `data`
   - **Mount Path:** `/data`
   - **Size:** `1 GB`
6. Under **Environment Variables**, add these (copy exactly):

   | Key | Value |
   |---|---|
   | `AUTH_SECRET` | `aee643086c01f7fdd40f6d46ef20ee86d5efcfdda2eae6b5fe250349ac4cc0ec` |
   | `APP_PASSWORD` | *(pick your own admin password)* |
   | `ADMIN_EMAIL` | *(your email, e.g. `you@yourcompany.com`)* |
   | `DATABASE_URL` | `file:/data/dev.db` |
   | `STORAGE_DIR` | `/data/storage` |
   | `ANTHROPIC_API_KEY` | *(optional — only if you want AI township research)* |

7. Click **Create Web Service**. Wait ~3–5 minutes for the first build.
8. Open the URL Render gives you (like `https://permitpilot.onrender.com`) and sign in.

> **Free option:** you can pick the **Free** instance instead and skip the disk — but then
> your data resets whenever the app restarts. Fine for a quick look, not for real testing.

---

## Option 2 — Railway (simple UI, free trial credit)

1. Go to **https://railway.app** and log in with GitHub.
2. **New Project** → **Deploy from GitHub repo** → pick your repo.
3. Open the service → **Settings**:
   - **Root Directory:** `permit-app`
   - Railway auto-detects the Dockerfile.
4. **Settings → Volumes** → add a volume, mount path **`/data`**.
5. **Variables** → add the same variables as the Render table above.
6. **Settings → Networking → Generate Domain** to get your public URL.

---

## Option 3 — Just try it on your own computer first (free, no account)

If you have Node.js 20+ installed:

```bash
cd permit-app
npm install
npm run setup     # creates the database + sample data + admin login
npm run dev       # open http://localhost:3000
```

Sign in with `admin@permitpilot.local` / `permitpilot`.

---

## After it's live

- **Change your password:** sign in → **Users** → edit yourself, or use "Change your
  password" at the bottom of the Users page.
- **Add real people/townships**, or keep the sample data to explore.
- **Turn on AI research** later by adding the `ANTHROPIC_API_KEY` variable in your host and
  redeploying.

Anything that goes wrong on deploy is almost always a typo in one of the environment
variables — double-check `DATABASE_URL` and `STORAGE_DIR` first.
