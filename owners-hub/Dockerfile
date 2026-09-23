# For hosts other than Render (Fly.io, Railway, a VPS…). Mount a volume at /data.
FROM node:22-slim
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production DATABASE_URL=file:/data/owners-hub.db UPLOAD_DIR=/data/uploads PORT=3100
EXPOSE 3100
CMD ["npm", "start"]
