# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app

# Configure npm for better timeout/retry handling (important for Synology builds)
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Update npm to latest version and clear cache to avoid "Exit handler never called" error
RUN echo "=== Starting npm update ===" && \
    npm --version && \
    echo "=== Installing npm@latest (this may take a while) ===" && \
    npm install -g npm@latest --loglevel=verbose --progress=true && \
    echo "=== npm update complete, checking version ===" && \
    npm --version && \
    echo "=== Cleaning npm cache ===" && \
    npm cache clean --force --loglevel=verbose && \
    echo "=== npm setup complete ==="

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with increased timeout and retry settings
RUN npm ci --prefer-offline --no-audit --fetch-timeout=600000

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Poster SVG/text rendering expects DejaVu (not in base Alpine); marcflix has no equivalent step.
RUN apk add --no-cache ttf-dejavu

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1
ENV POSTER_STORAGE_DIR /data/posters

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from standalone build
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

USER nextjs

EXPOSE 3009

ENV PORT 3009
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
