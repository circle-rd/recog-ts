# syntax=docker/dockerfile:1.7

# ---- build stage -----------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

COPY pnpm-workspace.yaml package.json tsconfig.base.json tsconfig.json ./
COPY packages ./packages

COPY pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm -r build

# Prune dev dependencies in place to keep the runtime image small.
RUN pnpm prune --prod

# ---- runtime stage ---------------------------------------------------------
FROM node:22-alpine AS runtime
WORKDIR /app

# `bash` is required by docker-entrypoint.sh (uses `wait -n`).
RUN apk add --no-cache bash

ENV NODE_ENV=production \
    RECOG_TS_XML_DIR=/app/vendor/recog/xml \
    RECOG_TS_API_HOST=0.0.0.0 \
    RECOG_TS_API_PORT=3000 \
    RECOG_TS_MCP_HOST=0.0.0.0 \
    RECOG_TS_MCP_PORT=8765 \
    RECOG_TS_MCP_TRANSPORT=http \
    RECOG_TS_MODE=both

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY vendor/recog/xml ./vendor/recog/xml
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000 8765

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["both"]
