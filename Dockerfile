# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma postinstall / engine download needs OpenSSL on Alpine.
RUN apk add --no-cache openssl libc6-compat ca-certificates

# Configure npm for slow / flaky networks (same idea as marcflix-2025 reference).
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Update npm and clear cache — avoids sporadic "Exit handler never called" on NAS builds.
RUN npm install -g npm@latest && npm cache clean --force

COPY package.json package-lock.json* ./
RUN npm ci --prefer-offline --no-audit --fetch-timeout=600000

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat ca-certificates

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_OPTIONS=--max-old-space-size=3072
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Runner (fonts for Sharp/SVG poster text on Alpine)
FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat ca-certificates ttf-dejavu

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3009

ENV PORT=3009
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
