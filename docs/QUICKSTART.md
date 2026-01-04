# Quick Start Guide

Get the Network Monitoring Dashboard up and running in 5 minutes!

**Related Pages:** [Home](Home) | [Installation](Installation) | [Provider Setup](Provider-Setup) | [Troubleshooting](Troubleshooting)

## Prerequisites

- Node.js 18+ installed ([Download](https://nodejs.org/))
- Git installed (optional, for cloning)
- Access to at least one provider device (router/modem)

## 5-Minute Setup

### Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone https://github.com/VanillyNeko/network-monitoring-tool.git
cd network-monitoring-tool

# Install dependencies
npm install
```

### Step 2: Create Configuration (1 minute)

```bash
# Copy the example configuration
cp config.json.example config.json
```

### Step 3: Configure Your Provider (2 minutes)

Edit `config.json` and add at least one provider. Here's a minimal example:

```json
{
  "providers": [
    {
      "name": "My Internet Provider",
      "ip": "192.168.1.1",
      "api_url": "http://192.168.1.1/api/status",
      "health_key_path": ["status", "connected"],
      "signal_keys": [],
      "requires_auth": false
    }
  ],
  "session_secret": "change-this-to-a-random-secret",
  "check_interval_seconds": 60,
  "web_port": 5643
}
```

**Quick Configuration Tips:**
- `ip`: The IP address of your router/modem (usually `192.168.1.1` or `192.168.0.1`)
- `api_url`: The API endpoint to check (you may need to discover this)
- `session_secret`: Generate one with: `openssl rand -base64 32`

### Step 4: Start the Application (30 seconds)

```bash
# Start directly
npm start
```

Or with PM2 (recommended for production):

```bash
# Install PM2 globally (first time only)
npm install -g pm2

# Start with PM2
npm run pm2:start
```

### Step 5: Access the Dashboard

Open your browser and navigate to:

```
http://localhost:5643
```

You should see your provider(s) listed with their status!

## Common Provider Examples

### T-Mobile Home Internet

```json
{
  "name": "T-Mobile Home Internet",
  "ip": "192.168.12.1",
  "api_url": "http://192.168.12.1/TMI/v1/gateway?get=all",
  "health_key_path": ["connectionStatus", "connected"],
  "signal_keys": ["rsrp", "rsrq", "sinr", "band"],
  "requires_auth": false
}
```

### AT&T Business Wireless

```json
{
  "name": "AT&T Business Wireless",
  "ip": "192.168.45.1",
  "api_url": "http://192.168.45.1/GetNvInfo",
  "health_key_path": ["ConnUP", "true"],
  "signal_keys": ["RSRP", "RSRQ", "SINR", "Band"],
  "requires_auth": true
}
```

### UniFi Cable Internet

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

See [Provider Setup](Provider-Setup) for more detailed configuration options.

## What's Next?

### Basic Setup Complete ✅

You now have a working dashboard! Here's what you can do next:

1. **Add More Providers** - Add additional internet connections to monitor
   - See [Provider Setup](Provider-Setup) for detailed guides

2. **Set Up PM2** - Keep the application running automatically
   - See [PM2 Setup](PM2-Setup) for production deployment

3. **Add Authentication** - Secure your dashboard with Keycloak
   - See [Keycloak Setup](Keycloak-Setup) (optional)

4. **Enable Notifications** - Get alerts via Discord
   - See [Discord Setup](Discord-Setup) (optional)

5. **Embed the Dashboard** - Add it to your website
   - See [Embedding](Embedding) guide

## Troubleshooting

### Dashboard shows "Loading..." forever

- Check if the application is running: `npm run pm2:status` or check terminal
- Verify the port in config matches the URL: `http://localhost:5643`
- Check logs for errors

### Provider shows as "DOWN"

- Verify the IP address is correct
- Check if you can access the provider's web interface
- Verify the API endpoint URL is correct
- Check network connectivity: `ping <provider-ip>`

### Application won't start

- Verify Node.js version: `node --version` (should be 18+)
- Check `config.json` syntax is valid JSON
- Review error messages in terminal/logs

### Need More Help?

- Check the [Troubleshooting](Troubleshooting) guide for detailed solutions
- Review the [Installation](Installation) guide for complete setup
- Open an [issue on GitHub](https://github.com/VanillyNeko/network-monitoring-tool/issues)

## Quick Commands Reference

```bash
# Start application
npm start

# Start with PM2
npm run pm2:start

# Check status (PM2)
npm run pm2:status

# View logs (PM2)
npm run pm2:logs

# Stop application (PM2)
npm run pm2:stop

# Restart application (PM2)
npm run pm2:restart
```

## Configuration File Structure

Minimal `config.json` structure:

```json
{
  "providers": [
    {
      "name": "Provider Name",
      "ip": "192.168.1.1",
      "api_url": "http://192.168.1.1/api/status",
      "health_key_path": ["status", "connected"],
      "signal_keys": [],
      "requires_auth": false
    }
  ],
  "session_secret": "your-random-secret-here",
  "check_interval_seconds": 60,
  "web_port": 5643
}
```

**Required fields:**
- `providers` - At least one provider
- `session_secret` - Random string for sessions
- `check_interval_seconds` - How often to check (default: 60)
- `web_port` - Port for dashboard (default: 5643)

**Optional fields:**
- `discord.webhook_url` - Discord notifications
- `keycloak` - Authentication settings
- `allow_embedding` - Enable iframe embedding

## Next Steps

Once you have the basic setup working:

1. **Read the Full Documentation**
   - [Installation](Installation) - Complete installation guide
   - [Provider Setup](Provider-Setup) - Detailed provider configuration
   - [API](API) - API endpoint documentation

2. **Customize Your Setup**
   - Add multiple providers
   - Configure authentication
   - Set up notifications
   - Customize themes

3. **Deploy to Production**
   - Set up PM2 for auto-restart
   - Configure reverse proxy (nginx/Apache)
   - Set up SSL/TLS certificates
   - Enable authentication

---

**Need help?** Check the [Troubleshooting](Troubleshooting) guide or [open an issue](https://github.com/VanillyNeko/network-monitoring-tool/issues)

