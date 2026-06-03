# Stage 1: Build Shared Module
FROM node:20-alpine AS build-shared
WORKDIR /app/shared
COPY shared/package.json ./
RUN npm install
COPY shared/ ./
RUN npm run build

# Stage 2: Build React Frontend
FROM node:20-alpine AS build-frontend
WORKDIR /app
# Copy built shared module first
COPY --from=build-shared /app/shared /app/shared
# Now install and build frontend
WORKDIR /app/frontend
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# Stage 3: Build Node Backend
FROM node:20-alpine AS build-backend
WORKDIR /app
# Copy built shared module first
COPY --from=build-shared /app/shared /app/shared
# Now install and build backend
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install
COPY backend/ ./
RUN npm run build

# Stage 4: Assemble Production Image
FROM node:20-alpine
WORKDIR /app

# Copy built backend application
COPY --from=build-backend /app/backend/dist /app/backend/dist
COPY --from=build-backend /app/backend/package.json /app/backend/
COPY --from=build-backend /app/backend/node_modules /app/backend/node_modules

# Copy shared package so symlinks resolve correctly
COPY --from=build-shared /app/shared /app/shared

# Copy built frontend assets to serve statically from backend
COPY --from=build-frontend /app/frontend/dist /app/public

# Run Environment Configs
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV PUBLIC_DIR=/app/public

WORKDIR /app/backend
EXPOSE 3001
VOLUME ["/app/data"]

CMD ["node", "dist/server.js"]
