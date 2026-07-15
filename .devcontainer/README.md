# DevContainer Setup for Crypto KOL

This directory contains the development container configuration for VS Code, Docker Desktop, or GitHub Codespaces.

## Prerequisites

- [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Docker Compose)
- OR access to [GitHub Codespaces](https://github.com/features/codespaces)

## Quick Start

### Option 1: VS Code Dev Containers

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
3. Or run: `Cmd+Shift+P` → "Dev Containers: Reopen in Container"

### Option 2: GitHub Codespaces

1. Go to the repository on GitHub
2. Click "Code" → "Codespaces" → "Create codespace on main"

### Option 3: Manual Docker Compose

```bash
cd .devcontainer
docker-compose -f docker-compose.dev.yml up -d
docker exec -it crypto-kol-dev bash
```

## Environment Setup

1. Copy the environment template:
   ```bash
   cp ../.env.example ../.env
   ```

2. Edit `.env` and fill in your API keys:
   - `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (at least one required)
   - Social media API keys (Facebook, Twitter, Telegram)

3. The container will automatically:
   - Install backend dependencies (`npm install`)
   - Install frontend dependencies (`cd frontend && npm install`)
   - Seed the database with initial data

## Development Commands

### Backend (API Server)

```bash
# Start development server with hot reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

### Frontend (React App)

```bash
cd frontend

# Start Vite dev server
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build
```

### Database

```bash
# Seed database with initial data
npm run db:seed

# Access SQLite database
sqlite3 data/koldb.sqlite
```

## Port Mapping

| Service | Container Port | Host Port | Description |
|---------|---------------|-----------|-------------|
| Backend API | 3000 | 3000 | Fastify API server |
| Frontend | 5173 | 5173 | Vite dev server |

## Volumes

- `backend-node-modules`: Backend node_modules (avoids host/container conflicts)
- `frontend-node-modules`: Frontend node_modules
- `sqlite-data`: SQLite database persistence

## Troubleshooting

### Port Already in Use

If ports 3000 or 5173 are already in use:

1. Edit `docker-compose.dev.yml` and change the port mappings
2. Or stop the conflicting services

### Permission Issues

If you encounter permission issues:

```bash
# Fix ownership
docker exec -u root crypto-kol-dev chown -R node:node /workspace
```

### Database Locked

If you see "database is locked" errors:

```bash
# Stop all containers
docker-compose -f docker-compose.dev.yml down

# Remove database volume (WARNING: deletes all data)
docker volume rm crypto-kol_sqlite-data

# Restart
docker-compose -f docker-compose.dev.yml up -d
```

### Node Modules Issues

If node_modules are corrupted:

```bash
# Remove volumes
docker volume rm crypto-kol_backend-node-modules
docker volume rm crypto-kol_frontend-node-modules

# Rebuild
docker-compose -f docker-compose.dev.yml up -d --build
```

## VS Code Extensions

The devcontainer automatically installs these extensions:

- ESLint - JavaScript/TypeScript linting
- Prettier - Code formatting
- Tailwind CSS IntelliSense - Tailwind CSS support
- ES7+ React/Redux/React-Native snippets - React snippets
- TypeScript Next - Latest TypeScript features

## Additional Tools

The devcontainer includes:

- Git & Git LFS
- SSH client
- SQLite3 CLI
- Python 3 (for native module compilation)
- Vim, less, jq, procps

## Architecture Notes

- Backend: Fastify 5 + TypeScript ESM + Node 22
- Frontend: React 19 + Vite 8 + Tailwind v4
- Database: SQLite with WAL mode
- Hot reload: `tsx watch` for backend, Vite HMR for frontend
- Database migrations run automatically on server boot

## Support

For issues or questions, refer to:
- `AGENTS.md` - Project architecture and conventions
- `docs/architecture.md` - Detailed system documentation
