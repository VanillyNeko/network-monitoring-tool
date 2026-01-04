# Security Guide

Comprehensive security guide for the Network Monitoring Dashboard.

**Related Pages:** [Home](Home) | [Keycloak Setup](Keycloak-Setup) | [Installation](Installation) | [Troubleshooting](Troubleshooting)

## Table of Contents

- [Overview](#overview)
- [Configuration Security](#configuration-security)
- [Authentication Security](#authentication-security)
- [Network Security](#network-security)
- [Application Security](#application-security)
- [Data Security](#data-security)
- [Best Practices](#best-practices)
- [Security Checklist](#security-checklist)

## Overview

The Network Monitoring Dashboard handles sensitive information including:
- Provider API credentials
- Keycloak client secrets
- Session tokens
- Network topology information
- Device IP addresses

This guide covers security best practices to protect your installation.

## Configuration Security

### Protect `config.json`

**Critical:** The `config.json` file contains sensitive credentials and must be protected.

#### File Permissions

Set restrictive file permissions:

```bash
# Linux/Mac
chmod 600 config.json

# Verify permissions
ls -l config.json
# Should show: -rw------- (owner read/write only)
```

#### Never Commit to Version Control

The `.gitignore` file already excludes `config.json`, but verify:

```bash
# Check if config.json is tracked
git ls-files | grep config.json
# Should return nothing

# If it shows up, remove it (but keep the file locally)
git rm --cached config.json
```

#### Use Environment Variables (Advanced)

For enhanced security, consider using environment variables for sensitive values:

```bash
# Set environment variables
export KEYCLOAK_CLIENT_SECRET="your-secret"
export DISCORD_WEBHOOK_URL="your-webhook-url"

# Then reference in code (requires code modification)
```

### Session Secret

The `session_secret` is critical for session security.

#### Generate Strong Secrets

```bash
# Generate a secure random secret
openssl rand -base64 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### Requirements

- **Minimum length:** 32 characters
- **Use cryptographically secure random generator**
- **Never reuse secrets** across installations
- **Rotate periodically** (every 90 days recommended)

#### Rotating Session Secret

When rotating the session secret:

1. Update `config.json` with new secret
2. Restart the application
3. **Note:** All existing sessions will be invalidated (users will need to log in again)

### API Keys and Credentials

#### UniFi API Key

- Store securely in `config.json`
- Use read-only API keys when possible
- Rotate keys periodically
- Revoke old keys when rotating

#### Provider Credentials

- Use provider-specific authentication when available
- Avoid storing passwords in plain text
- Use API keys instead of passwords when possible

## Authentication Security

### Keycloak Configuration

#### Use HTTPS

**Always use HTTPS** for Keycloak server:

```json
{
  "keycloak": {
    "server_url": "https://keycloak.example.com"  // ✅ HTTPS
    // NOT: "http://keycloak.example.com"  // ❌ HTTP
  }
}
```

#### Client Secret Security

- Store client secret securely in `config.json`
- Never share client secrets
- Rotate client secrets periodically
- Use different secrets for different environments (dev/staging/prod)

#### Redirect URI Configuration

Limit redirect URIs to known domains:

```json
{
  "keycloak": {
    "base_url": "https://your-domain.com"  // Specific domain
    // Avoid wildcards in production
  }
}
```

In Keycloak, configure:
- **Valid Redirect URIs:** `https://your-domain.com/callback`
- **Valid Post Logout Redirect URIs:** `https://your-domain.com/?logged_out=true`
- **Avoid:** `https://your-domain.com/*` (too permissive)

#### Role-Based Access Control

- Use specific roles (e.g., `monitoring-access`) instead of generic roles
- Assign roles only to trusted users
- Review role assignments regularly
- Use realm roles for simplicity, client roles for granular control

#### Session Management

- Sessions are stored server-side (in memory by default)
- Sessions expire based on Keycloak token expiration
- Clear sessions on logout
- Consider using Redis for session storage in multi-instance deployments

### Token Security

The application handles JWT tokens from Keycloak:

- Tokens are stored in server-side sessions (not in cookies)
- Access tokens contain user roles and permissions
- ID tokens contain user identity information
- Tokens are validated against Keycloak's public keys

**Note:** The application manually decodes tokens due to EdDSA support limitations. Tokens are still validated for expiration.

## Network Security

### Firewall Configuration

#### Restrict Access

Limit access to the dashboard:

```bash
# Allow only specific IPs (example)
ufw allow from 192.168.1.0/24 to any port 5643

# Or restrict to localhost only
# Then use SSH tunnel or reverse proxy
```

#### Port Security

- Use non-standard ports in production (not 5643)
- Or use a reverse proxy (nginx/Apache) on standard ports
- Block direct access to application port from internet

### Reverse Proxy (Recommended)

Use nginx or Apache as a reverse proxy:

#### Benefits

- SSL/TLS termination
- Rate limiting
- Access control
- Hiding application port
- Additional security headers

#### nginx Example

```nginx
server {
    listen 443 ssl http2;
    server_name monitoring.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000" always;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    
    location / {
        limit_req zone=api_limit burst=20 nodelay;
        proxy_pass http://localhost:5643;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL/TLS

#### Use HTTPS

**Always use HTTPS in production:**

1. Obtain SSL certificate (Let's Encrypt recommended)
2. Configure reverse proxy with SSL
3. Redirect HTTP to HTTPS
4. Use strong cipher suites

#### Certificate Management

- Use Let's Encrypt for free certificates
- Set up auto-renewal
- Monitor certificate expiration
- Use strong key sizes (2048+ bits for RSA, 256+ bits for ECDSA)

### Provider Network Access

#### Network Isolation

- Place provider devices on isolated networks when possible
- Use VLANs to segment network traffic
- Limit provider device access to monitoring server only

#### API Access

- Use provider-specific API authentication when available
- Avoid exposing provider APIs to the internet
- Use VPN for remote access if needed

## Application Security

### Dependencies

#### Keep Dependencies Updated

Regularly update dependencies:

```bash
# Check for outdated packages
npm outdated

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

#### Security Advisories

- Monitor Node.js security advisories
- Subscribe to dependency security alerts
- Review changelogs before updating

### Error Handling

The application handles errors securely:

- Error messages don't expose sensitive information
- Stack traces are logged but not exposed to users
- API errors return generic messages to unauthenticated users

### Input Validation

- Provider IPs are validated
- API URLs are validated
- Configuration is validated on startup
- JSON parsing errors are handled gracefully

### Rate Limiting

Consider implementing rate limiting for API endpoints:

```javascript
// Example with express-rate-limit
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## Data Security

### Logging

#### Sensitive Data

**Never log sensitive information:**

- API keys
- Client secrets
- Session tokens
- Passwords
- User credentials

#### Log Rotation

Configure log rotation:

```bash
# PM2 log rotation
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### Data Retention

- Review logs regularly
- Delete old logs periodically
- Don't store sensitive data longer than necessary

### Backup Security

If backing up `config.json`:

- Encrypt backups
- Store backups securely
- Limit backup access
- Use secure backup locations

## Best Practices

### General Security

1. **Principle of Least Privilege**
   - Run application with minimal required permissions
   - Use non-root user when possible
   - Limit file system access

2. **Defense in Depth**
   - Multiple layers of security
   - Don't rely on single security measure
   - Regular security reviews

3. **Regular Updates**
   - Keep Node.js updated
   - Update dependencies regularly
   - Apply security patches promptly

4. **Monitoring and Auditing**
   - Monitor access logs
   - Review authentication attempts
   - Set up alerts for suspicious activity

5. **Incident Response**
   - Have a plan for security incidents
   - Know how to revoke access quickly
   - Document security procedures

### Keycloak Best Practices

1. **Use HTTPS** for Keycloak server
2. **Rotate client secrets** every 90 days
3. **Use strong passwords** for Keycloak admin
4. **Enable MFA** for Keycloak admin accounts
5. **Review user access** regularly
6. **Monitor Keycloak logs** for suspicious activity
7. **Use separate realms** for different environments

### Provider Security

1. **Change default passwords** on provider devices
2. **Use provider-specific authentication** when available
3. **Limit API access** to monitoring server only
4. **Monitor provider device logs** for unauthorized access
5. **Keep provider firmware updated**

## Security Checklist

### Initial Setup

- [ ] Generated strong `session_secret` (32+ characters)
- [ ] Set restrictive file permissions on `config.json` (600)
- [ ] Verified `config.json` is in `.gitignore`
- [ ] Configured Keycloak with HTTPS
- [ ] Used specific redirect URIs (not wildcards)
- [ ] Set up firewall rules
- [ ] Configured reverse proxy with SSL/TLS
- [ ] Enabled security headers

### Ongoing Maintenance

- [ ] Regularly update dependencies (`npm audit`)
- [ ] Rotate `session_secret` every 90 days
- [ ] Rotate Keycloak client secrets periodically
- [ ] Review user access and roles quarterly
- [ ] Monitor access logs regularly
- [ ] Review and rotate API keys
- [ ] Keep Node.js and system updated
- [ ] Review security advisories

### Production Deployment

- [ ] Using HTTPS (not HTTP)
- [ ] Reverse proxy configured with security headers
- [ ] Firewall rules in place
- [ ] Rate limiting configured
- [ ] Log rotation enabled
- [ ] Monitoring and alerting set up
- [ ] Backup strategy for configuration
- [ ] Incident response plan documented

## Common Security Issues

### Weak Session Secrets

**Problem:** Using predictable or short session secrets

**Solution:** Generate cryptographically secure random secrets with sufficient length

### Exposed Configuration

**Problem:** `config.json` committed to version control or world-readable

**Solution:** Verify `.gitignore`, set file permissions to 600

### HTTP Instead of HTTPS

**Problem:** Using HTTP for Keycloak or dashboard access

**Solution:** Always use HTTPS in production, use reverse proxy with SSL

### Overly Permissive Redirect URIs

**Problem:** Using wildcard redirect URIs (`*`)

**Solution:** Use specific redirect URIs for your domain

### Outdated Dependencies

**Problem:** Not updating dependencies with security vulnerabilities

**Solution:** Regularly run `npm audit` and update dependencies

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** open a public issue
2. Email security details to: [Your security email]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond promptly and work with you to resolve the issue.

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Keycloak Security Documentation](https://www.keycloak.org/docs/latest/securing_apps/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)

---

**Remember:** Security is an ongoing process, not a one-time setup. Regularly review and update your security measures.

