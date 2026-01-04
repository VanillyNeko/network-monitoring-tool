# Network Monitoring Dashboard

A comprehensive monitoring system for tracking multiple internet providers and network connections with a beautiful web dashboard, Keycloak authentication, and Discord notifications.

![Dashboard Preview](https://img.shields.io/badge/Status-Active-success) ![Node.js](https://img.shields.io/badge/Node.js-18%2B-green) ![License](https://img.shields.io/badge/License-MIT-blue)

## Features

- 🌐 **Multi-Provider Monitoring** - Monitor T-Mobile, AT&T, Cable Internet, and more
- 🔐 **Keycloak Authentication** - Secure access with role-based permissions
- 📊 **Real-Time Dashboard** - Beautiful web interface with multiple themes (Light, Dark, Anime)
- 🔔 **Discord Notifications** - Get alerts when services go down or come back up
- 🏠 **UniFi Integration** - Detailed network statistics from UniFi gateways
- 📈 **Comprehensive Metrics** - Signal strength, bandwidth, uptime, and more
- 🎨 **Themeable UI** - Customizable themes with smooth transitions
- 🔒 **Role-Based Access** - Public status view, detailed view requires authentication
- 📱 **Embeddable Widget** - Embed the dashboard in other websites or status pages
- 🔄 **Dual Monitoring** - Monitor providers both directly and via UniFi gateway WAN status

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Docker Deployment](#docker-deployment)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Keycloak Setup](#keycloak-setup)
- [Provider Configuration](#provider-configuration)
- [Discord Webhooks](#discord-webhooks)
- [PM2 Process Management](#pm2-process-management)
- [Embedding](#embedding)
- [Troubleshooting](#troubleshooting)
- [API Endpoints](#api-endpoints)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Installation

For detailed installation instructions, see [docs/INSTALLATION.md](docs/INSTALLATION.md).

### Quick Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/VanillyNeko/network-monitoring-tool.git
   cd network-monitoring-tool
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create configuration:**
   ```bash
   cp config.json.example config.json
   # Edit config.json with your settings
   ```

4. **Start the application:**
   ```bash
   npm start
   # Or with PM2 (recommended):
   npm run pm2:start
   ```

5. **Access the dashboard:**
   Open `http://localhost:5643` in your browser

See [docs/INSTALLATION.md](docs/INSTALLATION.md) for complete installation guide, troubleshooting, and advanced setup.

## Quick Start

Get up and running in 5 minutes! See the [Quick Start Guide](docs/QUICKSTART.md) for a streamlined setup.

### Basic Setup (No Authentication)

1. **Clone and install:**
   ```bash
   git clone https://github.com/VanillyNeko/network-monitoring-tool.git
   cd network-monitoring-tool
   npm install
   ```

2. **Create configuration:**
   ```bash
   cp config.json.example config.json
   # Edit config.json with your provider settings
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Access the dashboard:**
   Open `http://localhost:5643` in your browser

For detailed instructions, see [docs/QUICKSTART.md](docs/QUICKSTART.md) or [docs/INSTALLATION.md](docs/INSTALLATION.md).

### With Docker (Recommended for Production)

1. **Create configuration:**
   ```bash
   cp config.json.example config.json
   # Edit config.json with your settings
   ```

2. **Start with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Access the dashboard:**
   Open `http://localhost:5643` in your browser

See [DOCKER.md](DOCKER.md) for detailed Docker deployment guide.

### With PM2 (Alternative)

1. **Install PM2 globally:**
   ```bash
   npm install -g pm2
   ```

2. **Note:** The `ecosystem.config.js` file is included for PM2 configuration. If you need to customize it, edit the file before starting.

3. **Start with PM2:**
   ```bash
   npm run pm2:start
   ```

4. **Check status:**
   ```bash
   npm run pm2:status
   ```

5. **View logs:**
   ```bash
   npm run pm2:logs
   ```

6. **Enable auto-start on boot:**
   ```bash
   pm2 startup
   pm2 save
   ```

## Project Structure

```
network-monitoring-tool/
├── monitor.js              # Main application file
├── package.json           # Node.js dependencies and scripts
├── config.json.example    # Example configuration (copy to config.json)
├── ecosystem.config.js    # PM2 configuration (if using PM2)
├── public/                # Web dashboard files
│   ├── index.html        # Main dashboard page
│   └── embed.html        # Embedding instructions
├── docs/                  # Documentation
│   ├── API.md            # API endpoint documentation
│   ├── KEYCLOAK_SETUP.md # Keycloak authentication setup
│   ├── PROVIDER_SETUP.md # Provider configuration guide
│   ├── DISCORD_SETUP.md  # Discord webhook setup
│   ├── PM2_SETUP.md      # PM2 process management guide
│   ├── EMBEDDING.md      # Embedding dashboard guide
│   ├── TROUBLESHOOTING.md # Troubleshooting guide
│   └── WIKI_INDEX.md     # Documentation index
├── LICENSE                # MIT License
└── README.md             # This file
```

## Configuration

The main configuration file is `config.json`. Copy the example file and edit it:

```json
{
  "providers": [
    {
      "name": "Provider Name",
      "ip": "192.168.1.1",
      "api_url": "http://192.168.1.1/api/status",
      "health_key_path": ["status", "connected"],
      "signal_keys": ["rsrp", "rsrq", "sinr"],
      "gateway_wan_port": "wan2"
    }
  ],
  "discord": {
    "webhook_url": "https://discord.com/api/webhooks/..."
  },
  "keycloak": {
    "enabled": false,
    "server_url": "https://keycloak.example.com",
    "realm": "your-realm",
    "client_id": "cell-monitoring",
    "client_secret": "your-secret",
    "required_role": "monitoring-access",
    "confidential_port": 0,
    "base_url": "https://your-domain.com",
    "use_wildcard_redirect": true
  },
  "session_secret": "change-this-to-a-random-secret",
  "check_interval_seconds": 60,
  "web_port": 5643
}
```

### Configuration Options

| Option | Description | Required |
|--------|-------------|----------|
| `providers` | Array of internet providers to monitor | Yes |
| `discord.webhook_url` | Discord webhook URL for notifications | No |
| `keycloak.enabled` | Enable Keycloak authentication | No |
| `keycloak.server_url` | Keycloak server URL | If enabled |
| `keycloak.realm` | Keycloak realm name | If enabled |
| `keycloak.client_id` | Keycloak client ID | If enabled |
| `keycloak.client_secret` | Keycloak client secret | If enabled |
| `keycloak.required_role` | Role required for detailed access | If enabled |
| `keycloak.confidential_port` | Keycloak confidential port (usually 0) | If enabled |
| `keycloak.base_url` | Base URL for redirect URIs (optional, auto-detected if not set) | No |
| `keycloak.use_wildcard_redirect` | Use wildcard redirect URIs in Keycloak (informational) | No |
| `session_secret` | Secret for session encryption | Yes |
| `check_interval_seconds` | How often to check providers (seconds) | Yes |
| `web_port` | Port for web dashboard | Yes |
| `allow_embedding` | Allow iframe embedding of dashboard | No |

**Note:** The `config.json` file is not included in the repository for security reasons. Always use `config.json.example` as a template.

## Keycloak Setup

Keycloak provides secure authentication and role-based access control. See [docs/KEYCLOAK_SETUP.md](docs/KEYCLOAK_SETUP.md) for detailed instructions.

### Quick Keycloak Setup

1. **Install and configure Keycloak server**
2. **Create a new realm** (or use existing)
3. **Create a confidential client:**
   - Client ID: `cell-monitoring`
   - Access Type: `confidential`
   - Valid Redirect URIs: `https://your-domain.com/callback` and `https://your-domain.com/?logged_out=true`
   - Or use wildcard: `https://your-domain.com/*` (if supported by your Keycloak version)
   - Copy the Client Secret
4. **Create a role** (e.g., `monitoring-access`)
5. **Assign role to users**
6. **Update `config.json`** with Keycloak settings

See [docs/KEYCLOAK_SETUP.md](docs/KEYCLOAK_SETUP.md) for step-by-step instructions.

## Provider Configuration

### T-Mobile Home Internet

```json
{
  "name": "T-Mobile Home Internet",
  "ip": "192.168.12.1",
  "api_url": "http://192.168.12.1/TMI/v1/gateway?get=all",
  "health_key_path": ["connectionStatus", "connected"],
  "signal_keys": ["rsrp", "rsrq", "sinr", "band"],
  "requires_auth": false,
  "gateway_wan_port": "wan2"
}
```

### AT&T Business Wireless

```json
{
  "name": "AT&T Business Wireless",
  "ip": "192.168.45.1",
  "api_url": "http://192.168.45.1/GetNvInfo",
  "alt_api_urls": [
    "http://192.168.45.1/cgi-bin/GetNvInfo.ha"
  ],
  "health_key_path": ["ConnUP", "true"],
  "signal_keys": ["RSRP", "RSRQ", "SINR", "Band"],
  "requires_auth": true,
  "gateway_wan_port": "wan3"
}
```

### UniFi Cable Internet (UCI)

```json
{
  "name": "Cable Internet (via UniFi Gateway)",
  "type": "unifi_api",
  "controller_url": "https://10.27.27.1",
  "api_key": "your-unifi-api-key",
  "site": "default",
  "wan_port": "wan1",
  "signal_keys": []
}
```

See [docs/PROVIDER_SETUP.md](docs/PROVIDER_SETUP.md) for detailed provider configuration.

## Discord Webhooks

### Setting Up Discord Notifications

1. **Go to your Discord server settings**
2. **Navigate to:** Integrations → Webhooks
3. **Click:** "New Webhook"
4. **Configure:**
   - Name: "Network Monitor"
   - Channel: Select notification channel
   - Copy the webhook URL
5. **Add to `config.json`:**
   ```json
   "discord": {
     "webhook_url": "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
   }
   ```

### Notification Types

- 🚨 **Service Down** - Sent when a provider goes offline
- ✅ **Service Restored** - Sent when a provider comes back online

See [docs/DISCORD_SETUP.md](docs/DISCORD_SETUP.md) for more details.

## PM2 Process Management

PM2 keeps your application running and automatically restarts it if it crashes.

### Available Commands

```bash
npm run pm2:start    # Start the application
npm run pm2:stop     # Stop the application
npm run pm2:restart  # Restart the application
npm run pm2:delete   # Remove from PM2
npm run pm2:logs     # View logs in real-time
npm run pm2:status   # Check application status
```

### Auto-Start on Boot

```bash
# Generate startup script
pm2 startup

# Save current PM2 process list
pm2 save
```

### Logs

PM2 logs are stored in the `logs/` directory:
- `logs/pm2-out.log` - Standard output
- `logs/pm2-error.log` - Error output

View logs:
```bash
npm run pm2:logs
# Or
pm2 logs cell-monitoring
```

See [docs/PM2_SETUP.md](docs/PM2_SETUP.md) for detailed PM2 configuration.

## Embedding

The dashboard can be embedded as a widget or iframe in other websites or status pages.

### Basic Embedding

```html
<iframe src="http://your-server:5643?mode=widget&theme=dark" 
        width="100%" 
        height="600px" 
        frameborder="0">
</iframe>
```

### URL Parameters

- `mode=widget` - Widget mode (hides header/footer)
- `theme=light|dark|anime` - Set theme
- `compact=true` - Compact layout
- `header=false` - Hide header
- `auth=false` - Hide authentication section

See [docs/EMBEDDING.md](docs/EMBEDDING.md) for detailed embedding instructions and examples.

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[INSTALLATION.md](docs/INSTALLATION.md)** - Complete installation guide
- **[API.md](docs/API.md)** - Complete API endpoint documentation
- **[KEYCLOAK_SETUP.md](docs/KEYCLOAK_SETUP.md)** - Step-by-step Keycloak authentication setup
- **[PROVIDER_SETUP.md](docs/PROVIDER_SETUP.md)** - Detailed provider configuration examples
- **[DISCORD_SETUP.md](docs/DISCORD_SETUP.md)** - Discord webhook configuration
- **[PM2_SETUP.md](docs/PM2_SETUP.md)** - PM2 process management guide
- **[EMBEDDING.md](docs/EMBEDDING.md)** - Embedding dashboard as widget/iframe
- **[TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)** - Common issues and solutions
- **[WIKI_INDEX.md](docs/WIKI_INDEX.md)** - Documentation index

## Troubleshooting

### Common Issues

#### Dashboard shows "Loading..." forever
- Check if the application is running: `npm run pm2:status`
- Check logs: `npm run pm2:logs`
- Verify `web_port` in config matches the URL you're accessing

#### Keycloak authentication not working
- Verify Keycloak server is accessible
- Check `client_secret` is correct
- Ensure user has the required role assigned
- Check browser console for errors

#### Providers showing as "DOWN"
- Verify provider IP addresses are correct
- Check network connectivity to provider devices
- Review API endpoints in provider configuration
- Check logs for specific error messages

#### Discord notifications not sending
- Verify webhook URL is correct
- Test webhook URL manually with curl:
  ```bash
  curl -X POST -H "Content-Type: application/json" \
    -d '{"content":"Test"}' \
    YOUR_WEBHOOK_URL
  ```

### Debug Mode

Enable verbose logging by setting environment variable:
```bash
DEBUG=* npm start
```

See [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) for more troubleshooting tips.

## API Endpoints

### Public Endpoints

- `GET /api/status` - Get public status (up/down only)
- `GET /api/auth/status` - Check authentication status

### Protected Endpoints (Requires Authentication)

- `GET /api/status/detailed` - Get full status with all details
- `GET /api/login` - Get login URL
- `GET /api/logout` - Get logout URL

See [docs/API.md](docs/API.md) for detailed API documentation.

## CI/CD

This project includes GitHub Actions workflows for automated testing, building, and releasing:

### Continuous Integration

The CI workflow (`.github/workflows/ci.yml`) runs on every push and pull request:
- **Linting** - Validates JSON files and package structure
- **Testing** - Tests application startup and configuration
- **Docker Build** - Builds and tests Docker image
- **Docker Compose** - Tests docker-compose setup

### Releases

The release workflow (`.github/workflows/release.yml`) automatically:
- Builds Docker images for multiple architectures (amd64, arm64)
- Pushes to GitHub Container Registry (GHCR)
- Creates GitHub releases with notes

**To create a release:**
```bash
git tag v1.0.0
git push --tags
```

### Build Checks

Daily automated builds (`.github/workflows/docker-build-check.yml`) verify:
- Docker image builds successfully
- Container health checks pass
- Application starts correctly

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues, questions, or contributions:
- Open an issue on [GitHub](https://github.com/VanillyNeko/network-monitoring-tool/issues)
- Check the [Wiki](https://github.com/VanillyNeko/network-monitoring-tool/wiki) for detailed documentation
- Review the [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## Acknowledgments

- Built with Node.js, Express, and Keycloak
- Dashboard uses modern CSS with theme support
- PM2 for process management
- UniFi Network API integration

## Repository

- **GitHub:** [VanillyNeko/network-monitoring-tool](https://github.com/VanillyNeko/network-monitoring-tool)
- **Issues:** [Report a bug](https://github.com/VanillyNeko/network-monitoring-tool/issues)
- **License:** MIT (see [LICENSE](LICENSE) file)

---

**Made with ❤️ for network monitoring**
