# ── Builder stage ────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:22-slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy standalone build output + full node_modules (needed for prisma migrate)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/package.json ./package.json

# Stage quiz assets into the image for seeding into the volume on first run
COPY --from=builder /app/data/images/quiz-assets /app/seed/quiz-assets
RUN mkdir -p /app/data/images

RUN useradd --create-home --shell /bin/false appuser \
    && chown -R appuser:appuser /app

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "const http=require('http');http.get('http://localhost:3001/style',(r)=>r.statusCode===200?process.exit(0):process.exit(1)).on('error',()=>process.exit(1))"

USER appuser

# Mount fashion data: -v /path/to/koko/data/fashion:/app/fashion-data
ENV FASHION_DATA_DIR=/app/fashion-data

EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && cp -rn /app/seed/quiz-assets /app/data/images/ 2>/dev/null; PORT=3001 node server.js"]
