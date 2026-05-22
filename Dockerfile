# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/
RUN npm install --workspace=packages/backend --ignore-scripts

# Copy source and build
COPY packages/backend ./packages/backend
RUN npm run build --workspace=packages/backend

# Install Playwright Chromium
RUN cd packages/backend && npx playwright install chromium --with-deps

# ─── Stage 2: Production ───────────────────────────────────────────────────────
FROM node:22-alpine AS production

# Install Chromium dependencies for Playwright
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./
COPY packages/backend/package*.json ./packages/backend/

RUN npm install --workspace=packages/backend --production --ignore-scripts

COPY --from=builder /app/packages/backend/dist ./packages/backend/dist

EXPOSE 4000

ENV NODE_ENV=production

CMD ["node", "packages/backend/dist/server.js"]
