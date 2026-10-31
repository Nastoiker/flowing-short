FROM node:22-bookworm-slim AS build
WORKDIR /app/backend
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund
RUN npx prisma generate
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
COPY test ./test
COPY scripts ./scripts
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates ffmpeg tini && rm -rf /var/lib/apt/lists/*
COPY --from=build --chown=node:node /app/backend /app/backend
RUN mkdir -p /app/backend/data /app/backend/uploads && chown -R node:node /app/backend/data /app/backend/uploads
USER node
EXPOSE 8000
ENTRYPOINT ["tini", "--"]
CMD ["sh", "-c", "node scripts/init-database.cjs && npx prisma migrate deploy && node dist/src/main.js"]
