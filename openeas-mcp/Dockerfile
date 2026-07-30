# OpenEAS reference implementation.
#
# Read-only. No origination capability. No audio. See ../openeas/SPEC.md §2.

FROM node:20-alpine

WORKDIR /app

# Install deps first so layer caching survives source edits.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-fund --no-audit

COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY server.js ./
COPY README.md ./

# Fail the build if an EAS audio artifact or any tone-synthesis code is present.
# 47 CFR §11.45(a) reaches recordings and simulations, so this is enforced at
# build time rather than trusted to review.
RUN node scripts/no-eas-audio.js

# Drop privileges. The server needs no write access to anything.
USER node

ENV PORT=3100
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3100)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
