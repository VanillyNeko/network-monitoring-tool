# Embedding Guide

This guide explains how to embed the Network Monitoring Dashboard as a widget on your website or status page.

**Related Pages:** [Home](Home) | [API](API) | [Troubleshooting](Troubleshooting)

## Overview

The dashboard can be embedded as an iframe widget on any website. It automatically detects when it's in an iframe and adjusts its layout accordingly.

## Quick Start

### Basic Embed

```html
<iframe 
  src="http://your-server:5643?mode=widget" 
  width="100%" 
  height="600" 
  frameborder="0"
  style="border: 1px solid #ddd; border-radius: 8px;"
></iframe>
```

### Compact Widget

```html
<iframe 
  src="http://your-server:5643?mode=widget&compact=true&header=false" 
  width="100%" 
  height="400" 
  frameborder="0"
  style="border: 1px solid #ddd; border-radius: 8px;"
></iframe>
```

## URL Parameters

The widget supports several URL parameters for customization:

| Parameter | Values | Description | Default |
|-----------|--------|-------------|---------|
| `mode` | `widget`, `full` | Widget mode or full dashboard | `widget` (if in iframe) |
| `theme` | `light`, `dark`, `anime` | Color theme | `light` |
| `compact` | `true`, `false` | Compact layout with smaller spacing | `false` |
| `header` | `true`, `false` | Show/hide header with title and theme selector | `true` |
| `auth` | `true`, `false` | Show/hide authentication buttons | `true` |

## Examples

### Dark Theme Widget

```html
<iframe 
  src="http://your-server:5643?mode=widget&theme=dark&header=false" 
  width="100%" 
  height="500" 
  frameborder="0"
></iframe>
```

### Compact Status Widget

```html
<iframe 
  src="http://your-server:5643?mode=widget&compact=true&header=false&auth=false" 
  width="100%" 
  height="300" 
  frameborder="0"
  style="border: none;"
></iframe>
```

### Anime Theme with Header

```html
<iframe 
  src="http://your-server:5643?mode=widget&theme=anime" 
  width="100%" 
  height="700" 
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
></iframe>
```

## Responsive Embedding

### CSS-Based Responsive

```html
<style>
  .status-widget {
    position: relative;
    width: 100%;
    height: 0;
    padding-bottom: 75%; /* 4:3 aspect ratio */
    overflow: hidden;
  }
  
  .status-widget iframe {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
</style>

<div class="status-widget">
  <iframe src="http://your-server:5643?mode=widget&compact=true&header=false"></iframe>
</div>
```

### JavaScript-Based Responsive

```html
<iframe 
  id="status-widget"
  src="http://your-server:5643?mode=widget&compact=true&header=false" 
  width="100%" 
  frameborder="0"
  onload="resizeIframe(this)"
></iframe>

<script>
function resizeIframe(iframe) {
  // Listen for messages from iframe
  window.addEventListener('message', function(event) {
    if (event.data.type === 'resize' && event.data.height) {
      iframe.style.height = event.data.height + 'px';
    }
  });
  
  // Request initial size
  iframe.contentWindow.postMessage({type: 'getHeight'}, '*');
}
</script>
```

## Configuration

### Enable/Disable Embedding

In `config.json`:

```json
{
  "allow_embedding": true
}
```

Set to `false` to disable iframe embedding (for security).

### CORS Configuration

The application automatically sets CORS headers to allow embedding. If you need to restrict embedding to specific domains, modify the CORS middleware in `monitor.js`.

## Security Considerations

### X-Frame-Options

By default, the application sets:
- `X-Frame-Options: ALLOWALL` (when embedding is enabled)
- `Content-Security-Policy: frame-ancestors *`

### Restricting Embedding

To restrict embedding to specific domains:

1. **Disable embedding entirely:**
   ```json
   "allow_embedding": false
   ```

2. **Modify CORS in code:**
   Edit `monitor.js` to restrict `frame-ancestors`:
   ```javascript
   res.setHeader('Content-Security-Policy', "frame-ancestors https://yourdomain.com");
   ```

### Authentication in Widgets

When Keycloak is enabled:
- Widgets show public status (up/down only) by default
- Users can click login to authenticate
- Set `auth=false` to hide login buttons in widget mode

