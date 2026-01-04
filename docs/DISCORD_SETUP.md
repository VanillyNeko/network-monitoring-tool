# Discord Webhook Setup Guide

This guide explains how to set up Discord notifications for the Network Monitoring Dashboard.

## Overview

Discord webhooks allow the monitoring system to send notifications directly to a Discord channel when:
- A service goes down (🚨)
- A service comes back online (✅)

## Step 1: Create a Discord Webhook

1. **Open Discord** and navigate to your server

2. **Go to Server Settings:**
   - Right-click on your server name
   - Select "Server Settings"

3. **Navigate to Integrations:**
   - Click "Integrations" in the left sidebar
   - Click "Webhooks" tab
   - Click "New Webhook" or "Create Webhook"

4. **Configure the Webhook:**
   - **Name:** "Network Monitor" (or your preferred name)
   - **Channel:** Select the channel where you want notifications
   - **Copy Webhook URL:** Click "Copy Webhook URL"
     - Format: `https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN`

5. **Optional Settings:**
   - **Avatar:** Upload a custom avatar for the webhook
   - **Description:** Add a description (optional)

6. **Save the Webhook:**
   - Click "Save Changes"

## Step 2: Configure the Dashboard

Add the webhook URL to your `config.json`:

```json
{
  "discord": {
    "webhook_url": "https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN"
  }
}
```

**Important:** Keep your webhook URL secret! Anyone with this URL can send messages to your Discord channel.

## Step 3: Test the Webhook

### Manual Test

Test the webhook manually using curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"content":"Test notification from Network Monitor"}' \
  YOUR_WEBHOOK_URL
```

You should see a message appear in your Discord channel.

### Test from Dashboard

1. **Restart the application:**
   ```bash
   npm run pm2:restart
   ```

2. **Trigger a test:**
   - Temporarily disconnect a monitored device
   - Or wait for a real status change
   - You should receive a notification in Discord

## Notification Format

### Service Down Notification

When a service goes offline, you'll receive:

```
🚨 Service Down
**T-Mobile Home Internet** is DOWN!

**ping**: OK
**gateway_wan_status**: connected
**gateway_wan_port**: Port 8
**behind_nat**: true
**gateway_private_ip**: 192.168.12.215
**gateway_verified**: true
```

### Service Restored Notification

When a service comes back online:

```
✅ Service Restored
**T-Mobile Home Internet** is back UP!
```

## Customizing Notifications

### Modify Notification Content

Edit the `sendDiscordWebhook` function in `monitor.js`:

```javascript
async function sendDiscordWebhook(message, isUp) {
  if (!discordEnabled) return;
  
  try {
    const embed = {
      title: isUp ? '✅ Service Restored' : '🚨 Service Down',
      description: message,
      color: isUp ? 0x48bb78 : 0xf56565,
      timestamp: new Date().toISOString(),
      // Add custom fields
      fields: [
        {
          name: 'Provider',
          value: prov.name,
          inline: true
        },
        {
          name: 'Status',
          value: isUp ? 'Online' : 'Offline',
          inline: true
        }
      ]
    };

    await fetch(config.discord.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });
  } catch (err) {
    console.error('Error sending Discord webhook:', err.message);
  }
}
```

### Add Thumbnail or Image

```javascript
const embed = {
  // ... other fields
  thumbnail: {
    url: 'https://example.com/status-icon.png'
  },
  image: {
    url: 'https://example.com/status-chart.png'
  }
};
```

### Custom Username and Avatar

```javascript
await fetch(config.discord.webhook_url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    username: 'Network Monitor',
    avatar_url: 'https://example.com/avatar.png',
    embeds: [embed]
  })
});
```

## Multiple Webhooks

To send to multiple Discord channels, you can modify the code to support multiple webhooks:

```javascript
// In config.json
"discord": {
  "webhook_urls": [
    "https://discord.com/api/webhooks/ID1/TOKEN1",
    "https://discord.com/api/webhooks/ID2/TOKEN2"
  ]
}

// In monitor.js
async function sendDiscordWebhook(message, isUp) {
  const webhooks = config.discord.webhook_urls || 
                   (config.discord.webhook_url ? [config.discord.webhook_url] : []);
  
  for (const webhookUrl of webhooks) {
    try {
      // ... send to each webhook
    } catch (err) {
      console.error(`Error sending to webhook: ${err.message}`);
    }
  }
}
```

## Rate Limiting

Discord webhooks have rate limits:
- **10 requests per second** per webhook
- If you exceed this, requests will be rate-limited

The monitoring system checks providers every 60 seconds by default, so you shouldn't hit rate limits under normal operation.

## Security Best Practices

1. **Keep Webhook URL Secret:**
   - Don't commit webhook URLs to version control
   - Use environment variables or secure config management
   - Rotate webhook URLs periodically

2. **Use Environment Variables:**
   ```bash
   # In .env file
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   
   # In config.json (if using dotenv)
   "discord": {
     "webhook_url": process.env.DISCORD_WEBHOOK_URL
   }
   ```

3. **Restrict Webhook Permissions:**
   - Create webhooks in channels with limited access
   - Use a dedicated channel for monitoring notifications
   - Don't give webhook admin permissions

4. **Monitor Webhook Usage:**
   - Check Discord server audit logs
   - Monitor for unexpected messages
   - Set up alerts for webhook abuse

## Troubleshooting

### Not Receiving Notifications

1. **Check Webhook URL:**
   - Verify the URL is correct in config.json
   - Test manually with curl (see Step 3)

2. **Check Application Logs:**
   ```bash
   npm run pm2:logs
   ```
   Look for "Error sending Discord webhook" messages

3. **Verify Webhook is Active:**
   - Go to Discord → Server Settings → Integrations → Webhooks
   - Ensure the webhook is enabled
   - Check if it was deleted

4. **Check Network Connectivity:**
   - Ensure the server can reach `discord.com`
   - Check firewall rules
   - Verify DNS resolution

### Webhook Deleted or Invalid

If you get errors about invalid webhook:
1. Create a new webhook
2. Update the URL in config.json
3. Restart the application

### Rate Limited

If you see rate limit errors:
1. Reduce check frequency in config (`check_interval_seconds`)
2. Implement rate limiting in the code
3. Use multiple webhooks to distribute load

### Messages Not Formatting Correctly

Discord embeds support Markdown. Ensure your message formatting is correct:
- Use `**bold**` for bold text
- Use `*italic*` for italic
- Use `\n` for new lines
- Check embed field limits (25 fields max, 1024 chars per field)

## Advanced: Custom Notification Rules

You can modify the notification logic to only send alerts for specific conditions:

```javascript
// Only notify if service is down for more than 5 minutes
if (!up && prevUp) {
  setTimeout(async () => {
    const currentStatus = await checkProvider(prov);
    if (!currentStatus.up) {
      await sendDiscordWebhook(...);
    }
  }, 5 * 60 * 1000);
}
```

## Next Steps

- See [KEYCLOAK_SETUP.md](KEYCLOAK_SETUP.md) for authentication setup
- See [PROVIDER_SETUP.md](PROVIDER_SETUP.md) for provider configuration
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md) for more help

