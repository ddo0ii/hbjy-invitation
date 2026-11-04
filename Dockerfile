FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_KAKAO_JAVASCRIPT_KEY
ENV VITE_KAKAO_JAVASCRIPT_KEY=${VITE_KAKAO_JAVASCRIPT_KEY}
RUN npm run build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 DATA_DIR=/app/data
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && mkdir -p /app/data && chown node:node /app/data
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/server/schema.sql ./server/schema.sql
USER node
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "dist-server/index.js"]
