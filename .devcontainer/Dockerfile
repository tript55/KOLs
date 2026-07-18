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
    python3-venv \
    make \
    g++ \
    vim \
    less \
    procps \
    jq \
    sqlite3 \
    zsh \
    zsh-autosuggestions \
    zsh-syntax-highlighting \
    && rm -rf /var/lib/apt/lists/* \
    && chsh -s /bin/zsh node

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

# Install uv + Graphify CLI so `graphify` is available in the container.
RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    mv /root/.local/bin/uv /usr/local/bin/uv

# Switch to node user
USER node

# Install Oh My Zsh
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Append zsh-autosuggestions and zsh-syntax-highlighting to .zshrc
RUN echo 'source /usr/share/zsh-autosuggestions/zsh-autosuggestions.zsh' >> /home/node/.zshrc && \
    echo 'source /usr/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh' >> /home/node/.zshrc

RUN uv tool install --python 3.11 graphifyy --system-certs
ENV PATH="/home/node/.local/bin:${PATH}"

# Set working directory
WORKDIR /workspace

RUN graphify install

# Default command (will be overridden by docker-compose)
CMD ["sleep", "infinity"]
