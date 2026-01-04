# Installation Guide

Complete step-by-step installation guide for the Network Monitoring Dashboard.

**Related Pages:** [Home](Home) | [Quick Start](Quick-Start) | [Provider Setup](Provider-Setup) | [PM2 Setup](PM2-Setup) | [Security](Security) | [Troubleshooting](Troubleshooting)

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation Steps](#installation-steps)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Verification](#verification)
- [Next Steps](#next-steps)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before installing, ensure you have the following:

### Required

- **Node.js 18+** and npm
  - Check version: `node --version` and `npm --version`
  - Download: [nodejs.org](https://nodejs.org/)
- **Git** (for cloning the repository)
  - Check version: `git --version`
  - Download: [git-scm.com](https://git-scm.com/)

### Optional (Recommended)

- **PM2** - For process management and auto-restart
  - Install: `npm install -g pm2`
- **Keycloak Server** - For authentication (if using authentication)
- **Discord Webhook** - For notifications (if using notifications)

### System Requirements

- **Operating System:** Linux, macOS, or Windows
- **RAM:** Minimum 512MB, recommended 1GB+
- **Disk Space:** ~100MB for application and dependencies
- **Network:** Access to provider devices and optional external services

## Installation Steps

### Step 1: Clone the Repository

```bash
git clone https://github.com/VanillyNeko/network-monitoring-tool.git
cd network-monitoring-tool
```

**Alternative:** Download as ZIP from GitHub and extract.

### Step 2: Install Dependencies

Install all required Node.js packages:

```bash
npm install
```

This will install:
- `express` - Web server framework
- `node-fetch` - HTTP client for API calls
- `keycloak-connect` - Keycloak authentication (if using)
- `express-session` - Session management (if using Keycloak)

**Expected output:**
```
added 150 packages, and audited 151 packages in 10s
```

### Step 3: Create Configuration File

Copy the example configuration file:

```bash
cp config.json.example config.json
```

**Important:** Never commit `config.json` to version control - it contains sensitive information.

### Step 4: Configure the Application

Edit `config.json` with your settings. See [Configuration](#configuration) section below for details.

**Minimum required configuration:**
- At least one provider
- `session_secret` (generate a random string)
- `check_interval_seconds`
- `web_port`

## Configuration

### Basic Configuration

Open `config.json` in your preferred text editor and configure the following:

#### 1. Providers

Add at least one provider to monitor. Example:

```json
{
  "providers": [
    {
      "name": "T-Mobile Home Internet",
      "ip": "192.168.12.1",
      "api_url": "http://192.168.12.1/TMI/v1/gateway?get=all",
      "health_key_path": ["connectionStatus", "connected"],
      "signal_keys": ["rsrp", "rsrq", "sinr", "band"],
      "requires_auth": false
    }
  ]
}
```

See [Provider Setup](Provider-Setup) for detailed provider configuration.

#### 2. Session Secret

Generate a secure random string for session encryption:

```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add to `config.json`:
```json
{
  "session_secret": "your-generated-secret-here"
}
```

#### 3. Monitoring Settings

```json
{
  "check_interval_seconds": 60,
  "web_port": 5643
}
```

- `check_interval_seconds`: How often to check providers (default: 60)
- `web_port`: Port for the web dashboard (default: 5643)

#### 4. Optional: Discord Notifications

```json
{
  "discord": {
    "webhook_url": "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
  }
}
```

See [Discord Setup](Discord-Setup) for setup instructions.

#### 5. Optional: Keycloak Authentication

```json
{
  "keycloak": {
    "enabled": false,
    "server_url": "https://keycloak.example.com",
    "realm": "your-realm",
    "client_id": "netmonitoring",
    "client_secret": "your-client-secret",
    "required_role": "admin",
    "confidential_port": 0,
    "base_url": "https://your-domain.com",
    "use_wildcard_redirect": true
  }
}
```

See [Keycloak Setup](Keycloak-Setup) for detailed setup.

#### 6. Optional: Embedding

```json
{
  "allow_embedding": true
}
```

Set to `true` to allow iframe embedding of the dashboard.

### Complete Configuration Example

```json
{
  "providers": [
    {
      "name": "T-Mobile Home Internet",
      "ip": "192.168.12.1",
      "api_url": "http://192.168.12.1/TMI/v1/gateway?get=all",
      "health_key_path": ["connectionStatus", "connected"],
      "signal_keys": ["rsrp", "rsrq", "sinr", "band"],
      "requires_auth": false,
      "gateway_wan_port": "wan2"
    }
  ],
  "discord": {
    "webhook_url": "https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN"
  },
  "keycloak": {
    "enabled": false
  },
  "session_secret": "your-generated-secret-here",
  "check_interval_seconds": 60,
  "web_port": 5643,
  "allow_embedding": true
}
```

## Running the Application

### Option 1: Direct Node.js (Development/Testing)

```bash
npm start
```

The application will start and display:
```
Keycloak authentication disabled
Discord webhook notifications disabled
Dashboard at http://localhost:5643
```

**To stop:** Press `Ctrl+C`

### Option 2: PM2 (Production - Recommended)

#### Initial Setup

1. **Install PM2 globally** (if not already installed):
   ```bash
   npm install -g pm2
   ```

2. **Start the application:**
   ```bash
   npm run pm2:start
   ```

3. **Check status:**
   ```bash
   npm run pm2:status
   ```

4. **View logs:**
   ```bash
   npm run pm2:logs
   ```

#### Auto-Start on Boot

To automatically start the application when the server boots:

```bash
# Generate startup script
pm2 startup

# Follow the instructions displayed, then:
pm2 save
```

#### PM2 Management Commands

```bash
npm run pm2:start    # Start the application
npm run pm2:stop     # Stop the application
npm run pm2:restart  # Restart the application
npm run pm2:delete   # Remove from PM2
npm run pm2:logs     # View logs in real-time
npm run pm2:status   # Check application status
```

See [PM2 Setup](PM2-Setup) for detailed PM2 configuration.

## Verification

### 1. Check Application is Running

```bash
# If using PM2
npm run pm2:status

# Or check if port is listening
netstat -tuln | grep 5643
# Or on some systems:
ss -tuln | grep 5643
```

### 2. Access the Dashboard

Open your web browser and navigate to:

```
http://localhost:5643
```

Or if accessing remotely:

```
http://your-server-ip:5643
```

### 3. Verify Providers

- You should see your configured providers listed
- Status should show as "UP" or "DOWN"
- If Keycloak is enabled, you'll see a login button
- If authenticated, you'll see detailed metrics

### 4. Check Logs

```bash
# If using PM2
npm run pm2:logs

# Or if running directly
# Check terminal output
```

Look for:
- ✅ "Dashboard at http://..."
- ✅ Provider check messages
- ❌ Any error messages

### 5. Test API Endpoints

```bash
# Public status endpoint
curl http://localhost:5643/api/status

# Auth status endpoint
curl http://localhost:5643/api/auth/status
```

Expected response:
```json
{
  "status": {
    "Provider Name": {
      "up": true,
      "last_check": 1234567890
    }
  },
  "providers": [...],
  "authenticated": false
}
```

## Next Steps

After successful installation:

### 1. Configure Additional Providers

Add more providers to monitor. See [Provider Setup](Provider-Setup).

### 2. Set Up Authentication (Optional)

Enable Keycloak for secure access. See [Keycloak Setup](Keycloak-Setup).

### 3. Configure Notifications (Optional)

Set up Discord webhooks for alerts. See [Discord Setup](Discord-Setup).

### 4. Customize Dashboard

- Themes: Light, Dark, Anime (selectable in dashboard)
- Embedding: Configure `allow_embedding` for widget mode
- See [Embedding](Embedding) for embedding options

### 5. Set Up Reverse Proxy (Optional)

For production, consider using nginx or Apache as a reverse proxy:

**nginx example:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5643;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6. Set Up SSL/TLS (Recommended for Production)

Use Let's Encrypt or your preferred SSL certificate provider:

```bash
# Example with certbot
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Installation Issues

#### npm install fails

**Problem:** Dependencies fail to install

**Solutions:**
- Check Node.js version: `node --version` (should be 18+)
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then retry
- Check internet connectivity
- Try: `npm install --legacy-peer-deps`

#### Permission errors

**Problem:** Permission denied errors during installation

**Solutions:**
- Don't use `sudo` with npm (can cause permission issues)
- Fix npm permissions: `npm config set prefix ~/.npm-global`
- Or use a Node version manager (nvm, n)

### Configuration Issues

#### config.json not found

**Problem:** Application can't find config.json

**Solution:**
```bash
cp config.json.example config.json
# Then edit config.json
```

#### Invalid JSON syntax

**Problem:** Application fails to start with JSON error

**Solution:**
- Validate JSON syntax: `cat config.json | python3 -m json.tool`
- Check for trailing commas
- Ensure all strings are quoted
- Use a JSON validator online

### Runtime Issues

#### Port already in use

**Problem:** `Error: listen EADDRINUSE: address already in use :::5643`

**Solutions:**
- Change `web_port` in config.json
- Or stop the process using the port:
  ```bash
  # Find process
  lsof -i :5643
  # Or
  netstat -tulpn | grep 5643
  # Kill process
  kill <PID>
  ```

#### Application won't start

**Problem:** Application exits immediately

**Solutions:**
- Check logs: `npm run pm2:logs` or check terminal output
- Verify config.json is valid JSON
- Check all required fields are present
- Ensure Node.js version is 18+

#### Providers showing as DOWN

**Problem:** All providers show as down

**Solutions:**
- Verify provider IP addresses are correct
- Check network connectivity: `ping <provider-ip>`
- Verify API endpoints are accessible
- Check firewall rules
- Review logs for specific error messages

### Getting Help

If you encounter issues not covered here:

1. Check [Troubleshooting](Troubleshooting) for more solutions
2. Review application logs
3. Check [GitHub Issues](https://github.com/VanillyNeko/network-monitoring-tool/issues)
4. Open a new issue with:
   - Error messages
   - Configuration (sanitized)
   - Logs
   - Steps to reproduce

## Uninstallation

To remove the application:

### If using PM2

```bash
npm run pm2:delete
pm2 save
```

### Remove files

```bash
cd ..
rm -rf network-monitoring-tool
```

### Remove PM2 (if installed globally)

```bash
npm uninstall -g pm2
```

## Updating

To update to the latest version:

```bash
# Stop the application
npm run pm2:stop

# Backup your config
cp config.json config.json.backup

# Pull latest changes
git pull origin main

# Install any new dependencies
npm install

# Restart
npm run pm2:start
```

**Note:** Always backup your `config.json` before updating!

## Additional Resources

- [Main README](https://github.com/VanillyNeko/network-monitoring-tool/blob/main/README.md) - Main project documentation
- [Provider Setup](Provider-Setup) - Provider configuration guide
- [Keycloak Setup](Keycloak-Setup) - Authentication setup
- [Discord Setup](Discord-Setup) - Notification setup
- [PM2 Setup](PM2-Setup) - Process management
- [Troubleshooting](Troubleshooting) - Common issues and solutions
- [API](API) - API documentation
- [Home](Home) - Wiki index

---

**Need help?** Open an issue on [GitHub](https://github.com/VanillyNeko/network-monitoring-tool/issues)

