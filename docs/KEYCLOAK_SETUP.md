# Keycloak Setup Guide

This guide will walk you through setting up Keycloak authentication for the Network Monitoring Dashboard.

**Related Pages:** [Home](Home) | [Installation](Installation) | [Provider Setup](Provider-Setup) | [Troubleshooting](Troubleshooting)

## Prerequisites

- Keycloak server installed and running
- Admin access to Keycloak
- Network Monitoring Dashboard installed

## Step 1: Access Keycloak Admin Console

1. Navigate to your Keycloak admin console (typically `https://your-keycloak-server.com/admin`)
2. Log in with admin credentials

## Step 2: Create or Select a Realm

1. In the left sidebar, click on the realm dropdown (top left)
2. Either:
   - Select an existing realm, or
   - Click "Create Realm" to create a new one
3. If creating new:
   - Realm name: `cell-monitoring` (or your preferred name)
   - Click "Create"

## Step 3: Create a Client

1. In the left sidebar, go to **Clients**
2. Click **Create client** (or "Add client")
3. Fill in the client configuration:

   **General Settings:**
   - **Client type:** OpenID Connect
   - **Client ID:** `cell-monitoring`
   - Click **Next**

   **Capability config:**
   - **Client authentication:** ON (this enables confidential client)
   - **Authorization:** OFF (unless you need fine-grained permissions)
   - **Authentication flow:** Standard flow
   - Click **Next**

   **Login settings:**
   - **Root URL:** `https://your-domain.com` (or `http://your-server:5643`)
   - **Home URL:** `https://your-domain.com` (or `http://your-server:5643`)
   - **Valid redirect URIs:** 
     - `https://your-domain.com/callback` (required for login)
     - `https://your-domain.com/?logged_out=true` (required for logout redirect)
     - Or use wildcard: `https://your-domain.com/*` (if your Keycloak version supports it)
     - For local testing: `http://localhost:5643/callback` and `http://localhost:5643/?logged_out=true`
   - **Valid post logout redirect URIs:**
     - `https://your-domain.com/*` (or specific: `https://your-domain.com/?logged_out=true`)
     - `http://localhost:5643/*` (for local testing)
   - **Web origins:**
     - `https://your-domain.com` (or `http://your-server:5643`)
     - `http://localhost:5643` (for local testing)
   - Click **Save**

## Step 4: Get Client Secret

1. After saving, you'll be on the client settings page
2. Go to the **Credentials** tab
3. Copy the **Client secret** value
4. **Important:** Save this securely - you'll need it for the config

## Step 5: Create a Role

You can create either a **Realm Role** or **Client Role**. Realm roles are recommended for simplicity.

### Option A: Realm Role (Recommended)

1. In the left sidebar, go to **Realm roles**
2. Click **Create role**
3. Fill in:
   - **Role name:** `monitoring-access`
   - **Description:** `Access to detailed monitoring information` (optional)
4. Click **Save**

### Option B: Client Role

1. Go to **Clients** → Select `cell-monitoring` client
2. Go to the **Roles** tab
3. Click **Create role**
4. Fill in:
   - **Role name:** `monitoring-access`
   - **Description:** `Access to detailed monitoring information` (optional)
5. Click **Save**

## Step 6: Assign Role to Users

### For Realm Role:

1. Go to **Users** in the left sidebar
2. Select a user (or create a new user)
3. Go to the **Role mapping** tab
4. Click **Assign role**
5. Filter by role name: `monitoring-access`
6. Select the role and click **Assign**

### For Client Role:

1. Go to **Users** → Select user
2. Go to **Role mapping** tab
3. Click **Assign role**
4. Filter by clients: `cell-monitoring`
5. Select `monitoring-access` role
6. Click **Assign**

## Step 7: Configure the Dashboard

Update your `config.json`:

```json
{
  "keycloak": {
    "enabled": true,
    "server_url": "https://your-keycloak-server.com",
    "realm": "your-realm-name",
    "client_id": "cell-monitoring",
    "client_secret": "your-client-secret-from-step-4",
    "required_role": "monitoring-access",
    "confidential_port": 0,
    "base_url": "https://your-domain.com",
    "use_wildcard_redirect": true
  },
  "session_secret": "generate-a-random-secret-here"
}
```

### Configuration Options Explained

- **`base_url`** (optional): The base URL for all redirect URIs. If not set, the application will auto-detect from the request headers. This is useful when:
  - You're behind a reverse proxy
  - You want consistent redirect URIs regardless of how users access the site
  - You're using a domain name but requests come from different sources
  
  Example: If your dashboard is accessible at `https://net.kiglove.moe`, set `base_url` to `https://net.kiglove.moe`. All redirect URIs will use this base.

