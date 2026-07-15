#!/bin/bash

# Development environment setup script
# Run this inside the devcontainer after it starts

set -e

echo "🚀 Setting up Crypto KOL development environment..."

# Check if .env exists, if not create from example
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .devcontainer/.env.example .env
    echo "⚠️  Please edit .env and add your API keys before starting the server"
fi

# Install backend dependencies
echo "📦 Installing backend dependencies..."
npm install

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Seed database
echo "🗄️  Seeding database..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "To start development:"
echo "  Backend:  npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Backend will be available at: http://localhost:3000"
echo "Frontend will be available at: http://localhost:5173"
