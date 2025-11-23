# Multi-stage build for smaller image size
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY aicli/package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY aicli/ ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

# Install runtime dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    libsecret-dev

# Create non-root user
RUN addgroup -g 1001 -S aicli && \
    adduser -S aicli -u 1001

# Set working directory
WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=aicli:aicli /app/dist ./dist
COPY --from=builder --chown=aicli:aicli /app/node_modules ./node_modules
COPY --from=builder --chown=aicli:aicli /app/package.json ./

# Create data directory for sessions
RUN mkdir -p /home/aicli/.aicli && \
    chown -R aicli:aicli /home/aicli

# Switch to non-root user
USER aicli

# Set environment
ENV NODE_ENV=production \
    HOME=/home/aicli

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "console.log('healthy')" || exit 1

# Default command
ENTRYPOINT ["node", "dist/cli.js"]
CMD ["chat"]