- **`use_wildcard_redirect`** (optional, informational): This flag indicates whether you plan to use wildcard redirect URIs in Keycloak (e.g., `https://your-domain.com/*`). The application will still generate specific redirect URIs, but you can configure Keycloak to accept wildcards.

### Generate Session Secret

Generate a secure random string for `session_secret`:

```bash
# On Linux/Mac
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Step 8: Test the Setup

1. **Restart the application:**
   ```bash
   npm run pm2:restart
   # Or
   npm start
   ```

2. **Access the dashboard:**
   - Open `http://your-server:5643`
   - You should see a "Login" button

3. **Test login:**
   - Click "Login"
   - You'll be redirected to Keycloak
   - Log in with a user that has the `monitoring-access` role
   - You should be redirected back and see full details

4. **Test without role:**
   - Log out
   - Log in with a user that doesn't have the role
   - You should only see up/down status, not full details

## Troubleshooting

### "Invalid client credentials"

- Verify `client_secret` is correct in config.json
- Check that client authentication is enabled in Keycloak
- Ensure you copied the secret from the Credentials tab, not the Client ID

### "User doesn't have required role"

- Verify the user has the role assigned
- Check if you're using realm role vs client role
- Ensure `required_role` in config matches the role name exactly

### "Redirect URI mismatch"

- Check Valid redirect URIs in Keycloak client settings
- Ensure the URL matches exactly (including http/https, port, trailing slash)
- Add both `http://` and `https://` versions if needed
- If using `base_url` in config, ensure it matches your Keycloak redirect URI configuration
- For logout, ensure `https://your-domain.com/?logged_out=true` is in Valid post logout redirect URIs
- Consider using wildcard patterns (e.g., `https://your-domain.com/*`) if your Keycloak version supports it

### "Cannot connect to Keycloak"

- Verify `server_url` is correct and accessible
- Check network connectivity
- Verify Keycloak server is running
- Check firewall rules

### Session issues

- Clear browser cookies
- Verify `session_secret` is set and consistent
- Check that session store is working (memory store is fine for single instance)

## Advanced Configuration

### Configuring Base URL

If you're running behind a reverse proxy or want consistent redirect URIs, you can set `base_url` in your config:

```json
{
  "keycloak": {
    "base_url": "https://net.kiglove.moe"
  }
}
```

This ensures all redirect URIs use this base URL, regardless of how the request arrives. This is especially useful when:
- Using a reverse proxy (nginx, Apache, etc.)
- Accessing via different domains/IPs
- Wanting consistent redirect URIs for Keycloak configuration

**Note:** If `base_url` is not set, the application will auto-detect from request headers, which works for most setups.

### Using Wildcard Redirect URIs

Some Keycloak versions support wildcard patterns in redirect URIs. If your Keycloak supports this, you can configure:

- **Valid redirect URIs:** `https://your-domain.com/*`
- **Valid post logout redirect URIs:** `https://your-domain.com/*`

This allows any path under your domain to be used as a redirect URI, making configuration simpler.

**Important:** Not all Keycloak versions support wildcards. If wildcards don't work, use specific URIs:
- `https://your-domain.com/callback`
- `https://your-domain.com/?logged_out=true`

### Using HTTPS

If your Keycloak server uses HTTPS with self-signed certificates, you may need to configure Node.js to accept them. The application already handles this for UniFi, but Keycloak connections use the default Node.js TLS settings.

### Multiple Instances

If running multiple instances behind a load balancer, consider using a shared session store (Redis) instead of the default memory store.

### Custom Roles

You can create multiple roles and check for them in the code:

```javascript
// In monitor.js, you can check for multiple roles
const hasAccess = allRoles.includes('monitoring-access') || 
                  allRoles.includes('admin') ||
                  allRoles.includes('network-admin');
```

## Security Best Practices

1. **Use HTTPS** for Keycloak server
2. **Rotate client secrets** periodically
3. **Use strong session secrets**
4. **Limit redirect URIs** to known domains
5. **Regularly review** user role assignments
6. **Enable Keycloak audit logging** for security monitoring
7. **Use realm roles** for simpler management (unless you need client-specific roles)

## Next Steps

- See [Provider Setup](Provider-Setup) for configuring providers
- See [Discord Setup](Discord-Setup) for Discord notifications
- See [Security](Security) for security best practices
- See [Troubleshooting](Troubleshooting) for common issues
- [Home](Home) - Wiki index

