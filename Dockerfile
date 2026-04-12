# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Copy configuration files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the NestJS application
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /usr/src/app

# Copy only the production dependencies and built files
COPY package*.json ./
RUN npm install --only=production

COPY --from=builder /usr/src/app/dist ./dist

# Expose the port defined in main.ts
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]