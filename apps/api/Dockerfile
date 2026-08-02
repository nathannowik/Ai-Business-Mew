# API container. Build context is the repo ROOT (monorepo), not apps/api.
FROM node:22-bookworm-slim

# Prisma needs openssl; skip Electron's binary download (desktop devDep).
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1 \
    NPM_CONFIG_FUND=false \
    NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Install all workspaces (devDeps included: we run the API via tsx in prod).
RUN npm ci --include=dev
RUN npm run db:generate --workspace @mew/api

WORKDIR /app/apps/api
# Apply migrations, then start. The server binds to $PORT (host-provided).
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx src/index.ts"]
