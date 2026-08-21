# Multi-stage: build with dev deps, ship only prod deps + compiled dist.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist

# Fly terminates TLS at the edge; the process itself speaks plain HTTP/WS here.
ENV PORT=8787
EXPOSE 8787

# Run unprivileged.
USER node

CMD ["node", "dist/index.js"]
