#!/bin/bash

# AiCli Docker Quick Start Script

set -e

echo "🚀 AiCli Docker Setup"
echo "===================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# LLM Provider API Keys
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
GLM_API_KEY=
OPENROUTER_API_KEY=

# Default provider (ollama, openai, anthropic, gemini, glm, openrouter)
DEFAULT_PROVIDER=ollama

# Ollama endpoint (for local Ollama)
OLLAMA_ENDPOINT=http://ollama:11434

# Project directory to mount
PROJECT_DIR=./workspace
EOF
    echo "✅ Created .env file. Please edit it to add your API keys."
    echo ""
fi

# Create workspace directory
if [ ! -d "workspace" ]; then
    mkdir -p workspace
    echo "📁 Created workspace directory"
fi

# Build or pull image
echo "🔨 Building Docker image..."
docker-compose build

# Start services
echo "🚀 Starting services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 3

# Show logs
echo ""
echo "📋 Service Status:"
docker-compose ps

echo ""
echo "✨ AiCli is ready!"
echo ""
echo "To start chatting:"
echo "  docker-compose exec aicli node dist/cli.js chat"
echo ""
echo "To view logs:"
echo "  docker-compose logs -f aicli"
echo ""
echo "To stop services:"
echo "  docker-compose down"
echo ""
