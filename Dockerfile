# ChatFlow Pro — production-style runtime (default PORT=3030)
# Build: docker build -t chatflow-pro .
# Run:   docker run --rm -p 3030:3030 chatflow-pro

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY shared ./shared
COPY src ./src
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3030
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
RUN chown -R node:node /app
USER node
EXPOSE 3030
CMD ["node", "dist/src/index.js"]
