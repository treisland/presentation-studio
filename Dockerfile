# Official library/node OCI index, verified against registry-1.docker.io.
FROM node:22-alpine@sha256:0e1754758c2df4cfa3e68d59e2e1b7374bb7fd9ea6328eaaacf15cc934af8202

ARG VERSION=development
ARG REVISION=unknown
LABEL org.opencontainers.image.title="Presentation Studio" \
      org.opencontainers.image.description="Static, browser-only Presentation Studio" \
      org.opencontainers.image.source="https://github.com/treisland/presentation-studio" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"

WORKDIR /app
# site/ must already be built or extracted from a verified release. Never rebuild here.
COPY docker/server.mjs docker/healthcheck.mjs ./docker/
COPY site/ ./site/
RUN node --input-type=module -e "import { loadSite } from './docker/server.mjs'; await loadSite('./site');" \
    && chmod -R a=rX /app
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["node", "docker/healthcheck.mjs"]
ENTRYPOINT ["node", "docker/server.mjs"]
