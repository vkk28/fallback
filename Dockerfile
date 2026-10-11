# Official Node image index verified for linux/amd64 and linux/arm64.
FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df AS dependencies
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
# Runtime build uses prebuilt native packages; no unrelated dependency scripts.
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM dependencies AS web-build
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY infra/migrations ./infra/migrations
COPY tsconfig.json ./
ARG NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_PRIVY_APP_ID=${NEXT_PUBLIC_PRIVY_APP_ID}
RUN pnpm web:build

FROM web-build AS web
ENV NODE_ENV=production PORT=3000
USER node
EXPOSE 3000
CMD ["node", "scripts/web.mjs", "start", "--hostname", "0.0.0.0"]

FROM dependencies AS worker
COPY apps/worker ./apps/worker
COPY packages ./packages
COPY tsconfig.json ./
ENV NODE_ENV=production
USER node
CMD ["node", "--import", "tsx", "apps/worker/src/main.ts"]

# Database migrations are a separate explicit job, never automatic image startup.
FROM dependencies AS migrate
COPY scripts/migrate.ts ./scripts/migrate.ts
COPY infra/migrations ./infra/migrations
USER node
CMD ["node", "--import", "tsx", "scripts/migrate.ts"]
