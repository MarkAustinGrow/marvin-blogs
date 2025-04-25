FROM node:18-alpine

# Install cron
RUN apk add --no-cache dcron

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Build TypeScript code
RUN npm run build

# Create logs directory
RUN mkdir -p /app/logs

# Set up cron job to run twice a day (9 AM and 3 PM)
RUN echo "0 9,15 * * * cd /app && node dist/index.js >> /app/logs/cron.log 2>&1" > /etc/crontabs/root

# Set environment variables
ENV NODE_ENV=production

# Start cron in the foreground
CMD ["crond", "-f", "-d", "8"]
