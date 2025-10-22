#!/bin/sh
set -e

# Use Railway's PORT environment variable, default to 80
export PORT=${PORT:-80}

echo "Starting nginx on port $PORT..."

# Replace PORT in nginx config template
envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start nginx
exec nginx -g 'daemon off;'
