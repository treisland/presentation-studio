# Official library/node OCI index, verified against registry-1.docker.io.
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS runtime-base

ARG VERSION=development
ARG REVISION=unknown
LABEL org.opencontainers.image.title="Presentation Studio" \
      org.opencontainers.image.description="Static, browser-only Presentation Studio" \
      org.opencontainers.image.source="https://github.com/treisland/presentation-studio" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"

WORKDIR /app
# Runtime uses Node built-ins only. Do not ship unused package managers and
# their vulnerable transitive dependencies from the upstream development image.
RUN rm -rf /usr/local/lib/node_modules /opt/yarn-* \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/pnpm /usr/local/bin/pnpx
COPY docker/server.mjs docker/healthcheck.mjs ./docker/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "docker/healthcheck.mjs"]
ENTRYPOINT ["node", "docker/server.mjs"]

# Release publication explicitly selects this target. It never rebuilds HTML.
FROM runtime-base AS prebuilt
COPY site/ ./site/
RUN node --input-type=module -e "import { loadSite } from './docker/server.mjs'; await loadSite('./site');" \
    && chmod -R a=rX /app
USER 1000:1000

# Source builds need Docker only. Build scripts use built-ins and vendored code;
# npm, Playwright, Git and host-generated outputs are not build prerequisites.
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202 AS source-build
WORKDIR /build
COPY package.json build.config.json LICENSE THIRD_PARTY_NOTICES.md ./
COPY scripts/build.mjs scripts/site.mjs scripts/delivery.mjs ./scripts/
COPY src/ ./src/
COPY templates/ ./templates/
COPY vendor/ ./vendor/
COPY examples/ ./examples/
COPY docs/ai/ ./docs/ai/
ARG REVISION=unknown
RUN STUDIO_SOURCE_COMMIT="$REVISION" node scripts/build.mjs && node scripts/site.mjs local

# Last/default target also makes `docker build -t pres-studio .` work directly.
FROM runtime-base AS source
COPY --from=source-build /build/site/ ./site/
RUN node --input-type=module -e "import { loadSite } from './docker/server.mjs'; await loadSite('./site');" \
    && chmod -R a=rX /app
USER 1000:1000
