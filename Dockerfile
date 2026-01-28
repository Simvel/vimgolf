# Build stage for client
FROM node:20-alpine AS client-build

WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Build stage for server dependencies (native modules)
FROM node:20-alpine AS server-deps
WORKDIR /app/server
# Install build tools for native modules (python3, make, g++) - required for better-sqlite3
RUN apk add --no-cache python3 make g++
COPY server/package*.json ./
# Install dependencies, forcing a build from source to match the alpine architecture
RUN npm install --production --build-from-source

# Final stage
FROM node:20-alpine
WORKDIR /app/server

# Install runtime dependencies if any (better-sqlite3 links against libstdc++)
# Usually not strictly needed if built statically, but good practice
RUN apk add --no-cache libstdc++

# Copy built node_modules
COPY --from=server-deps /app/server/node_modules ./node_modules
# Copy source code
COPY server/ .
# Copy client build
COPY --from=client-build /app/client/dist ../client/dist

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
