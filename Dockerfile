# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker caching
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies
RUN npm install

# Copy the rest of your source code
COPY . .

# Generate Prisma Client (This fixes your $connect errors!)
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Expose the port your app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]