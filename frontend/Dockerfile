# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production=false

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy nginx config template and entrypoint script
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy built files from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Railway will set PORT dynamically
EXPOSE ${PORT:-80}

# Use custom entrypoint to handle PORT env variable
ENTRYPOINT ["/docker-entrypoint.sh"]
