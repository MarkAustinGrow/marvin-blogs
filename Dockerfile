FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copy package files and install dependencies (including dev dependencies for build)
COPY package*.json ./
RUN npm install --include=dev

# Copy application code
COPY . .

# Build TypeScript code
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs

# Make run.sh executable
RUN chmod +x /app/run.sh

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose the web server port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

# Run the application
CMD ["/bin/sh", "/app/run.sh"]
