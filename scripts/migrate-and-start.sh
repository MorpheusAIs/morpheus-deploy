#!/bin/bash
# Morpheus Agent Entrypoint Script
# Ensures database migrations run before agent starts

set -e

echo "=========================================="
echo "  Morpheus Agent Startup"
echo "=========================================="

# Configuration
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
POSTGRES_DB="${POSTGRES_DB:-workflow}"
MAX_RETRIES="${MAX_RETRIES:-30}"
RETRY_INTERVAL="${RETRY_INTERVAL:-2}"

# Build connection string
export WORKFLOW_POSTGRES_URL="postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}"

echo "Waiting for PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}..."

# Wait for PostgreSQL to be ready
retry_count=0
until pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" > /dev/null 2>&1; do
    retry_count=$((retry_count + 1))
    if [ $retry_count -ge $MAX_RETRIES ]; then
        echo "ERROR: PostgreSQL not available after ${MAX_RETRIES} retries"
        exit 1
    fi
    echo "PostgreSQL not ready (attempt ${retry_count}/${MAX_RETRIES}), waiting ${RETRY_INTERVAL}s..."
    sleep $RETRY_INTERVAL
done

echo "PostgreSQL is ready!"

# Run migrations
echo "Running database migrations..."
if [ -f "/app/scripts/migrate.js" ]; then
    node /app/scripts/migrate.js
elif [ -f "/app/dist/migrate.js" ]; then
    node /app/dist/migrate.js
else
    echo "No migration script found, skipping..."
fi

echo "Migrations complete!"

# Start the agent
echo "Starting Morpheus Agent..."
echo "=========================================="

# Execute the main application
exec "$@"
