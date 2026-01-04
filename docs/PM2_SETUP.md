# PM2 Process Management Setup

PM2 is a production process manager for Node.js applications that keeps your application running, automatically restarts it if it crashes, and provides useful monitoring tools.

## Installation

### Install PM2 Globally

```bash
npm install -g pm2
```

### Verify Installation

```bash
pm2 --version
```

## Basic Usage

### Start the Application

```bash
npm run pm2:start
```

Or directly with PM2:

```bash
pm2 start ecosystem.config.js
```

### Check Status

```bash
npm run pm2:status
# Or
pm2 status
```

### View Logs

```bash
npm run pm2:logs
# Or
pm2 logs cell-monitoring
```

### Stop the Application

```bash
npm run pm2:stop
# Or
pm2 stop cell-monitoring
```

### Restart the Application

```bash
npm run pm2:restart
# Or
pm2 restart cell-monitoring
```

### Remove from PM2

```bash
npm run pm2:delete
# Or
pm2 delete cell-monitoring
```

## Ecosystem Configuration

The project includes an `ecosystem.config.js` file with PM2 configuration:

```javascript
module.exports = {
  apps: [{
    name: 'cell-monitoring',
    script: './monitor.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true
  }]
};
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `name` | Process name in PM2 |
| `script` | Entry point script |
| `instances` | Number of instances (1 for single instance) |
| `autorestart` | Auto-restart on crash |
| `watch` | Watch files for changes (disabled for production) |
| `max_memory_restart` | Restart if memory exceeds this limit |
| `error_file` | Error log file path |
| `out_file` | Output log file path |
| `log_date_format` | Timestamp format in logs |
| `merge_logs` | Merge logs from all instances |
| `time` | Add timestamp to logs |

## Auto-Start on Boot

### Linux (systemd)

1. **Generate startup script:**
   ```bash
   pm2 startup
   ```
   This will output a command like:
   ```bash
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u youruser --hp /home/youruser
   ```

2. **Run the generated command** (copy-paste the output)

3. **Save current PM2 process list:**
   ```bash
   pm2 save
   ```

4. **Verify:**
   ```bash
   # Reboot and check
   pm2 status
   ```

### macOS (launchd)

1. **Generate startup script:**
   ```bash
   pm2 startup
   ```

2. **Run the generated command**

3. **Save PM2 process list:**
   ```bash
   pm2 save
   ```

## Monitoring

### Real-Time Monitoring

```bash
pm2 monit
```

This shows:
- CPU usage
- Memory usage
- Logs in real-time
- Process status

### Process Information

```bash
pm2 show cell-monitoring
```

Shows detailed information about the process.

### Process List

```bash
pm2 list
# Or
pm2 ls
```

## Log Management

### View Logs

```bash
# All logs
pm2 logs

# Specific process
pm2 logs cell-monitoring

# Last 100 lines
pm2 logs cell-monitoring --lines 100

# Follow logs (like tail -f)
pm2 logs cell-monitoring --lines 0
```

### Log Files

Logs are stored in the `logs/` directory:
- `logs/pm2-out.log` - Standard output
- `logs/pm2-error.log` - Error output

### Clear Logs

```bash
pm2 flush
```

This clears all log files.

### Log Rotation

PM2 doesn't have built-in log rotation. Use external tools:

**Using logrotate (Linux):**

Create `/etc/logrotate.d/pm2`:

```
/path/to/cell-monitoring/logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0640 youruser youruser
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## Advanced Configuration

### Environment Variables

Add environment-specific variables:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    // ... other config
    env: {
      NODE_ENV: 'production',
      PORT: 5643
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 5644
    }
  }]
};
```

Start with specific environment:

```bash
pm2 start ecosystem.config.js --env development
```

### Cluster Mode

For better performance, run multiple instances:

```javascript
module.exports = {
  apps: [{
    // ... other config
    instances: 4,  // Or 'max' for all CPU cores
    exec_mode: 'cluster'
  }]
};
```

**Note:** This application uses in-memory state, so cluster mode may not be suitable without shared state management.

### Memory Limits

Set memory limits to prevent memory leaks:

```javascript
max_memory_restart: '500M'  // Restart if exceeds 500MB
```

### Watch Mode (Development)

Enable file watching for development:

```javascript
watch: true,
watch_delay: 1000,
ignore_watch: ['node_modules', 'logs']
```

## Useful PM2 Commands

### Process Management

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop cell-monitoring

# Restart
pm2 restart cell-monitoring

# Reload (zero-downtime)
pm2 reload cell-monitoring

# Delete
pm2 delete cell-monitoring

# Kill all
pm2 kill
```

### Information

```bash
# Process list
pm2 list

# Process info
pm2 show cell-monitoring

# Process tree
pm2 list --tree

# Process description
pm2 describe cell-monitoring
```

### Logs

```bash
# View logs
pm2 logs

# Clear logs
pm2 flush

# Reload logs (after rotation)
pm2 reloadLogs
```

### Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process metrics
pm2 describe cell-monitoring
```

### Backup and Restore

```bash
# Save current process list
pm2 save

# Dump current process list
pm2 dump

# Resurrect saved processes
pm2 resurrect
```

## Troubleshooting

### Process Won't Start

1. **Check logs:**
   ```bash
   pm2 logs cell-monitoring --err
   ```

2. **Check configuration:**
   ```bash
   pm2 show cell-monitoring
   ```

3. **Test script directly:**
   ```bash
   node monitor.js
   ```

### Process Keeps Restarting

1. **Check error logs:**
   ```bash
   pm2 logs cell-monitoring --err
   ```

2. **Check memory usage:**
   ```bash
   pm2 monit
   ```

3. **Review restart count:**
   ```bash
   pm2 show cell-monitoring
   ```

### Logs Not Appearing

1. **Check log file paths:**
   ```bash
   pm2 show cell-monitoring
   ```

2. **Verify directory exists:**
   ```bash
   ls -la logs/
   ```

3. **Check permissions:**
   ```bash
   chmod 755 logs/
   ```

### Auto-Start Not Working

1. **Verify startup script:**
   ```bash
   pm2 startup
   ```

2. **Check if processes are saved:**
   ```bash
   pm2 save
   ```

3. **Verify system service:**
   ```bash
   # Linux
   systemctl status pm2-youruser
   
   # macOS
   launchctl list | grep pm2
   ```

## Best Practices

1. **Use ecosystem files** for configuration
2. **Set memory limits** to prevent memory leaks
3. **Enable log rotation** to manage disk space
4. **Monitor processes** regularly with `pm2 monit`
5. **Save process list** after changes with `pm2 save`
6. **Use environment variables** for sensitive data
7. **Set up auto-start** for production deployments
8. **Regular log cleanup** to prevent disk space issues

## Next Steps

- See [KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md) for authentication
- See [PROVIDER_SETUP.md](PROVIDER_SETUP.md) for provider configuration
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help

