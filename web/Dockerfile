# syntax=docker/dockerfile:1
# Builds the SPA and serves it with Caddy (which also proxies /api).
FROM node:24-alpine AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
# Zona Play is deferred (#51): its pages ship only when built with true.
ARG VITE_PLAY_ENABLED=false
ENV VITE_PLAY_ENABLED=$VITE_PLAY_ENABLED
RUN npx vite build

FROM caddy:2-alpine
COPY --from=build /src/dist /srv
