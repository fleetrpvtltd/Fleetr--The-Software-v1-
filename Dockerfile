# ── Stage 1: Build stage ──────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root and package definitions for layer caching
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY fleetr/package.json ./fleetr/
COPY admin-panel/package.json ./admin-panel/

# Install dependencies across all monorepo workspaces
RUN npm ci

# Copy full source trees
COPY backend/ ./backend/
COPY fleetr/ ./fleetr/
COPY admin-panel/ ./admin-panel/

# Build backend and frontends
RUN npm run build --workspaces

# ── Stage 2: Production Runner ────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Install curl for container health check
RUN apk add --no-cache curl

# Run as non-root user
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs

# Copy package descriptors
COPY --chown=nodejs:nodejs package.json package-lock.json ./
COPY --chown=nodejs:nodejs backend/package.json ./backend/
COPY --chown=nodejs:nodejs fleetr/package.json ./fleetr/
COPY --chown=nodejs:nodejs admin-panel/package.json ./admin-panel/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy compiled backend dist and static frontends from builder stage
COPY --from=builder --chown=nodejs:nodejs /app/backend/dist ./backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/fleetr/dist ./fleetr/dist
COPY --from=builder --chown=nodejs:nodejs /app/admin-panel/dist ./admin-panel/dist

USER nodejs

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-5000}/health || exit 1

CMD ["node", "backend/dist/src/server.js"]
