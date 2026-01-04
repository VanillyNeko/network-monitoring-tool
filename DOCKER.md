# Docker Deployment Guide

Complete guide for running the Network Monitoring Dashboard with Docker and Docker Compose.

**Related Pages:** [Home](Home) | [Installation](Installation) | [Quick Start](Quick-Start)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Docker Compose](#docker-compose)
- [Manual Docker](#manual-docker)
- [Configuration](#configuration)
- [Volumes](#volumes)
- [Networking](#networking)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10+ installed
- Docker Compose 2.0+ installed (for docker-compose)
- `config.json` file created from `config.json.example`

## Quick Start

### 1. Create Configuration

```bash
cp config.json.example config.json
# Edit config.json with your settings
```

### 2. Start with Docker Compose

```bash
docker-compose up -d
```

### 3. Access Dashboard

Open `http://localhost:5643` in your browser.

### 4. View Logs

```bash
docker-compose logs -f
```

### 5. Stop

```bash
docker-compose down
```

## Docker Compose

### Basic Usage

```bash
# Start in background
docker-compose up -d

# View logs
docker-compose logs -f network-monitor

# Stop
docker-compose down

# Restart
docker-compose restart

# Rebuild after changes
docker-compose up -d --build
```

### Development Mode

Use `docker-compose.dev.yml` for development:

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Environment Variables

Set the web port via environment variable:

```bash
WEB_PORT=8080 docker-compose up -d
```

Or create a `.env` file:

```env
WEB_PORT=8080
```

### Custom Configuration

Edit `docker-compose.yml` to customize:

- Port mappings
- Volume mounts
- Environment variables
- Network configuration
- Resource limits

## Manual Docker

### Build Image

```bash
docker build -t network-monitoring-tool:latest .
```

### Run Container

```bash
docker run -d \
  --name network-monitoring-tool \
  -p 5643:5643 \
  -v $(pwd)/config.json:/app/config.json:ro \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  network-monitoring-tool:latest
```

### Container Management

```bash
# View logs
docker logs -f network-monitoring-tool

# Stop container
docker stop network-monitoring-tool

# Start container
docker start network-monitoring-tool

# Remove container
docker rm network-monitoring-tool

# Execute command in container
docker exec -it network-monitoring-tool sh
```

## Configuration

### Mounting config.json

The `config.json` file must be mounted as a volume:

```yaml
volumes:
  - ./config.json:/app/config.json:ro
```

**Important:**
- Use `:ro` (read-only) for security
- Ensure file permissions are correct (600 recommended)
- Never commit `config.json` to version control

### Environment Variables

You can override configuration via environment variables (requires code modification):

```yaml
environment:
  - NODE_ENV=production
  - WEB_PORT=5643
  - CHECK_INTERVAL=60
```

## Volumes

### Required Volumes

1. **config.json** - Configuration file (read-only)
   ```yaml
   - ./config.json:/app/config.json:ro
   ```

2. **logs** - Log directory (read-write)
   ```yaml
   - ./logs:/app/logs
   ```

### Volume Permissions

The container runs as non-root user (UID 1001). Ensure volumes have correct permissions:

```bash
# Set log directory permissions
mkdir -p logs
chmod 755 logs

# Set config file permissions
chmod 600 config.json
```

## Networking

### Port Mapping

Default port mapping:

```yaml
ports:
  - "5643:5643"
```

Change the host port:

```yaml
ports:
  - "8080:5643"  # Host:Container
```

### Network Isolation

The docker-compose setup creates an isolated network:

```yaml
networks:
  - monitoring-network
```

Connect other containers to the same network:

```yaml
networks:
  - monitoring-network
```

## Health Checks

### Built-in Health Check

The Docker image includes a health check:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5643/api/status', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
```

### Check Health Status

```bash
# Docker
docker ps
# Look for "healthy" status

# Docker Compose
docker-compose ps
```

### Manual Health Check

```bash
curl http://localhost:5643/api/status
```

## Using Pre-built Images

### GitHub Container Registry

The `docker-compose.yml` file is configured to use pre-built images from GitHub Container Registry by default. **Images are automatically built and pushed on every push to the main branch**, so `:latest` always points to the most recent code.

Pull the latest image manually:

```bash
docker pull ghcr.io/vanillyneko/network-monitoring-tool:latest
```

Or a specific version:

```bash
docker pull ghcr.io/vanillyneko/network-monitoring-tool:v1.0.0
```

### Building Locally

If you want to build locally instead of using the pre-built image, edit `docker-compose.yml`:

```yaml
services:
  network-monitor:
    build:
      context: .
      dockerfile: Dockerfile
    # Comment out or remove the image line
```

## Production Deployment

### Security Considerations

1. **Use read-only mounts** for config.json
2. **Set proper file permissions** (600 for config.json)
3. **Use secrets management** for sensitive data
4. **Enable HTTPS** via reverse proxy
5. **Limit container resources**

### Resource Limits

Add resource limits to docker-compose.yml:

```yaml
services:
  network-monitor:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### Reverse Proxy Setup

Use nginx or Traefik as reverse proxy:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - network-monitor
```

## Troubleshooting

### Container Won't Start

1. **Check logs:**
   ```bash
   docker-compose logs network-monitor
   ```

2. **Verify config.json:**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('config.json', 'utf8'))"
   ```

3. **Check file permissions:**
   ```bash
   ls -l config.json
   ```

### Application Not Accessible

1. **Check port mapping:**
   ```bash
   docker ps
   # Verify port is mapped correctly
   ```

2. **Check firewall:**
   ```bash
   # Linux
   sudo ufw status
   ```

3. **Test from inside container:**
   ```bash
   docker exec -it network-monitoring-tool wget -O- http://localhost:5643/api/status
   ```

### Health Check Failing

1. **Check application logs:**
   ```bash
   docker logs network-monitoring-tool
   ```

2. **Verify config.json is valid:**
   ```bash
   docker exec network-monitoring-tool node -e "require('./config.json')"
   ```

3. **Check if port is listening:**
   ```bash
   docker exec network-monitoring-tool netstat -tuln | grep 5643
   ```

### Permission Issues

1. **Fix log directory:**
   ```bash
   sudo chown -R 1001:1001 logs
   ```

2. **Fix config file:**
   ```bash
   chmod 600 config.json
   ```

## Advanced Usage

### Multi-Architecture Builds

Build for multiple architectures:

```bash
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t network-monitoring-tool:latest .
```

### Docker Swarm

Deploy to Docker Swarm:

```bash
docker stack deploy -c docker-compose.yml network-monitor
```

### Kubernetes

Convert docker-compose to Kubernetes:

```bash
kompose convert
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Installation Guide](Installation)
- [Troubleshooting](Troubleshooting)

---

**Need help?** Check the [Troubleshooting](Troubleshooting) guide or [open an issue](https://github.com/VanillyNeko/network-monitoring-tool/issues)

