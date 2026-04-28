# syntax=docker/dockerfile:1
# Synology / slow networks: build with DOCKER_BUILDKIT=1. If the UI still times out,
# run `docker build` from SSH with a longer client timeout or use a registry mirror.

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Prisma postinstall / engine download needs OpenSSL; libc6-compat avoids musl/glibc edge cases.
# RUN apk add --no-cache openssl libc6-compat ca-certificates

# Env vars apply to npm ci (more reliable than flags on some npm versions).
ENV NPM_CONFIG_FETCH_TIMEOUT=1200000 \
    NPM_CONFIG_FETCH_RETRIES=10 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=300000

COPY package.json package-lock.json* ./
# Cache tarball downloads between rebuilds (needs BuildKit).
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat ca-certificates

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Low-RAM NAS (Synology): avoid OOM during generate / Next compile.
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
