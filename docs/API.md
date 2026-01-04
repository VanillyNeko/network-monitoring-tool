# API Documentation

API endpoints for the Network Monitoring Dashboard.

## Base URL

All API endpoints are relative to the base URL:
```
http://your-server:5643
```

## Authentication

Some endpoints require Keycloak authentication. See [KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md) for setup.

## Public Endpoints

### GET /api/status

Get public status information (up/down only, no detailed metrics).

**Authentication:** Not required

**Response:**
```json
{
  "status": {
    "T-Mobile Home Internet": {
      "up": true,
      "last_check": 1704067200000
    },
    "AT&T Business Wireless": {
      "up": false,
      "last_check": 1704067200000
    }
  },
  "providers": [
    {
      "name": "T-Mobile Home Internet"
    },
    {
      "name": "AT&T Business Wireless"
    }
  ],
  "authenticated": false
}
```

### GET /api/auth/status

Check authentication status and user information.

**Authentication:** Not required

**Response (Not Authenticated):**
```json
{
  "authenticated": false,
  "keycloak_enabled": true,
  "has_required_role": false,
  "required_role": "monitoring-access"
}
```

**Response (Authenticated):**
```json
{
  "authenticated": true,
  "keycloak_enabled": true,
  "has_required_role": true,
  "required_role": "monitoring-access",
  "user": {
    "preferred_username": "user@example.com",
    "email": "user@example.com",
    "realm_access": {
      "roles": ["monitoring-access", "user"]
    },
    "resource_access": {
      "cell-monitoring": {
        "roles": ["monitoring-access"]
      }
    }
  },
  "roles": {
    "realm": ["monitoring-access", "user"],
    "client": ["monitoring-access"]
  }
}
```

## Protected Endpoints

### GET /api/status/detailed

Get full status information with all metrics and details.

**Authentication:** Required (Keycloak)

**Role Required:** `monitoring-access` (or as configured)

**Response:**
```json
{
  "status": {
    "T-Mobile Home Internet": {
      "up": true,
      "details": {
        "ping": "OK",
        "device_model": "TMO-G4AR",
        "device_manufacturer": "Arcadyan",
        "firmware_version": "1.00.13",
        "signal_rsrp": -70,
        "signal_rsrq": -10,
        "signal_sinr": 18,
        "signal_bands": "n41",
        "uptime_seconds": 1372822,
        "uptime_formatted": "15d 21h 20m",
        "gateway_wan_status": "connected",
        "gateway_wan_port": "Port 8",
        "gateway_port_speed_mbps": 1000,
        "gateway_rx_bytes_gb": "5.57",
        "gateway_tx_bytes_gb": "10.73"
      },
      "last_check": 1704067200000
    }
  },
  "providers": [
    {
      "name": "T-Mobile Home Internet",
      "ip": "192.168.12.1",
      "api_url": "http://192.168.12.1/TMI/v1/gateway?get=all"
    }
  ],
  "authenticated": true,
  "user": {
    "preferred_username": "user@example.com"
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Not authenticated
- `403 Forbidden` - Authenticated but missing required role

### GET /api/login

Get Keycloak login URL.

**Authentication:** Not required

**Response:**
```json
{
  "login_url": "https://keycloak.example.com/auth/realms/your-realm/protocol/openid-connect/auth?..."
}
```

**Error Response:**
```json
{
  "error": "Keycloak not configured"
}
```

### GET /api/logout

Get Keycloak logout URL.

**Authentication:** Not required

**Response:**
```json
{
  "logout_url": "https://keycloak.example.com/auth/realms/your-realm/protocol/openid-connect/logout?..."
}
```

**Error Response:**
```json
{
  "error": "Keycloak not configured"
}
```

## Response Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (missing required role) |
| 404 | Not found |
| 500 | Internal server error |

## Rate Limiting

Currently, there are no rate limits on API endpoints. Consider implementing rate limiting for production deployments.

## CORS

CORS is not explicitly configured. If accessing from a different origin, you may need to configure CORS in the Express application.

## Example Usage

### JavaScript/Fetch

```javascript
// Get public status
const response = await fetch('http://your-server:5643/api/status');
const data = await response.json();
console.log(data);

// Get detailed status (requires authentication)
const detailedResponse = await fetch('http://your-server:5643/api/status/detailed', {
  credentials: 'include'  // Include cookies for session
});
const detailedData = await detailedResponse.json();
console.log(detailedData);
```

### cURL

```bash
# Get public status
curl http://your-server:5643/api/status

# Get detailed status (with session cookie)
curl -b cookies.txt http://your-server:5643/api/status/detailed

# Check auth status
curl http://your-server:5643/api/auth/status
```

### Python

```python
import requests

# Get public status
response = requests.get('http://your-server:5643/api/status')
data = response.json()
print(data)

# Get detailed status (with session)
session = requests.Session()
# Login first via Keycloak, then:
response = session.get('http://your-server:5643/api/status/detailed')
detailed_data = response.json()
print(detailed_data)
```

## Data Structure

### Provider Status

```typescript
interface ProviderStatus {
  up: boolean;
  details: {
    // Connection info
    ping?: string;
    wan_status?: string;
    connection_status?: string;
    public_ip?: string;
    private_ip?: string;
    
    // Signal info
    signal_rsrp?: number;
    signal_rsrq?: number;
    signal_sinr?: number;
    signal_bands?: string;
    
    // Device info
    device_model?: string;
    device_manufacturer?: string;
    firmware_version?: string;
    
    // Performance
    cpu_percent?: string;
    memory_percent?: string;
    uptime_seconds?: number;
    uptime_formatted?: string;
    
    // Gateway info (if configured)
    gateway_wan_status?: string;
    gateway_wan_port?: string;
    gateway_port_speed_mbps?: number;
    gateway_rx_bytes_gb?: string;
    gateway_tx_bytes_gb?: string;
    
    // ... more fields depending on provider type
  };
  last_check: number;  // Unix timestamp in milliseconds
}
```

## WebSocket (Future)

WebSocket support for real-time updates is not currently implemented but could be added for push notifications of status changes.

## Next Steps

- See [KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md) for authentication setup
- See [PROVIDER_SETUP.md](PROVIDER_SETUP.md) for provider configuration
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for API-related issues

