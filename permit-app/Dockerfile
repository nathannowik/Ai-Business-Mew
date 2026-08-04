# PermitPilot — single-image deploy.
# SQLite DB lives on the /data volume and uploaded/generated files on /app/storage,
# so both survive container restarts.

FROM node:22-slim

WORKDIR /app

# openssl is required by Prisma's query engine on Debian.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the app and generate the Prisma client for this platform.
COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3000
# Persist the database outside the image.
ENV DATABASE_URL="file:/data/dev.db"

# Set these to real secrets at deploy time.
ENV APP_PASSWORD="permitpilot"
ENV AUTH_SECRET="change-me-to-a-long-random-string"

EXPOSE 3000
VOLUME ["/data", "/app/storage"]

# Apply the schema to the (possibly empty) volume DB, then start the server.
# To load sample data once: `docker exec <container> npm run db:seed`
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx next start -p ${PORT}"]
