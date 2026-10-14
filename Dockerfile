# syntax=docker/dockerfile:1

# ---- deps: install all dependencies (prisma generate runs on postinstall) ----
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---- build: compile the standalone Next.js server ----
FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && npm run build

# ---- migrate: one-shot container that applies database migrations ----
FROM build AS migrate
CMD ["npx", "prisma", "migrate", "deploy"]

# ---- runner: minimal production image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs persodash

COPY --from=build --chown=persodash:nodejs /app/.next/standalone ./
COPY --from=build --chown=persodash:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=persodash:nodejs /app/public ./public

USER persodash
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.js"]
