# syntax=docker/dockerfile:1

FROM node:22-bookworm

# Install development dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    git-lfs \
    openssh-client \
    python3 \
    make \
    g++ \
    vim \
    less \
    procps \
    jq \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Install custom CA certificates if they exist
COPY certs/ca.crt /usr/local/share/ca-certificates/custom-ca.crt
RUN if [ -f /usr/local/share/ca-certificates/custom-ca.crt ]; then \
    update-ca-certificates; \
    fi

# Set Node.js environment variables
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/ca-certificates.crt

# Create workspace directory
WORKDIR /workspace

# Install global development tools
RUN npm install -g \
    typescript@latest \
    tsx@latest \
    eslint@latest \
    prettier@latest \
    @typescript-eslint/parser \
    @typescript-eslint/eslint-plugin

# Switch to node user
USER node

# Set working directory
WORKDIR /workspace

# Default command (will be overridden by docker-compose)
CMD ["sleep", "infinity"]
