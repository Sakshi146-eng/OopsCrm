# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package definition and lockfile (if present)
COPY package.json ./
COPY package-lock.json* ./

# Install all dependencies (including devDependencies needed for build)
RUN npm install

# Copy source files, Prisma schema, and build TypeScript
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production Runtime ───────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install wget required for Docker health checks
RUN apk add --no-cache openssl libc6-compat wget

# Copy compiled JavaScript, production dependencies, and Prisma assets
COPY --from=builder /app/dist             ./dist
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/package.json     ./
COPY --from=builder /app/prisma           ./prisma

EXPOSE 5000

CMD ["node", "dist/index.js"]