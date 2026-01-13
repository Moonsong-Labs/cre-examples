FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g bun

ARG VITE_CRE_HELPER_SERVER_URL=""
ARG VITE_CRE_HELPER_API_KEY=""
ARG VITE_WALLETCONNECT_PROJECT_ID="demo"

ENV VITE_CRE_HELPER_SERVER_URL=$VITE_CRE_HELPER_SERVER_URL
ENV VITE_CRE_HELPER_API_KEY=$VITE_CRE_HELPER_API_KEY
ENV VITE_WALLETCONNECT_PROJECT_ID=$VITE_WALLETCONNECT_PROJECT_ID

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN bun run prepare && bun run build

FROM oven/bun:1.3.4-alpine
WORKDIR /app
RUN bun add serve
COPY --from=builder /app/build/client ./build/client
EXPOSE 3000
CMD ["bunx", "serve", "-s", "build/client", "-l", "3000"]
