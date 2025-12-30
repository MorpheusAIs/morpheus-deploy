# Morpheus PostgreSQL Sidecar
# Optimized for durable AI agent execution

FROM postgres:15-alpine

# Install useful extensions
RUN apk add --no-cache \
    postgresql15-contrib

# Create custom configuration
COPY postgresql.conf /etc/postgresql/postgresql.conf
COPY pg_hba.conf /etc/postgresql/pg_hba.conf

# Initialize database with Morpheus schema
COPY init/ /docker-entrypoint-initdb.d/

# Use custom configuration
CMD ["postgres", "-c", "config_file=/etc/postgresql/postgresql.conf"]

EXPOSE 5432

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD pg_isready -U postgres || exit 1
