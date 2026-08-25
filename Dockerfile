# Multi-stage Dockerfile for Replyly Extension

FROM node:22-alpine AS base
WORKDIR /app

# Enable pnpm via Corepack
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Development stage (for live watch mode)
FROM base AS dev
ENV NODE_ENV=development
EXPOSE 1815
CMD ["pnpm", "dev"]

# Production builder stage (packages chrome-mv3 bundle)
FROM base AS builder
ENV NODE_ENV=production
RUN pnpm build && pnpm package

# Final lightweight output container
FROM alpine:3.20 AS runner
WORKDIR /dist
COPY --from=builder /app/build/chrome-mv3-prod.zip ./replyly-extension.zip
COPY --from=builder /app/build/chrome-mv3-prod ./unpacked
CMD ["echo", "Replyly extension bundle built successfully in /dist"]
