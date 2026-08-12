# ── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# wget is needed for the Docker health-check probe
RUN apk add --no-cache wget

# Copy only what is needed to run
COPY --from=builder /app/dist             ./dist
COPY --from=builder /app/node_modules     ./node_modules
COPY --from=builder /app/package*.json    ./
COPY --from=builder /app/prisma          ./prisma

EXPOSE 5000

CMD ["node", "dist/index.js"]
