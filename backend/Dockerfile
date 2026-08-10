# ── Backend ─────────────────────────────────────────────────
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS backend
WORKDIR /app
ENV NODE_ENV=production
COPY --from=backend-builder /app/dist ./dist
COPY --from=backend-builder /app/node_modules ./node_modules
COPY --from=backend-builder /app/package*.json ./
COPY --from=backend-builder /app/prisma ./prisma
EXPOSE 5000
CMD ["node", "dist/index.js"]
