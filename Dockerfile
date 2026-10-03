# Stage 1: Build application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency specifications
COPY fleetr/package*.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY fleetr/ ./

# Build frontend and compile backend
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Install curl for health check
RUN apk add --no-cache curl

# Run as non-root user
RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs

# Copy package descriptors and install production-only dependencies
COPY --chown=nodejs:nodejs fleetr/package*.json ./
RUN npm ci --omit=dev

# Copy compiled bundles and static assets
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

USER nodejs

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

CMD ["node", "dist/server.cjs"]
