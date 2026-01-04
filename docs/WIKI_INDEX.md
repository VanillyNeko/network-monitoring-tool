# Network Monitoring Dashboard - Wiki Index

Welcome to the Network Monitoring Dashboard documentation wiki. This index provides an overview of all available documentation.

## 📚 Documentation Overview

### Getting Started

- **[README.md](../README.md)** - Main project README with quick start guide
- **[Installation Guide](#installation)** - Step-by-step installation instructions
- **[Quick Start Guide](#quick-start)** - Get up and running in 5 minutes

### Setup Guides

- **[Keycloak Setup](KEYCLOAK_SETUP.md)** - Complete guide to setting up Keycloak authentication
- **[Provider Setup](PROVIDER_SETUP.md)** - Configure T-Mobile, AT&T, UniFi, and other providers
- **[Discord Setup](DISCORD_SETUP.md)** - Set up Discord webhook notifications
- **[PM2 Setup](PM2_SETUP.md)** - Process management with PM2

### Reference

- **[API Documentation](API.md)** - Complete API endpoint reference
- **[Configuration Reference](#configuration)** - All configuration options explained
- **[Troubleshooting Guide](TROUBLESHOOTING.md)** - Common issues and solutions

## 🚀 Quick Links

### For First-Time Users

1. Start with the [README.md](../README.md)
2. Follow [Installation](#installation) steps
3. Configure your first provider: [Provider Setup](PROVIDER_SETUP.md)
4. Set up PM2: [PM2 Setup](PM2_SETUP.md)

### For Administrators

1. Set up authentication: [Keycloak Setup](KEYCLOAK_SETUP.md)
2. Configure notifications: [Discord Setup](DISCORD_SETUP.md)
3. Review security: [Security Best Practices](#security)

### For Developers

1. API reference: [API Documentation](API.md)
2. Configuration options: [Configuration Reference](#configuration)
3. Contributing: See README.md

## 📖 Documentation Structure

```
docs/
├── README.md (this file)
├── KEYCLOAK_SETUP.md      - Keycloak authentication setup
├── PROVIDER_SETUP.md      - Provider configuration guide
├── DISCORD_SETUP.md       - Discord webhook setup
├── PM2_SETUP.md           - PM2 process management
├── TROUBLESHOOTING.md     - Common issues and solutions
└── API.md                 - API endpoint documentation
```

## 🎯 Common Tasks

### Setting Up a New Installation

1. **[Installation](#installation)** - Install dependencies
2. **[Provider Setup](PROVIDER_SETUP.md)** - Configure providers
3. **[PM2 Setup](PM2_SETUP.md)** - Set up process management
4. **[Keycloak Setup](KEYCLOAK_SETUP.md)** - (Optional) Add authentication
5. **[Discord Setup](DISCORD_SETUP.md)** - (Optional) Add notifications

### Adding a New Provider

1. Review [Provider Setup](PROVIDER_SETUP.md)
2. Find your provider's API endpoint
3. Add configuration to `config.json`
4. Test and verify

### Troubleshooting

1. Check [Troubleshooting Guide](TROUBLESHOOTING.md)
2. Review application logs
3. Test API endpoints manually
4. Check configuration syntax

## 🔧 Configuration

### Main Configuration File

All configuration is in `config.json`. Key sections:

- **Providers** - Internet provider configurations
- **Discord** - Webhook notification settings
- **Keycloak** - Authentication settings
- **Session** - Session management
- **Monitoring** - Check intervals and ports

See individual setup guides for detailed configuration options.

## 🔐 Security

### Best Practices

1. **Keycloak Authentication**
   - Use HTTPS for Keycloak server
   - Rotate client secrets regularly
   - Use strong session secrets
   - Limit redirect URIs

2. **Discord Webhooks**
   - Keep webhook URLs secret
   - Use environment variables
   - Rotate webhooks periodically

3. **General Security**
   - Use strong session secrets
   - Keep config.json secure
   - Regular security updates
   - Monitor access logs

## 📊 Monitoring

### Dashboard Features

- Real-time status updates
- Multiple themes (Light, Dark, Anime)
- Role-based access control
- Comprehensive metrics display

### Metrics Collected

- Connection status
- Signal strength (RSRP, RSRQ, SINR)
- Device information
- Network statistics
- Performance metrics
- Gateway statistics

## 🆘 Getting Help

### Resources

1. **Documentation** - Review relevant guides
2. **Troubleshooting** - Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
3. **Logs** - Review application logs
4. **GitHub Issues** - Open an issue for bugs

### Before Asking for Help

- Check the troubleshooting guide
- Review application logs
- Verify configuration syntax
- Test API endpoints manually
- Check network connectivity

## 📝 Contributing

Contributions are welcome! See the main README.md for contribution guidelines.

### Documentation Contributions

- Fix typos or errors
- Add missing information
- Improve clarity
- Add examples
- Translate to other languages

## 🔄 Updates

### Keeping Up to Date

- Check GitHub releases
- Review changelog
- Update dependencies: `npm update`
- Review breaking changes

### Migration Guides

When updating between versions, check for:
- Configuration changes
- API changes
- Breaking changes in dependencies

## 📞 Support

For issues, questions, or contributions:
- Open a GitHub issue
- Review existing documentation
- Check troubleshooting guide
- Review logs for errors

---

**Last Updated:** 2025-01-03

**Documentation Version:** 1.0

