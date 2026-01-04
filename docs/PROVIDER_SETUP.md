# Provider Setup Guide

This guide covers how to configure different types of internet providers for monitoring.

**Related Pages:** [Home](Home) | [Installation](Installation) | [Keycloak Setup](Keycloak-Setup) | [Troubleshooting](Troubleshooting)

## Table of Contents

- [T-Mobile Home Internet](#t-mobile-home-internet)
- [AT&T Business Wireless](#att-business-wireless)
- [UniFi Cable Internet (UCI)](#unifi-cable-internet-uci)
- [Generic HTTP Provider](#generic-http-provider)
- [Gateway WAN Port Configuration](#gateway-wan-port-configuration)

## T-Mobile Home Internet

### Configuration

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

### Finding Your Gateway IP

1. Connect to your T-Mobile gateway's WiFi
2. Open a browser and go to `http://192.168.12.1` (default)
3. If that doesn't work, check your router's DHCP table or use:
   ```bash
   # On Linux/Mac
   ip route | grep default
   
   # Or check ARP table
   arp -a | grep -i tmobile
   ```

### API Endpoint

The T-Mobile gateway exposes a REST API at:
- `http://[gateway-ip]/TMI/v1/gateway?get=all`

### Signal Keys

- `rsrp` - Reference Signal Received Power (dBm)
- `rsrq` - Reference Signal Received Quality (dB)
- `sinr` - Signal to Interference plus Noise Ratio (dB)
- `band` - 5G band (e.g., "n41")

### Health Check

The health is determined by `connectionStatus.connected` being `true`.

## AT&T Business Wireless

### Configuration

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

### Finding Your Gateway IP

1. Connect to your AT&T gateway
2. Default IP is usually `192.168.45.1`
3. Check your router's DHCP table if different

### API Endpoints

AT&T devices may use different endpoints:
- Primary: `http://[gateway-ip]/GetNvInfo`
- Alternative: `http://[gateway-ip]/cgi-bin/GetNvInfo.ha`

The system will try both if `alt_api_urls` is configured.

### Authentication

Some AT&T devices require authentication. Set `requires_auth: true` if needed. The system will attempt basic authentication.

### Signal Keys

- `RSRP` - Reference Signal Received Power
- `RSRQ` - Reference Signal Received Quality
- `SINR` - Signal to Interference plus Noise Ratio
- `Band` - LTE/5G band

### Health Check

Health is determined by `ConnUP` being `"true"` (string).

## UniFi Cable Internet (UCI)

### Configuration

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

### Getting UniFi API Key

1. **Access UniFi Controller:**
   - Open your UniFi controller (usually `https://[controller-ip]:8443`)
   - Log in with admin credentials

2. **Create API Key:**
   - Go to Settings → System Settings
   - Scroll to "API" section
   - Click "Create API Key"
   - Give it a name (e.g., "Monitoring Dashboard")
   - Copy the API key immediately (you won't see it again)

3. **Alternative: Using UniFi Network Application:**
   - If using UniFi Network Application (v7+), API keys are created in:
     - Settings → System → Advanced → API Authentication
   - Or use the API directly:
     ```bash
     curl -X POST https://[controller]/api/auth/login \
       -d '{"username":"admin","password":"your-password"}'
     ```

### Finding Controller URL

- **Local:** `https://[controller-ip]:8443` or `https://[controller-ip]:443`
- **Cloud:** Your UniFi Cloud URL
- **Self-hosted:** Your domain or IP

### Site Name

- Default site is usually `"default"`
- To find your site name:
  1. Access UniFi controller
  2. Check the site selector (top left)
  3. Or use the API: `/api/self/sites`

### WAN Port

- `wan1` or `wan` - Primary WAN (usually cable/fiber)
- `wan2` - Secondary WAN (e.g., T-Mobile)
- `wan3` - Tertiary WAN (e.g., AT&T)

### UCI Device Detection

The system automatically detects UCI devices by:
- Device type: `uci`
- Device name containing "cable" or "internet"
- MAC address (if `device_mac` is specified)

## Generic HTTP Provider

For any provider with an HTTP API:

```json
{
  "name": "Generic Provider",
  "ip": "192.168.1.1",
  "api_url": "http://192.168.1.1/api/status",
  "health_url": "http://192.168.1.1/health",
  "health_key_path": ["status", "connected"],
  "signal_keys": ["signal_strength", "quality"],
  "requires_auth": false
}
```

### Configuration Options

| Option | Description | Required |
|--------|-------------|----------|
| `name` | Display name for the provider | Yes |
| `ip` | IP address of the device | Yes |
| `api_url` | Primary API endpoint | Recommended |
| `alt_api_urls` | Alternative API endpoints to try | No |
| `health_url` | Simple HTTP health check endpoint | No |
| `health_key_path` | JSON path to health status | No |
| `signal_keys` | Keys to extract from API response | No |
| `requires_auth` | Whether API requires authentication | No |
| `gateway_wan_port` | UniFi gateway WAN port for dual monitoring | No |

### Health Check Methods

1. **JSON Path Check:**
   ```json
   "health_key_path": ["status", "connected"]
   ```
   Checks if `data.status.connected === true`

2. **HTTP Status Check:**
   ```json
   "health_url": "http://192.168.1.1/health"
   ```
   Checks if HTTP status is 200

3. **Reachability Check:**
   If no health check configured, system checks if device responds to HTTP requests

## Gateway WAN Port Configuration

For providers connected through a UniFi gateway, you can monitor both:
- Direct device status (from the modem/router)
- Gateway-side WAN port status

### Configuration

Add `gateway_wan_port` to your provider config:

```json
{
  "name": "T-Mobile Home Internet",
  "ip": "192.168.12.1",
  "api_url": "http://192.168.12.1/TMI/v1/gateway?get=all",
  "gateway_wan_port": "wan2"
}
```

### How It Works

1. System monitors the device directly (T-Mobile gateway)
2. System also queries UniFi gateway for WAN port status
3. Combines both sets of information in the dashboard

### Benefits

- **Dual verification:** See status from both perspectives
- **Gateway statistics:** Port speed, traffic, errors from UniFi
- **Public IP detection:** Gateway can provide public IP information
- **NAT detection:** Identifies if connection is behind NAT

### Finding WAN Port Names

1. Access UniFi controller
2. Go to Devices → Select your gateway
3. Check Ports section
4. Look for ports with network names: `wan`, `wan2`, `wan3`
5. Or use the API:
   ```bash
   curl -k -H "X-API-Key: YOUR_KEY" \
     "https://[controller]/proxy/network/api/s/default/stat/device" | \
     jq '.data[] | select(.name | contains("UDM")) | .port_table[] | select(.network_name | startswith("wan"))'
   ```

## Testing Your Configuration

### Test API Endpoint

```bash
# Test T-Mobile
curl http://192.168.12.1/TMI/v1/gateway?get=all

# Test AT&T
curl http://192.168.45.1/GetNvInfo

# Test UniFi (replace with your values)
curl -k -H "X-API-Key: YOUR_KEY" \
  "https://10.27.27.1/proxy/network/api/s/default/stat/device"
```

### Verify Health Check

Check if your health key path is correct:

```bash
# Get API response
curl http://192.168.12.1/TMI/v1/gateway?get=all > response.json

# Check the path
cat response.json | jq '.connectionStatus.connected'
```

### Check Logs

Monitor the application logs to see what's happening:

```bash
npm run pm2:logs
# Or
tail -f logs/pm2-out.log
```

## Troubleshooting

### Provider Shows as DOWN

1. **Check connectivity:**
   ```bash
   ping 192.168.12.1
   ```

2. **Check API endpoint:**
   ```bash
   curl http://192.168.12.1/TMI/v1/gateway?get=all
   ```

3. **Verify IP address:** Make sure the IP is correct
4. **Check firewall:** Ensure port 80/443 is accessible
5. **Review logs:** Check for specific error messages

### Signal Keys Not Showing

1. Verify the keys exist in the API response
2. Check for case sensitivity (RSRP vs rsrp)
3. Review the API response structure
4. Add keys to `signal_keys` array

### Health Check Not Working

1. Verify `health_key_path` is correct
2. Check the actual JSON structure
3. Try using `health_url` as fallback
4. Check if the value matches expected format (true, "true", "connected", etc.)

### Gateway WAN Port Not Found

1. Verify UniFi API key is correct
2. Check site name matches your setup
3. Verify WAN port name (wan, wan2, wan3)
4. Check UniFi controller logs

## Next Steps

- See [Keycloak Setup](Keycloak-Setup) for authentication
- See [Discord Setup](Discord-Setup) for notifications
- See [Troubleshooting](Troubleshooting) for more help
- [Home](Home) - Wiki index

