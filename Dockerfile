# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Install bun
RUN apk add --no-cache curl bash && \
    curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN bun build src/server.ts --target node --outdir dist

# Expose port
EXPOSE 4000

# Start the application
CMD ["bun", "run", "dist/server.js"]