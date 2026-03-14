# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
# Copie uniquement les manifests pour profiter du cache Docker layer
COPY package.json package-lock.json* ./
# npm ci : installation déterministe depuis le lockfile
RUN npm ci --omit=dev --ignore-scripts

# ── Runtime stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# Sécurité : création d'un utilisateur non-root dédié
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

# Copie des dépendances depuis le stage builder
COPY --from=builder /app/node_modules ./node_modules
# Copie du code source
COPY --chown=appuser:appgroup . .

# Suppression de fichiers inutiles en production
RUN rm -f .eslintrc* .env* *.md

# Passage à l'utilisateur non-root
USER appuser

EXPOSE 8080
# Healthcheck intégré
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/status || exit 1

CMD ["node", "server.js"]
