# PermitPilot — single-image deploy.
# The SQLite DB and uploaded/generated files live on a persistent disk so they survive
# restarts. Point DATABASE_URL and STORAGE_DIR at that disk (see DEPLOY-WEBSITE.md).

FROM node:22-slim

WORKDIR /app

# openssl is required by Prisma's query engine on Debian.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Don't download Playwright browsers during install — it's only used for dev screenshots.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the app and generate the Prisma client for this platform.
COPY . .
RUN npx prisma generate && npm run build
RUN chmod +x scripts/start.sh

ENV NODE_ENV=production
ENV PORT=3000
# Defaults for a single mounted disk at /data (override in your host if different).
ENV DATABASE_URL="file:/data/dev.db"
ENV STORAGE_DIR="/data/storage"

# Change these to real secrets at deploy time.
ENV APP_PASSWORD="permitpilot"
ENV AUTH_SECRET="change-me-to-a-long-random-string"

EXPOSE 3000
VOLUME ["/data"]

# Prepare the disk, apply the schema, seed the demo + admin login on first boot, then start.
CMD ["sh", "scripts/start.sh"]