## Styling the Widget

### Custom Container Styles

```html
<div style="max-width: 1200px; margin: 0 auto; padding: 20px;">
  <iframe 
    src="http://your-server:5643?mode=widget&theme=dark" 
    width="100%" 
    height="600" 
    frameborder="0"
    style="border: 2px solid #333; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);"
  ></iframe>
</div>
```

### Matching Your Site Theme

Use the `theme` parameter to match your site:
- `light` - Light theme (good for light backgrounds)
- `dark` - Dark theme (good for dark backgrounds)
- `anime` - Purple/violet theme

## Common Use Cases

### Status Page

```html
<section id="network-status">
  <h2>Network Status</h2>
  <iframe 
    src="http://your-server:5643?mode=widget&compact=true&header=false&theme=dark" 
    width="100%" 
    height="400" 
    frameborder="0"
    style="border-radius: 8px;"
  ></iframe>
</section>
```

### Dashboard Widget

```html
<div class="dashboard-widget">
  <iframe 
    src="http://your-server:5643?mode=widget&theme=light" 
    width="100%" 
    height="500" 
    frameborder="0"
  ></iframe>
</div>
```

### Sidebar Widget

```html
<aside class="sidebar">
  <h3>Network Status</h3>
  <iframe 
    src="http://your-server:5643?mode=widget&compact=true&header=false&auth=false" 
    width="100%" 
    height="300" 
    frameborder="0"
    style="border: 1px solid #ddd; border-radius: 4px;"
  ></iframe>
</aside>
```

## Troubleshooting

### Widget Not Loading

1. **Check embedding is enabled:**
   ```bash
   curl http://your-server:5643/api/widget/config
   ```

2. **Check CORS headers:**
   ```bash
   curl -I http://your-server:5643
   ```
   Look for `X-Frame-Options` and `Content-Security-Policy`

3. **Check browser console:**
   - Open browser developer tools
   - Check for iframe-related errors
   - Verify network requests are successful

### Widget Too Large/Small

Adjust the iframe `height` attribute or use responsive CSS (see Responsive Embedding section).

### Theme Not Applying

- Verify theme parameter is correct: `theme=dark`
- Check if theme is being overridden by localStorage
- Clear browser cache

### Authentication Issues

- If Keycloak is enabled, widgets show limited info by default
- Users need to authenticate to see full details
- Set `auth=false` to hide auth buttons if not needed

## API Endpoint

### Widget Configuration

```bash
GET /api/widget/config
```

Returns:
```json
{
  "allow_embedding": true,
  "default_theme": "light",
  "available_themes": ["light", "dark", "anime"],
  "widget_modes": ["full", "widget", "compact"]
}
```

## Best Practices

1. **Use HTTPS** - Always use HTTPS when embedding on public websites
2. **Set Appropriate Height** - Adjust iframe height based on content
3. **Responsive Design** - Use CSS to make widgets responsive
4. **Theme Matching** - Match widget theme to your site's theme
5. **Performance** - Consider lazy loading for widgets below the fold
6. **Security** - Restrict embedding to trusted domains if possible

## Advanced: Custom Integration

### Using the API Directly

Instead of embedding the full dashboard, you can use the API to build a custom widget:

```javascript
async function loadStatus() {
  const response = await fetch('http://your-server:5643/api/status');
  const data = await response.json();
  
  // Build custom widget HTML
  const widgetHTML = data.providers.map(provider => {
    const status = data.status[provider.name];
    return `
      <div class="status-item">
        <span class="provider-name">${provider.name}</span>
        <span class="status ${status.up ? 'up' : 'down'}">
          ${status.up ? '✓' : '✗'}
        </span>
      </div>
    `;
  }).join('');
  
  document.getElementById('custom-widget').innerHTML = widgetHTML;
}

// Refresh every 60 seconds
setInterval(loadStatus, 60000);
loadStatus();
```

## Next Steps

- See [Main README](https://github.com/VanillyNeko/network-monitoring-tool/blob/main/README.md) for general setup
- See [API](API) for API documentation
- See [Troubleshooting](Troubleshooting) for common issues
- [Home](Home) - Wiki index

