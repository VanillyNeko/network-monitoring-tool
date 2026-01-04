# Troubleshooting Guide

Common issues and solutions for the Network Monitoring Dashboard.

**Related Pages:** [Home](Home) | [Installation](Installation) | [Keycloak Setup](Keycloak-Setup) | [Provider Setup](Provider-Setup)

## Table of Contents

- [Dashboard Issues](#dashboard-issues)
- [Authentication Issues](#authentication-issues)
- [Provider Monitoring Issues](#provider-monitoring-issues)
- [Discord Notifications](#discord-notifications)
- [PM2 Issues](#pm2-issues)
- [Network Connectivity](#network-connectivity)
- [Performance Issues](#performance-issues)

## Dashboard Issues

### Dashboard Shows "Loading..." Forever

**Symptoms:**
- Dashboard displays "Loading network status..." indefinitely
- No provider cards appear

**Solutions:**

1. **Check if application is running:**
   ```bash
   npm run pm2:status
   # Or
   ps aux | grep node
   ```

2. **Check application logs:**
   ```bash
   npm run pm2:logs
   # Or
   tail -f logs/pm2-out.log
   ```

3. **Verify web port:**
   - Check `web_port` in `config.json`
   - Ensure URL matches: `http://localhost:5643` (or your port)
   - Check for port conflicts:
     ```bash
     netstat -tulpn | grep 5643
     ```

4. **Check browser console:**
   - Open browser developer tools (F12)
   - Check Console tab for JavaScript errors
   - Check Network tab for failed API requests

5. **Test API endpoint directly:**
   ```bash
   curl http://localhost:5643/api/status
   ```

### Dashboard Shows "No providers configured"

**Solutions:**

1. **Check config.json:**
   ```bash
   cat config.json | jq '.providers'
   ```

2. **Verify JSON syntax:**
   ```bash
   node -e "JSON.parse(require('fs').readFileSync('config.json'))"
   ```

3. **Ensure providers array is not empty**

### Theme Not Applying

**Solutions:**

1. **Clear browser cache:**
   - Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

2. **Check localStorage:**
   - Open browser console
   - Run: `localStorage.getItem('theme')`
   - Clear if needed: `localStorage.removeItem('theme')`

3. **Verify CSS is loading:**
   - Check Network tab in browser dev tools
   - Ensure `index.html` loads successfully

## Authentication Issues

### Keycloak Login Not Working

**Symptoms:**
- Login button doesn't redirect
- Error after login
- "Invalid client credentials"

**Solutions:**

1. **Verify Keycloak configuration:**
   ```bash
   cat config.json | jq '.keycloak'
   ```

2. **Check Keycloak server accessibility:**
   ```bash
   curl -k https://your-keycloak-server.com
   ```

3. **Verify client secret:**
   - Go to Keycloak admin console
   - Clients → cell-monitoring → Credentials
   - Copy secret and update config.json

4. **Check redirect URIs:**
   - Keycloak → Clients → cell-monitoring → Settings
   - Ensure redirect URI matches exactly: `http://your-server:5643/*`

5. **Check browser console for errors**

### "User doesn't have required role"

**Symptoms:**
- User can login but sees limited information
- Error message about insufficient permissions

**Solutions:**

1. **Verify user has role:**
   - Keycloak → Users → Select user → Role Mappings
   - Check if `monitoring-access` role is assigned

2. **Check role type:**
   - If using realm role, assign realm role
   - If using client role, assign client role
   - Ensure role name matches exactly in config

3. **Verify role name in config:**
   ```bash
   cat config.json | jq '.keycloak.required_role'
   ```

4. **Check token content:**
   - After login, check `/api/auth/status` endpoint
   - Verify roles array contains required role

### Session Issues

**Symptoms:**
- User gets logged out frequently
- Session doesn't persist

**Solutions:**

1. **Check session secret:**
   - Ensure `session_secret` is set in config.json
   - Use a strong random string

2. **Clear browser cookies:**
   - Clear cookies for the domain
   - Try incognito/private mode

3. **Check session store:**
   - Memory store is fine for single instance
   - For multiple instances, use Redis or database

## Provider Monitoring Issues

### Provider Shows as DOWN

**Symptoms:**
- Provider status shows red "DOWN" badge
- No details available

**Solutions:**

1. **Check network connectivity:**
   ```bash
   ping 192.168.12.1  # Replace with provider IP
   ```

2. **Test API endpoint:**
   ```bash
   curl http://192.168.12.1/TMI/v1/gateway?get=all
   ```

3. **Verify IP address:**
   - Check provider IP in config.json
   - Ensure IP is correct and accessible

4. **Check firewall rules:**
   - Ensure port 80/443 is open
   - Check if provider device blocks requests

5. **Review application logs:**
   ```bash
   npm run pm2:logs | grep -i error
   ```

6. **Check provider device:**
   - Access provider web interface
   - Verify device is powered on and connected

### Signal Keys Not Showing

**Symptoms:**
- Provider shows as UP but no signal information
- Signal fields show "N/A"

**Solutions:**

1. **Verify API response:**
   ```bash
   curl http://192.168.12.1/TMI/v1/gateway?get=all | jq '.signal'
   ```

2. **Check signal_keys in config:**
   - Ensure keys match API response exactly
   - Check for case sensitivity (RSRP vs rsrp)

3. **Verify key names:**
   - Compare config keys with actual API response
   - Update config if keys are different

### Health Check Not Working

**Symptoms:**
- Provider shows incorrect status
- Health check always returns same value

**Solutions:**

1. **Verify health_key_path:**
   ```bash
   curl http://192.168.12.1/TMI/v1/gateway?get=all | jq '.connectionStatus.connected'
   ```

2. **Check path format:**
   - Path should be array: `["connectionStatus", "connected"]`
   - Matches JSON structure exactly

3. **Test different health values:**
   - Check what values indicate "up" status
   - Update health check logic if needed

### UniFi API Errors

**Symptoms:**
- "API error" in provider details
- "NoSiteContext" error
- "Unauthorized" error

**Solutions:**

1. **Verify API key:**
   - Check API key in config.json
   - Regenerate if needed in UniFi controller

2. **Check site name:**
   - Verify site name matches your setup
   - Use "default" if unsure
   - List sites: See KEYCLOAK_SETUP.md

3. **Verify controller URL:**
   - Ensure URL is accessible
   - Check port (8443 or 443)
   - Test with curl

4. **Check SSL certificate:**
   - Application accepts self-signed certs
   - If issues persist, verify certificate

## Discord Notifications

### Not Receiving Notifications

**Solutions:**

1. **Test webhook manually:**
   ```bash
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"content":"Test"}' \
     YOUR_WEBHOOK_URL
   ```

2. **Verify webhook URL:**
   - Check config.json for correct URL
   - Ensure URL is not expired or deleted

3. **Check application logs:**
   ```bash
   npm run pm2:logs | grep -i discord
   ```

4. **Verify Discord channel:**
   - Check if webhook is still active
   - Ensure bot has permission to send messages

### Webhook Rate Limited

**Symptoms:**
- Some notifications not sending
- Rate limit errors in logs

**Solutions:**

1. **Reduce check frequency:**
   - Increase `check_interval_seconds` in config
   - Default is 60 seconds

2. **Implement notification throttling:**
   - Only send notifications for state changes
   - Add delay between notifications

## PM2 Issues

### Process Won't Start

**Solutions:**

1. **Check PM2 status:**
   ```bash
   pm2 status
   ```

2. **View error logs:**
   ```bash
   pm2 logs cell-monitoring --err
   ```

3. **Test script directly:**
   ```bash
   node monitor.js
   ```

4. **Check dependencies:**
   ```bash
   npm install
   ```

### Process Keeps Restarting

**Solutions:**

1. **Check error logs:**
   ```bash
   pm2 logs cell-monitoring --err
   ```

2. **Monitor memory usage:**
   ```bash
   pm2 monit
   ```

3. **Check restart count:**
   ```bash
   pm2 show cell-monitoring
   ```

4. **Review memory limit:**
   - Check `max_memory_restart` in ecosystem.config.js
   - Increase if needed

### Logs Not Appearing

**Solutions:**

1. **Check log directory:**
   ```bash
   ls -la logs/
   ```

2. **Verify permissions:**
   ```bash
   chmod 755 logs/
   ```

3. **Check log file paths:**
   ```bash
   pm2 show cell-monitoring
   ```

## Network Connectivity

### Cannot Reach Provider Devices

**Solutions:**

1. **Check network routing:**
   ```bash
   ip route get 192.168.12.1
   ```

2. **Verify VLAN configuration:**
   - Ensure monitoring server is on same network
   - Check VLAN tags if using VLANs

3. **Test with different tool:**
   ```bash
   telnet 192.168.12.1 80
   ```

4. **Check firewall:**
   - Ensure outbound connections allowed
   - Check iptables/firewall rules

### DNS Resolution Issues

**Solutions:**

1. **Test DNS:**
   ```bash
   nslookup keycloak.example.com
   ```

2. **Use IP addresses:**
   - Replace hostnames with IPs in config
   - Especially for Keycloak server URL

3. **Check /etc/hosts:**
   ```bash
   cat /etc/hosts
   ```

## Performance Issues

### High CPU Usage

**Solutions:**

1. **Reduce check frequency:**
   - Increase `check_interval_seconds`
   - Default is 60 seconds

2. **Optimize provider checks:**
   - Reduce timeout values
   - Remove unnecessary API calls

3. **Monitor with PM2:**
   ```bash
   pm2 monit
   ```

### High Memory Usage

**Solutions:**

1. **Check memory usage:**
   ```bash
   pm2 monit
   ```

2. **Set memory limit:**
   - Update `max_memory_restart` in ecosystem.config.js
   - PM2 will restart if limit exceeded

3. **Review data retention:**
   - Check if status object grows unbounded
   - Implement data cleanup if needed

### Slow Dashboard Loading

**Solutions:**

1. **Check provider response times:**
   - Some providers may be slow to respond
   - Increase timeout values if needed

2. **Optimize API calls:**
   - Reduce number of API endpoints checked
   - Cache responses when possible

3. **Check network latency:**
   - Test ping times to provider devices
   - Consider network optimization

## Getting Help

If you're still experiencing issues:

1. **Check logs:**
   ```bash
   npm run pm2:logs > debug.log
   ```

2. **Collect system information:**
   ```bash
   node --version
   npm --version
   pm2 --version
   ```

3. **Review configuration:**
   - Ensure config.json is valid JSON
   - Check all required fields are present

4. **Open an issue:**
   - Include error messages
   - Provide relevant log excerpts
   - Describe steps to reproduce

## Debug Mode

Enable verbose logging:

```bash
DEBUG=* npm start
```

Or with PM2:

```bash
pm2 start ecosystem.config.js --node-args="--inspect"
```

## Next Steps

- See [Keycloak Setup](Keycloak-Setup) for authentication setup
- See [Provider Setup](Provider-Setup) for provider configuration
- See [Discord Setup](Discord-Setup) for notifications
- See [PM2 Setup](PM2-Setup) for process management
- [Home](Home) - Wiki index

