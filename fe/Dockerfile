FROM node:22-alpine AS builder
WORKDIR /app

RUN npm install -g bun

ARG VITE_CRE_HELPER_SERVER_URL
ARG VITE_CRE_HELPER_API_KEY
ARG VITE_WALLETCONNECT_PROJECT_ID

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY . .
RUN VITE_CRE_HELPER_SERVER_URL="${VITE_CRE_HELPER_SERVER_URL}" \
    VITE_CRE_HELPER_API_KEY="${VITE_CRE_HELPER_API_KEY}" \
    VITE_WALLETCONNECT_PROJECT_ID="${VITE_WALLETCONNECT_PROJECT_ID}" \
    bun run prepare && npm run build

FROM nginx:alpine
COPY --from=builder /app/build/client /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
