# ============================================
# Gist Dockerfile
# Multi-stage build for optimized production image
# ============================================

ARG NODE_VERSION=22-alpine
ARG PNPM_VERSION=9.15.9

# Shared base image for all pnpm-driven stages.
FROM node:${NODE_VERSION} AS base
RUN corepack enable
WORKDIR /app

# Stage 1: Dependencies
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build the application
RUN pnpm build

# Stage 3: Migrator (used by docker-compose migrate service)
FROM base AS migrator

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml drizzle.config.ts tsconfig.json ./
COPY lib ./lib

CMD ["pnpm", "db:push", "--force"]

# Stage 4: Seeder (used by docker-compose seed service)
FROM base AS seeder

COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY lib ./lib
COPY scripts ./scripts

CMD ["pnpm", "db:seed"]

# Stage 5: Runner
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set correct permissions
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
