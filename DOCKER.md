# Docker Deployment Guide

## Quick Start

```bash
chmod +x docker-start.sh
./docker-start.sh
```

## Manual Setup

### 1. Build Image

```bash
docker-compose build
```

### 2. Configure Environment

Edit `.env` file with your API keys:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEFAULT_PROVIDER=openai
```

### 3. Start Services

```bash
docker-compose up -d
```

### 4. Run AiCli

```bash
docker-compose exec aicli node dist/cli.js chat
```

## Advanced Usage

### Using Local Ollama

Start Ollama service:

```bash
docker-compose up -d ollama
```

Pull a model:

```bash
docker-compose exec ollama ollama pull llama3.2
```

### Mounting Your Project

Edit `docker-compose.yml`:

```yaml
volumes:
  - /path/to/your/project:/workspace
```

### Running Commands

Execute shell commands in the container:

```bash
docker-compose exec aicli sh
```

### Persistent Sessions

Sessions are stored in the `aicli-data` volume and persist across container restarts.

View sessions:

```bash
docker volume inspect aicli-data
```

### Custom Configuration

Override default config:

```bash
docker-compose run --rm aicli node dist/cli.js setup
```

## Troubleshooting

### Container Won't Start

Check logs:
```bash
docker-compose logs aicli
```

### API Keys Not Working

Verify environment variables:
```bash
docker-compose exec aicli env | grep API_KEY
```

### Permission Issues

Ensure proper ownership:
```bash
docker-compose exec aicli ls -la /home/aicli/.aicli
```

### Network Issues

Check Ollama connectivity:
```bash
docker-compose exec aicli wget -qO- http://ollama:11434/api/version
```

## Production Deployment

### Security Best Practices

1. **Use Secrets Management**
   ```bash
   docker secret create openai_api_key ./openai_key.txt
   ```

2. **Read-only Root Filesystem**
   ```yaml
   security_opt:
     - no-new-privileges:true
   read_only: true
   ```

3. **Resource Limits**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

### CI/CD Integration

GitHub Actions example:

```yaml
- name: Build Docker Image
  run: docker build -t aicli:${{ github.sha }} .

- name: Run Tests in Container
  run: docker run aicli:${{ github.sha }} npm test
```

## Image Size Optimization

Current image size: ~150MB (Alpine-based)

Further optimization:
- Multi-stage builds (already implemented)
- Prune dev dependencies
- Use distroless base image

## Updates

Pull latest image:
```bash
docker-compose pull
docker-compose up -d
```

Rebuild from source:
```bash
docker-compose build --no-cache
```
