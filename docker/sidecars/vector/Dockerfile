# Morpheus Vector Logging Sidecar
# Real-time log shipping for decentralized deployments

FROM timberio/vector:0.26.0-alpine

# Copy configuration
COPY vector.toml /etc/vector/vector.toml

# Create log directory
RUN mkdir -p /var/log/app

# Run as non-root user
USER vector

CMD ["vector", "--config", "/etc/vector/vector.toml"]

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
    CMD vector top --interval 1 2>/dev/null || exit 1
