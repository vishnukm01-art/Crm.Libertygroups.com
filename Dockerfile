FROM node:20-slim AS base
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm install --legacy-peer-deps

# Build the application
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Dummy env vars so Next.js page-data collection can import modules without crashing
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ENV OPENAI_API_KEY="sk-dummy"

RUN npx prisma generate
RUN npm run build

# Production image (supports both web and worker via SERVICE_MODE env var)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy standalone web server (includes server.js in root)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Overwrite minimal standalone node_modules with full modules (needed for worker)
COPY --from=builder /app/node_modules ./node_modules

# Copy prisma schema
COPY --from=builder /app/prisma ./prisma

# Copy worker source files
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json

# Create uploads directory
RUN mkdir -p /app/uploads

# Entrypoint script for web/worker mode switching
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV SERVICE_MODE=web

ENTRYPOINT ["./docker-entrypoint.sh"]
