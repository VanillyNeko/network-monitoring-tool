const fs = require('fs');
const fetch = require('node-fetch');
const express = require('express');
const https = require('https'); // For self-signed certs
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
let status = config.providers.reduce((acc, p) => {
  acc[p.name] = { up: true, details: {}, last_check: Date.now() };
  return acc;
}, {});

const app = express();

// Enable CORS for embedding
app.use((req, res, next) => {
  const allowEmbedding = config.allow_embedding !== false; // Default to true
  if (allowEmbedding) {
    // Note: ALLOWALL is not a standard X-Frame-Options value, but some browsers accept it
    // For better compatibility, we'll remove X-Frame-Options and rely on CSP
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "frame-ancestors *");
  } else {
    res.setHeader('X-Frame-Options', 'DENY');
  }
  // Allow CORS for API endpoints
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Session configuration
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: config.session_secret || 'change-this-secret-in-production',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

// Keycloak configuration (optional - only if configured)
let keycloak = null;
if (config.keycloak && config.keycloak.enabled) {
  const keycloakConfig = {
    serverUrl: config.keycloak.server_url,
    realm: config.keycloak.realm,
    clientId: config.keycloak.client_id,
    publicClient: false, // Use confidential client with secret
    confidentialPort: config.keycloak.confidential_port || 0,
    credentials: {
      secret: config.keycloak.client_secret
    },
    // Ensure redirect URI is consistent
    'auth-server-url': config.keycloak.server_url,
    'realm-public-key': undefined, // Let Keycloak fetch it
    'bearer-only': false,
    'verify-token-audience': false
  };

  keycloak = new Keycloak({ store: memoryStore }, keycloakConfig);
  
  // Helper function to decode JWT tokens
  function decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
      return JSON.parse(decoded);
    } catch (e) {
      return null;
    }
  }
  
  // Middleware to restore session-based authentication
  // This MUST run BEFORE Keycloak middleware to ensure req.kauth is set
  app.use((req, res, next) => {
    // If we have tokens in session but no kauth, restore it
    if (req.session && req.session.keycloak && !req.kauth) {
      try {
        const accessTokenDecoded = decodeJWT(req.session.keycloak.access_token);
        const idTokenDecoded = decodeJWT(req.session.keycloak.id_token);
        
        if (accessTokenDecoded) {
          // Check if token is expired
          const isExpired = accessTokenDecoded.exp ? Date.now() >= accessTokenDecoded.exp * 1000 : false;
          
          if (!isExpired) {
            // Create mock grant object
            req.kauth = {
              grant: {
                access_token: {
                  token: req.session.keycloak.access_token,
                  content: accessTokenDecoded,
                  isExpired: () => isExpired
                },
                refresh_token: {
                  token: req.session.keycloak.refresh_token
                },
                id_token: {
                  token: req.session.keycloak.id_token,
                  content: idTokenDecoded
                }
              }
            };
            // Only log once per request to reduce noise
            if (!req.session._restored_logged) {
              console.log('Session restored for user:', accessTokenDecoded.preferred_username || accessTokenDecoded.email);
              req.session._restored_logged = true;
            }
          } else {
            console.log('Session token expired, clearing session');
            delete req.session.keycloak;
          }
        }
      } catch (error) {
        console.error('Error restoring session:', error);
      }
    }
    next();
  });
  
  // We're handling authentication manually via session restoration
  // The Keycloak middleware causes issues with EdDSA tokens, so we skip it
  // Only use it for specific routes that need it (like logout)
  // The callback route handles OAuth flow manually
  
  // Callback route - Keycloak will redirect here after login
  // Manually handle the token exchange to ensure redirect_uri matches exactly
  app.get('/callback', async (req, res) => {
    // Get the redirect URI base - use config if provided, otherwise detect from request
    let redirectBase;
    if (config.keycloak.base_url) {
      // Use configured base URL
      redirectBase = config.keycloak.base_url;
    } else {
      // Auto-detect from request
      const protocol = req.protocol || (req.secure ? 'https' : 'http');
      const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${config.web_port}`;
      redirectBase = `${protocol}://${host}`;
    }
    
    const redirectUri = `${redirectBase}/callback`;
    
    // Log callback parameters
    
    console.log('Keycloak callback received:', {
      has_code: !!req.query.code,
      has_state: !!req.query.state,
      has_error: !!req.query.error,
      redirect_uri: redirectUri
    });
    
    // If there's an error from Keycloak, handle it
    if (req.query.error) {
      console.error('Keycloak returned error:', req.query.error, req.query.error_description);
      return res.redirect('/?error=' + encodeURIComponent(req.query.error || 'auth_failed'));
    }
    
    // If we have a code, manually exchange it for tokens
    if (req.query.code) {
      try {
        // Make a direct HTTP request to Keycloak token endpoint to see the actual error
        const https = require('https');
        const http = require('http');
        const url = require('url');
        
        const tokenUrl = `${config.keycloak.server_url}/realms/${config.keycloak.realm}/protocol/openid-connect/token`;
        const tokenUrlParsed = url.parse(tokenUrl);
        const isHttps = tokenUrlParsed.protocol === 'https:';
        const requestModule = isHttps ? https : http;
        
        const postData = new URLSearchParams({
          grant_type: 'authorization_code',
          code: req.query.code,
          redirect_uri: redirectUri,
          client_id: config.keycloak.client_id,
          client_secret: config.keycloak.client_secret
        }).toString();
        
        console.log('Token exchange request:', {
          url: tokenUrl,
          redirect_uri: redirectUri,
          client_id: config.keycloak.client_id,
          has_code: !!req.query.code,
          code_length: req.query.code.length
        });
        
        // Make the token exchange request
        const tokenRequest = requestModule.request({
          hostname: tokenUrlParsed.hostname,
          port: tokenUrlParsed.port || (isHttps ? 443 : 80),
          path: tokenUrlParsed.path,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData)
          },
          rejectUnauthorized: false // For self-signed certs
        }, (tokenRes) => {
          let responseData = '';
          tokenRes.on('data', (chunk) => {
            responseData += chunk;
          });
          tokenRes.on('end', async () => {
            if (tokenRes.statusCode === 200) {
              try {
                const tokenData = JSON.parse(responseData);
                console.log('Token exchange successful');
                
                // Keycloak is using EdDSA (OKP) which keycloak-connect doesn't support
                // So we'll decode the tokens without verification and store them directly
                // JWT tokens are base64url encoded, so we can decode them manually
                function decodeJWT(token) {
                  try {
                    const parts = token.split('.');
                    if (parts.length !== 3) return null;
                    // Decode the payload (second part)
                    const payload = parts[1];
                    // Base64url decode
                    const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
                    return JSON.parse(decoded);
                  } catch (e) {
                    return null;
                  }
                }
                
                // Decode tokens without verification (since we can't verify EdDSA)
                const accessTokenDecoded = decodeJWT(tokenData.access_token);
                const idTokenDecoded = decodeJWT(tokenData.id_token);
                
                // Store tokens in session
                req.session.keycloak = {
                  access_token: tokenData.access_token,
                  refresh_token: tokenData.refresh_token,
                  id_token: tokenData.id_token,
                  expires_in: tokenData.expires_in,
                  refresh_expires_in: tokenData.refresh_expires_in,
                  token_type: tokenData.token_type
                };
                req.session.save();
                
                // Create a mock grant object for compatibility with other middleware
                // We'll decode the token content for the grant
                const grant = {
                  access_token: {
                    token: tokenData.access_token,
                    content: accessTokenDecoded.payload,
                    isExpired: () => {
                      if (!accessTokenDecoded.payload.exp) return false;
                      return Date.now() >= accessTokenDecoded.payload.exp * 1000;
                    }
                  },
                  refresh_token: {
                    token: tokenData.refresh_token
                  },
                  id_token: {
                    token: tokenData.id_token,
                    content: idTokenDecoded.payload
                  }
                };
                
                // Set kauth for compatibility with other middleware
                req.kauth = {
                  grant: grant
                };
                
                console.log('Tokens stored successfully, redirecting...');
                const redirectTo = req.session.login_redirect || '/';
                delete req.session.login_redirect;
                return res.redirect(redirectTo);
              } catch (parseError) {
                console.error('Error processing token response:', parseError);
                console.error('Error details:', {
                  message: parseError.message,
                  stack: parseError.stack
                });
                return res.redirect('/?error=token_parse_failed');
              }
            } else {
              console.error('Token exchange failed:', {
                statusCode: tokenRes.statusCode,
                statusMessage: tokenRes.statusMessage,
                response: responseData
              });
              try {
                const errorData = JSON.parse(responseData);
                console.error('Keycloak error:', errorData);
              } catch (e) {
                console.error('Could not parse error response');
              }
              return res.redirect('/?error=token_exchange_failed');
            }
          });
        });
        
        tokenRequest.on('error', (error) => {
          console.error('Token request error:', error);
          return res.redirect('/?error=token_request_failed');
        });
        
        tokenRequest.write(postData);
        tokenRequest.end();
      } catch (error) {
        console.error('Error in token exchange:', error);
        console.error('Error details:', {
          message: error.message,
          stack: error.stack
        });
        return res.redirect('/?error=token_exchange_failed');
      }
    } else {
      console.log('No code in callback');
      return res.redirect('/?error=no_code');
    }
  });
  
  console.log('Keycloak authentication enabled (confidential client)');
} else {
  console.log('Keycloak authentication disabled');
}

// Handle root path - process Keycloak callback if present
app.get('/', (req, res, next) => {
  // If returning from Keycloak logout, ensure session is cleared
  if (keycloak && config.keycloak && config.keycloak.enabled && req.query.logged_out) {
    // Clear any remaining session data
    if (req.session) {
      delete req.session.keycloak;
      req.session.destroy(() => {});
    }
    if (req.kauth) {
      delete req.kauth;
    }
  }
  
  // Serve the page
  res.sendFile('index.html', { root: './public' });
});

app.use(express.static('public'));

// Discord webhook is optional - only enable if webhook URL is configured
const discordEnabled = config.discord && config.discord.webhook_url;

if (discordEnabled) {
  console.log('Discord webhook notifications enabled');
} else {
  console.log('Discord notifications disabled (no webhook URL provided)');
}

// Function to send Discord webhook notification
async function sendDiscordWebhook(message, isUp) {
  if (!discordEnabled) return;
  
  try {
    const embed = {
      title: isUp ? '✅ Service Restored' : '🚨 Service Down',
      description: message,
      color: isUp ? 0x48bb78 : 0xf56565, // Green for up, red for down
      timestamp: new Date().toISOString()
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

// Start monitoring interval regardless of Discord status
  setInterval(checkAll, config.check_interval_seconds * 1000);
  checkAll(); // Initial check

// Helper function to get gateway WAN info from UniFi API
async function getGatewayWANInfo(controllerUrl, apiKey, site, wanPortName) {
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const siteEncoded = encodeURIComponent(site || 'default');
    const baseUrl = controllerUrl.trim().startsWith('http') ? controllerUrl.trim() : `https://${controllerUrl.trim()}`;
    const baseUrls = [baseUrl];
    if (!baseUrl.match(/:\d+$/)) {
      baseUrls.push(`${baseUrl}:8443`, `${baseUrl}:443`);
    }
    
    for (const base of baseUrls) {
      try {
        const apiUrl = `${base}/proxy/network/api/s/${siteEncoded}/stat/device`;
        const res = await fetch(apiUrl, {
          headers: {
            'X-API-Key': apiKey,
            'Accept': 'application/json'
          },
          agent
        });
        
        if (res.ok) {
          const data = await res.json();
          const devices = data.data || data || [];
          
          // Find gateway
          const gateway = devices.find(d => {
            const type = (d.type || '').toLowerCase();
            const name = (d.name || '').toLowerCase();
            return type.includes('gw') || type.includes('udm') || type.includes('udr');
          });
          
          if (gateway) {
            // Find WAN port by network name (wan, wan2, wan3, etc.)
            let wanPort = null;
            let wanPortObj = null;
            
            // Normalize wanPortName for matching
            const wanPortNameLower = wanPortName.toLowerCase();
            const wanPortNameUpper = wanPortName.toUpperCase();
            const normalizedName = wanPortNameLower.replace(/^wan/, ''); // Remove 'wan' prefix to get number (empty for 'wan', '2' for 'wan2', etc.)
            
            // Try to find in port_table - match by network_name
            if (gateway.port_table && Array.isArray(gateway.port_table)) {
              wanPort = gateway.port_table.find(p => {
                if (!p.network_name) return false;
                const portNetwork = p.network_name.toLowerCase();
                
                // Exact match first
                if (portNetwork === wanPortNameLower) return true;
                
                // Match wan1 to wan (they're the same - cable internet)
                if ((wanPortNameLower === 'wan1' || wanPortNameLower === 'wan') && portNetwork === 'wan') return true;
                if (wanPortNameLower === 'wan1' && portNetwork === 'wan1') return true;
                
                // For numbered WANs (wan2, wan3), match exactly
                if (normalizedName && portNetwork === `wan${normalizedName}`) return true;
                
                return false;
              });
            }
            
            // Also check wan1, wan2, wan3 objects directly
            // wan1 and wan refer to the same thing, so check both
            if (gateway[wanPortNameLower]) {
              wanPortObj = gateway[wanPortNameLower];
            } else if (wanPortNameLower === 'wan1' && gateway.wan) {
              wanPortObj = gateway.wan;
            } else if (wanPortNameLower === 'wan' && gateway.wan1) {
              wanPortObj = gateway.wan1;
            }
            
            // Extract public IP - prioritize last_wan_interfaces which has the correct mapping
            let publicIp = 'N/A';
            let privateIp = 'N/A';
            
            // Check last_wan_interfaces first (most accurate)
            // This maps: WAN (cable), WAN2 (T-Mobile), WAN3 (AT&T)
            if (gateway.last_wan_interfaces) {
              // Try exact match first (WAN, WAN2, WAN3)
              let wanInterface = gateway.last_wan_interfaces[wanPortNameUpper];
              // wan1 and wan refer to the same thing (cable), so try WAN if wan1
              if (!wanInterface && (wanPortNameLower === 'wan1' || wanPortNameLower === 'wan')) {
                wanInterface = gateway.last_wan_interfaces['WAN'];
              }
              // Also try with 'WAN' prefix if we have a number (e.g., normalizedName="2" -> "WAN2")
              if (!wanInterface && normalizedName) {
                wanInterface = gateway.last_wan_interfaces[`WAN${normalizedName.toUpperCase()}`];
              }
              
              if (wanInterface && wanInterface.ip) {
                const ip = wanInterface.ip;
                privateIp = ip; // Store the IP (might be private)
                // Only use as public IP if it's actually public
                if (!ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.16.')) {
                  publicIp = ip;
                }
              }
            }
            
            // For WAN ports behind NAT (T-Mobile, AT&T), the gateway only sees private IPs
            // We need to get public IP from the modem itself, not the gateway
            // For now, we'll note that it's behind NAT
            
            // Fallback: check wanPortObj or wanPort for public IP (only if not found above)
            if (publicIp === 'N/A') {
              const checkObj = wanPortObj || wanPort;
              if (checkObj && checkObj.ip) {
                const ip = checkObj.ip;
                if (!ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.16.')) {
                  publicIp = ip;
                } else if (privateIp === 'N/A') {
                  privateIp = ip;
                }
              }
            }
            
            // For main WAN (cable), also check last_wan_ip
            if (publicIp === 'N/A' && (wanPortName.toLowerCase() === 'wan' || wanPortName.toLowerCase() === 'wan1')) {
              if (gateway.last_wan_ip && !gateway.last_wan_ip.startsWith('192.168.') && !gateway.last_wan_ip.startsWith('10.') && !gateway.last_wan_ip.startsWith('172.16.')) {
                publicIp = gateway.last_wan_ip;
              }
            }
            
            // If we only have a private IP, don't show it as public_ip
            // The public IP for NAT'd connections must come from the modem itself
            
            // Determine connection status
            const isUp = wanPortObj ? (wanPortObj.up === true) : 
                       wanPort ? (wanPort.up === true) : 
                       (gateway.state === 1);
            
            const gatewayWANDetails = {
              up: isUp,
              public_ip: publicIp, // Only public IPs, not private
              wan_port_status: wanPortObj ? (wanPortObj.up ? 'connected' : 'disconnected') :
                              wanPort ? (wanPort.up ? 'connected' : 'disconnected') : 'unknown',
              wan_port_name: wanPort?.name || wanPortObj?.name || wanPortName,
              private_ip: privateIp, // Gateway's view of the IP (may be private for NAT'd connections)
              behind_nat: privateIp !== 'N/A' && publicIp === 'N/A' // Indicates connection is behind NAT
            };
            
            // Add port statistics if available
            if (wanPort) {
              gatewayWANDetails.port_speed_mbps = wanPort.speed || 'N/A';
              gatewayWANDetails.port_media = wanPort.media || 'N/A';
              gatewayWANDetails.port_full_duplex = wanPort.full_duplex || false;
              gatewayWANDetails.port_ifname = wanPort.ifname || 'N/A';
              gatewayWANDetails.port_mac = wanPort.mac || 'N/A';
              
              // Traffic statistics
              if (wanPort.rx_bytes !== undefined) {
                gatewayWANDetails.rx_bytes_total = wanPort.rx_bytes;
                gatewayWANDetails.rx_bytes_gb = (wanPort.rx_bytes / 1024 / 1024 / 1024).toFixed(2);
              }
              if (wanPort.tx_bytes !== undefined) {
                gatewayWANDetails.tx_bytes_total = wanPort.tx_bytes;
                gatewayWANDetails.tx_bytes_gb = (wanPort.tx_bytes / 1024 / 1024 / 1024).toFixed(2);
              }
              if (wanPort.rx_packets !== undefined) {
                gatewayWANDetails.rx_packets_total = wanPort.rx_packets;
              }
              if (wanPort.tx_packets !== undefined) {
                gatewayWANDetails.tx_packets_total = wanPort.tx_packets;
              }
              if (wanPort.rx_errors !== undefined) {
                gatewayWANDetails.rx_errors = wanPort.rx_errors;
              }
              if (wanPort.tx_errors !== undefined) {
                gatewayWANDetails.tx_errors = wanPort.tx_errors;
              }
              if (wanPort.rx_dropped !== undefined) {
                gatewayWANDetails.rx_dropped = wanPort.rx_dropped;
              }
              if (wanPort.tx_dropped !== undefined) {
                gatewayWANDetails.tx_dropped = wanPort.tx_dropped;
              }
              
              // Current rates (real-time throughput)
              if (wanPort['rx_rate'] !== undefined) {
                gatewayWANDetails.rx_rate_bps = wanPort['rx_rate'];
                gatewayWANDetails.rx_rate_mbps = (wanPort['rx_rate'] / 1024 / 1024 * 8).toFixed(2);
              }
              if (wanPort['tx_rate'] !== undefined) {
                gatewayWANDetails.tx_rate_bps = wanPort['tx_rate'];
                gatewayWANDetails.tx_rate_mbps = (wanPort['tx_rate'] / 1024 / 1024 * 8).toFixed(2);
              }
              if (wanPort['rx_rate-max'] !== undefined) {
                gatewayWANDetails.rx_rate_max_bps = wanPort['rx_rate-max'];
                gatewayWANDetails.rx_rate_max_mbps = (wanPort['rx_rate-max'] / 1024 / 1024 * 8).toFixed(2);
              }
              if (wanPort['tx_rate-max'] !== undefined) {
                gatewayWANDetails.tx_rate_max_bps = wanPort['tx_rate-max'];
                gatewayWANDetails.tx_rate_max_mbps = (wanPort['tx_rate-max'] / 1024 / 1024 * 8).toFixed(2);
              }
              
              // Network info
              if (wanPort.netmask) {
                gatewayWANDetails.netmask = wanPort.netmask;
              }
              if (wanPort.dns && Array.isArray(wanPort.dns)) {
                gatewayWANDetails.dns_servers = wanPort.dns.join(', ');
              }
            }
            
            return gatewayWANDetails;
          }
        }
      } catch (e) {
        continue;
      }
    }
  } catch (e) {
    // Silently fail - this is optional
  }
  return null;
}

async function checkProvider(prov) {
  // UniFi API monitoring
  if (prov.type === 'unifi_api') {
    try {
      if (!prov.api_key) {
        throw new Error('API key is required for UniFi API monitoring');
      }
      
      const agent = new https.Agent({ rejectUnauthorized: false });
      
      // Build base URL - ensure it has protocol and try common ports
      let baseUrl = prov.controller_url.trim();
      if (!baseUrl.startsWith('http')) {
        baseUrl = `https://${baseUrl}`;
      }
      
      // Remove trailing slash
      baseUrl = baseUrl.replace(/\/$/, '');
      
      // Try ports if not specified
      const baseUrls = [baseUrl];
      if (!baseUrl.match(/:\d+$/)) {
        baseUrls.push(`${baseUrl}:8443`, `${baseUrl}:443`);
      }
      
      // If site not specified, try to get it from API
      let site = prov.site;
      if (!site) {
        // Try to fetch available sites
        for (const base of baseUrls) {
          try {
            const sitesUrl = `${base}/proxy/network/api/self/sites`;
            const sitesRes = await fetch(sitesUrl, {
              headers: {
                'X-API-Key': prov.api_key,
                'Accept': 'application/json'
              },
              agent
            });
            
            if (sitesRes.ok) {
              const sitesData = await sitesRes.json();
              if (sitesData.data && sitesData.data.length > 0) {
                // Use the first site, or find 'default'
                const defaultSite = sitesData.data.find(s => s.name === 'default' || s.name === 'Default');
                site = defaultSite ? defaultSite.name : sitesData.data[0].name;
                console.log(`Found site: ${site}. Available sites: ${sitesData.data.map(s => s.name).join(', ')}`);
                break;
              }
            }
          } catch (e) {
            // Try alternative sites endpoint
            try {
              const sitesUrl2 = `${base}/api/self/sites`;
              const sitesRes2 = await fetch(sitesUrl2, {
                headers: {
                  'X-API-Key': prov.api_key,
                  'Accept': 'application/json'
                },
                agent
              });
              
              if (sitesRes2.ok) {
                const sitesData2 = await sitesRes2.json();
                if (sitesData2.data && sitesData2.data.length > 0) {
                  const defaultSite = sitesData2.data.find(s => s.name === 'default' || s.name === 'Default');
                  site = defaultSite ? defaultSite.name : sitesData2.data[0].name;
                  console.log(`Found site: ${site}. Available sites: ${sitesData2.data.map(s => s.name).join(', ')}`);
                  break;
                }
              }
            } catch (e2) {
              continue;
            }
          }
        }
        
        // Fallback to 'default' if we couldn't fetch sites
        if (!site) {
          site = 'default';
          console.log('Could not fetch sites from API, using "default"');
        }
      }
      
      const siteEncoded = encodeURIComponent(site); // URL encode site name (handles spaces, special chars)
      
      // UniFi Network API endpoints to try (in order of likelihood)
      // Note: The /stat/device endpoint works with API keys and returns all device data
      const endpoints = [
        `/proxy/network/api/s/${siteEncoded}/stat/device`,  // Device stats (works with API keys!)
        `/proxy/network/api/s/${site}/stat/device`,  // Device stats (non-encoded)
        `/proxy/network/api/s/${siteEncoded}/devices`,  // Devices with site context (encoded)
        `/proxy/network/api/s/${siteEncoded}/gateways`,  // Gateways with site context (encoded)
        `/proxy/network/api/s/${site}/devices`,  // Devices with site context (non-encoded)
        `/proxy/network/api/s/${site}/gateways`  // Gateways with site context (non-encoded)
      ];
      
      let res = null;
      let data = null;
      let lastError = null;
      let successfulUrl = null;
      
      // Try each base URL and endpoint combination
      for (const base of baseUrls) {
        for (const endpoint of endpoints) {
          const apiUrl = `${base}${endpoint}`;
          try {
            // Try X-API-Key header (most common for UniFi)
            res = await fetch(apiUrl, {
              headers: {
                'X-API-Key': prov.api_key,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              agent
            });
            
            if (res.ok) {
              const contentType = res.headers.get('content-type') || '';
              if (contentType.includes('application/json')) {
                data = await res.json();
              } else {
                const text = await res.text();
                data = { raw: text };
              }
              successfulUrl = apiUrl;
              break;
            } else if (res.status === 401) {
              // Try alternative header name
              res = await fetch(apiUrl, {
                headers: {
                  'X-API-KEY': prov.api_key,  // Different case
                  'Accept': 'application/json'
                },
                agent
              });
              
              if (res.ok) {
                const contentType = res.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                  data = await res.json();
                } else {
                  const text = await res.text();
                  data = { raw: text };
                }
                successfulUrl = apiUrl;
                break;
              }
            }
            
            // Get error message safely
            const errorText = await res.text().catch(() => '');
            let errorMsg = `Status ${res.status}`;
            if (errorText) {
              try {
                const errorJson = JSON.parse(errorText);
                // UniFi API errors can be in meta.msg, error.message, or message
                errorMsg = errorJson.meta?.msg || 
                          errorJson.error?.message || 
                          errorJson.message || 
                          JSON.stringify(errorJson);
              } catch {
                errorMsg = errorText.substring(0, 100);
              }
            }
            lastError = `${errorMsg} for ${apiUrl}`;
          } catch (e) {
            lastError = `${e.message} for ${apiUrl}`;
            continue;
          }
        }
        if (res && res.ok) break;
      }
      
      if (!res || !res.ok || !data) {
        throw new Error(`UniFi API failed: ${lastError || 'No successful endpoint found'}`);
      }
      
      // Parse device data from response
      let devices = [];
      if (Array.isArray(data)) {
        devices = data;
      } else if (data.data && Array.isArray(data.data)) {
        devices = data.data;
      } else if (data.devices && Array.isArray(data.devices)) {
        devices = data.devices;
      } else if (data.gateways && Array.isArray(data.gateways)) {
        devices = data.gateways;
      } else if (successfulUrl?.includes('health')) {
        // Health endpoint might have different structure
        devices = data.gateways || data.devices || [];
      }
      
      if (devices.length === 0 && data) {
        // If no array found, maybe the data itself is a device object
        devices = [data];
      }
      
      // Find UCI device first (if monitoring UCI specifically)
      let targetDevice = devices.find(d => {
        const type = (d.type || '').toLowerCase();
        const name = (d.name || '').toLowerCase();
        return type === 'uci' || name.includes('cable internet');
      });
      
      // If UCI found, also find the gateway to get public IP
      let gateway = null;
      if (targetDevice && targetDevice.type === 'uci') {
        // Find the gateway device for public IP
        gateway = devices.find(d => {
          const type = (d.type || '').toLowerCase();
          const name = (d.name || '').toLowerCase();
          return type.includes('gw') || 
                 type.includes('udm') ||
                 type.includes('udr') ||
                 name.includes('udm') ||
                 (prov.gateway_mac && d.mac === prov.gateway_mac);
        });
        // Use UCI device as the primary device, but get IP from gateway
      } else {
        // Find gateway/UCI device (original logic)
        gateway = devices.find(d => {
          const type = (d.type || '').toLowerCase();
          const model = (d.model || '').toLowerCase();
          const name = (d.name || '').toLowerCase();
          
          return type.includes('gw') || 
                 type.includes('uci') || 
                 type.includes('udm') ||
                 type.includes('udr') ||
                 model.includes('uci') ||
                 name.includes('gateway') ||
                 name.includes('uci') ||
                 (prov.gateway_mac && d.mac === prov.gateway_mac);
        });
        targetDevice = gateway;
      }
      
      if (!targetDevice) {
        const available = devices.map(d => d.model || d.type || d.name || 'unknown').join(', ');
        throw new Error(`Target device not found. Available: ${available || 'none'}`);
      }
      
      // Extract WAN status from target device (UCI or gateway)
      const wanPort = prov.wan_port || 'wan1';
      let wan = null;
      let up = false;
      
      // Try various WAN data locations on target device
      if (targetDevice.wan_ports && targetDevice.wan_ports[wanPort]) {
        wan = targetDevice.wan_ports[wanPort];
      } else if (targetDevice.wan && typeof targetDevice.wan === 'object') {
        wan = targetDevice.wan[wanPort] || targetDevice.wan;
      } else if (targetDevice.internet) {
        wan = targetDevice.internet;
      } else if (targetDevice[wanPort]) {
        wan = targetDevice[wanPort];
      } else if (targetDevice.wan1) {
        wan = targetDevice.wan1;
      }
      
      // Determine connection status
      if (wan) {
        up = wan.status === 'connected' || 
             wan.up === true || 
             wan.enabled === true ||
             wan.state === 1 ||
             (wan.type && wan.type !== 'disabled' && wan.type !== 'none');
      } else {
        // For UCI devices, check internet flag and state
        if (targetDevice.type === 'uci') {
          up = targetDevice.internet === true || targetDevice.state === 1 || targetDevice.adopted === true;
        } else {
          // Fallback: check device state
          up = targetDevice.state === 1 || 
               targetDevice.adopted === true ||
               (targetDevice.connectivity && targetDevice.connectivity.status === 'connected');
        }
      }
      
      // Extract public IP - prioritize gateway if monitoring UCI
      let publicIp = 'N/A';
      const deviceToCheck = gateway || targetDevice; // Use gateway for IP if available, otherwise target device
      
      // First try last_wan_ip (most reliable for actual public IP)
      if (deviceToCheck.last_wan_ip && !deviceToCheck.last_wan_ip.startsWith('192.168.') && !deviceToCheck.last_wan_ip.startsWith('10.') && !deviceToCheck.last_wan_ip.startsWith('172.16.')) {
        publicIp = deviceToCheck.last_wan_ip;
      }
      // Try wan network IP (if it's a public IP)
      else if (deviceToCheck.wan && deviceToCheck.wan.ip) {
        const wanIp = deviceToCheck.wan.ip;
        if (!wanIp.startsWith('192.168.') && !wanIp.startsWith('10.') && !wanIp.startsWith('172.16.')) {
          publicIp = wanIp;
        }
      }
      // Try wan port IPs
      else if (wan && wan.ip) {
        const wanIp = wan.ip;
        if (!wanIp.startsWith('192.168.') && !wanIp.startsWith('10.') && !wanIp.startsWith('172.16.')) {
          publicIp = wanIp;
        }
      }
      // Check all port_table entries for WAN ports with public IPs
      else if (deviceToCheck.port_table && Array.isArray(deviceToCheck.port_table)) {
        for (const port of deviceToCheck.port_table) {
          if (port.network_name && port.network_name.toLowerCase().includes('wan') && port.ip) {
            const portIp = port.ip;
            if (!portIp.startsWith('192.168.') && !portIp.startsWith('10.') && !portIp.startsWith('172.16.')) {
              publicIp = portIp;
              break;
            }
          }
        }
      }
      
      // If still no public IP found, use whatever we have
      if (publicIp === 'N/A') {
        publicIp = wan?.ip || deviceToCheck.last_wan_ip || deviceToCheck.ip || deviceToCheck['ip-addr'] || 'N/A';
      }
      
      const details = {
        device_type: targetDevice.type || targetDevice.model || 'unknown',
        device_name: targetDevice.name || 'unknown',
        device_mac: targetDevice.mac || 'N/A',
        wan_status: wan?.status || wan?.state || (up ? 'connected' : 'unknown'),
        public_ip: publicIp,
        uptime: targetDevice.uptime || targetDevice['system-stats']?.uptime || 'N/A',
        latency: wan?.latency || 'N/A',
        speeds: wan?.speeds || wan?.speed || 'N/A',
        state: targetDevice.state,
        adopted: targetDevice.adopted
      };

      // Add UCI-specific information if this is a UCI device
      if (targetDevice.type === 'uci') {
        // Cable Internet state information
        if (targetDevice.ci_state_table) {
          details.cable_state = targetDevice.ci_state_table.ci_state || 'N/A';
          details.cable_mode = targetDevice.ci_state_table.ci_mode || 'N/A';
          details.cable_version = targetDevice.ci_state_table.ci_version || 'N/A';
          details.cable_cmts_mac = targetDevice.ci_state_table.ci_cmts_mac || 'N/A';
          details.cable_reinit_reason = targetDevice.ci_state_table.ci_reinit_reason || 'N/A';
          if (targetDevice.ci_state_table.ci_sw_dl_status) {
            details.cable_sw_dl_status = targetDevice.ci_state_table.ci_sw_dl_status;
          }
        }

        // System statistics
        if (targetDevice['system-stats']) {
          details.cpu_percent = targetDevice['system-stats'].cpu || 'N/A';
          details.memory_percent = targetDevice['system-stats'].mem || 'N/A';
        }

        // System stats (more detailed)
        if (targetDevice.sys_stats) {
          details.load_avg_1 = targetDevice.sys_stats.loadavg_1 || 'N/A';
          details.load_avg_5 = targetDevice.sys_stats.loadavg_5 || 'N/A';
          details.load_avg_15 = targetDevice.sys_stats.loadavg_15 || 'N/A';
          if (targetDevice.sys_stats.mem_total) {
            const memTotal = targetDevice.sys_stats.mem_total;
            const memUsed = targetDevice.sys_stats.mem_used || 0;
            const memBuffer = targetDevice.sys_stats.mem_buffer || 0;
            const memFree = memTotal - memUsed;
            details.memory_total_mb = Math.round(memTotal / 1024 / 1024);
            details.memory_used_mb = Math.round(memUsed / 1024 / 1024);
            details.memory_free_mb = Math.round(memFree / 1024 / 1024);
            details.memory_buffer_mb = Math.round(memBuffer / 1024 / 1024);
          }
        }

        // Firmware information
        if (targetDevice.version) {
          details.firmware_version = targetDevice.version;
        }
        if (targetDevice.displayable_version) {
          details.firmware_display = targetDevice.displayable_version;
        }
        if (targetDevice.kernel_version) {
          details.kernel_version = targetDevice.kernel_version;
        }

        // ISP and connection info
        if (targetDevice.isp_name) {
          details.isp_name = targetDevice.isp_name;
        }
        if (targetDevice.wan_port) {
          details.wan_port_name = targetDevice.wan_port;
        }
        if (targetDevice.wan_networkgroup) {
          details.wan_network_group = targetDevice.wan_networkgroup;
        }

        // Port statistics (from port_table)
        if (targetDevice.port_table && Array.isArray(targetDevice.port_table) && targetDevice.port_table.length > 0) {
          const mainPort = targetDevice.port_table[0]; // Usually port 1 for UCI
          if (mainPort) {
            details.port_speed_mbps = mainPort.speed || 'N/A';
            details.port_media = mainPort.media || 'N/A';
            details.port_full_duplex = mainPort.full_duplex || false;
            
            // Traffic statistics
            if (mainPort.rx_bytes !== undefined) {
              details.rx_bytes_total = mainPort.rx_bytes;
              details.rx_bytes_gb = (mainPort.rx_bytes / 1024 / 1024 / 1024).toFixed(2);
            }
            if (mainPort.tx_bytes !== undefined) {
              details.tx_bytes_total = mainPort.tx_bytes;
              details.tx_bytes_gb = (mainPort.tx_bytes / 1024 / 1024 / 1024).toFixed(2);
            }
            if (mainPort.rx_packets !== undefined) {
              details.rx_packets_total = mainPort.rx_packets;
            }
            if (mainPort.tx_packets !== undefined) {
              details.tx_packets_total = mainPort.tx_packets;
            }
            if (mainPort.rx_errors !== undefined) {
              details.rx_errors = mainPort.rx_errors;
            }
            if (mainPort.tx_errors !== undefined) {
              details.tx_errors = mainPort.tx_errors;
            }
          }
        }

        // Overall traffic statistics (from device level)
        if (targetDevice.rx_bytes !== undefined) {
          details.total_rx_bytes_gb = (targetDevice.rx_bytes / 1024 / 1024 / 1024).toFixed(2);
        }
        if (targetDevice.tx_bytes !== undefined) {
          details.total_tx_bytes_gb = (targetDevice.tx_bytes / 1024 / 1024 / 1024).toFixed(2);
        }
        if (targetDevice.bytes !== undefined) {
          details.total_bytes_gb = (targetDevice.bytes / 1024 / 1024 / 1024).toFixed(2);
        }

        // Connection information
        if (targetDevice.connected_at) {
          details.connected_at = new Date(targetDevice.connected_at * 1000).toISOString();
        }
        if (targetDevice.last_seen) {
          details.last_seen = new Date(targetDevice.last_seen * 1000).toISOString();
        }
        if (targetDevice.internet !== undefined) {
          details.internet_access = targetDevice.internet;
        }

        // Downlink information (connection to gateway)
        if (targetDevice.downlink_table && Array.isArray(targetDevice.downlink_table) && targetDevice.downlink_table.length > 0) {
          const downlink = targetDevice.downlink_table[0];
          if (downlink) {
            details.downlink_mac = downlink.mac || 'N/A';
            details.downlink_speed_mbps = downlink.speed || 'N/A';
            details.downlink_full_duplex = downlink.full_duplex || false;
            details.downlink_port = downlink.port_idx !== undefined ? `Port ${downlink.port_idx}` : 'N/A';
          }
        }

        // Device identification
        if (targetDevice.serial) {
          details.serial_number = targetDevice.serial;
        }
        if (targetDevice.architecture) {
          details.architecture = targetDevice.architecture;
        }

        // Adoption status
        if (targetDevice.adoption_completed !== undefined) {
          details.adoption_completed = targetDevice.adoption_completed;
        }
        if (targetDevice.adopted_at) {
          details.adopted_at = new Date(targetDevice.adopted_at * 1000).toISOString();
        }
      }

      return { up, details };
    } catch (e) {
      return { up: false, details: { api_error: e.message } };
    }
  }

  // Check if this provider should also be monitored via UniFi gateway
  let gatewayWANInfo = null;
  if (prov.gateway_wan_port || prov.unifi_controller_url) {
    // Find UniFi config from other providers or use this provider's config
    const unifiConfig = config.providers.find(p => p.type === 'unifi_api');
    if (unifiConfig && unifiConfig.api_key) {
      const wanPortName = prov.gateway_wan_port || prov.wan_port || (prov.name.toLowerCase().includes('t-mobile') ? 'wan2' : prov.name.toLowerCase().includes('att') ? 'wan3' : 'wan');
      gatewayWANInfo = await getGatewayWANInfo(
        unifiConfig.controller_url || prov.unifi_controller_url,
        unifiConfig.api_key,
        unifiConfig.site || 'default',
        wanPortName
      );
    }
  }

  // Basic reachability
  try {
    await fetch(`http://${prov.ip}/`, { timeout: 5000 });
  } catch (e) {
    return { up: false, details: { error: 'Gateway unreachable' } };
  }

  let details = { ping: 'OK' };

  const urls = prov.alt_api_urls ? [prov.api_url, ...prov.alt_api_urls] : [prov.api_url || prov.health_url];

  for (const url of urls) {
    if (!url) continue;
    try {
      const res = await fetch(url, { timeout: 10000 });
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          
          // Extract signal keys (case-insensitive fallback)
          prov.signal_keys.forEach(key => {
            const value = data[key] || data[key.toLowerCase()] || data[key.toUpperCase()] || 'N/A';
            details[key] = value;
          });
          
          // Extract T-Mobile specific information
          if (data.device) {
            details.device_model = data.device.model || 'N/A';
            details.device_manufacturer = data.device.manufacturer || 'N/A';
            details.device_serial = data.device.serial || 'N/A';
            details.device_mac = data.device.macId || 'N/A';
            details.firmware_version = data.device.softwareVersion || 'N/A';
            details.hardware_version = data.device.hardwareVersion || 'N/A';
            details.device_name = data.device.name || data.device.friendlyName || 'N/A';
            details.update_state = data.device.updateState || 'N/A';
            details.is_mesh_supported = data.device.isMeshSupported || false;
          }
          
          // Extract T-Mobile 5G signal details
          if (data.signal && data.signal['5g']) {
            const sig5g = data.signal['5g'];
            details.signal_bars = sig5g.bars || 'N/A';
            details.signal_rsrp = sig5g.rsrp || 'N/A';
            details.signal_rsrq = sig5g.rsrq || 'N/A';
            details.signal_rssi = sig5g.rssi || 'N/A';
            details.signal_sinr = sig5g.sinr || 'N/A';
            details.signal_bands = Array.isArray(sig5g.bands) ? sig5g.bands.join(', ') : sig5g.bands || 'N/A';
            details.signal_cid = sig5g.cid || 'N/A';
            details.signal_gnb_id = sig5g.gNBID || 'N/A';
            details.signal_antenna = sig5g.antennaUsed || 'N/A';
          }
          
          // Extract T-Mobile generic connection info
          if (data.signal && data.signal.generic) {
            const generic = data.signal.generic;
            details.apn = generic.apn || 'N/A';
            details.has_ipv6 = generic.hasIPv6 || false;
            details.registration_status = generic.registration || 'N/A';
            details.is_roaming = generic.roaming || false;
          }
          
          // Extract time/uptime information
          if (data.time) {
            details.uptime_seconds = data.time.upTime || 'N/A';
            if (data.time.upTime) {
              const days = Math.floor(data.time.upTime / 86400);
              const hours = Math.floor((data.time.upTime % 86400) / 3600);
              const minutes = Math.floor((data.time.upTime % 3600) / 60);
              details.uptime_formatted = `${days}d ${hours}h ${minutes}m`;
            }
            if (data.time.localTime) {
              details.local_time = new Date(data.time.localTime * 1000).toISOString();
            }
            details.timezone = data.time.localTimeZone || 'N/A';
            if (data.time.daylightSavings) {
              details.daylight_savings = data.time.daylightSavings.isUsed || false;
            }
          }
          
          // Extract AT&T specific information (if structure is different)
          // AT&T API may return data in a different format
          if (data.ConnUP !== undefined) {
            details.connection_status = data.ConnUP ? 'Connected' : 'Disconnected';
          }
          if (data.RSRP !== undefined) {
            details.signal_rsrp = data.RSRP;
          }
          if (data.RSRQ !== undefined) {
            details.signal_rsrq = data.RSRQ;
          }
          if (data.SINR !== undefined) {
            details.signal_sinr = data.SINR;
          }
          if (data.Band !== undefined) {
            details.signal_band = data.Band;
          }
          
          // Try to extract any device/model information from AT&T
          if (data.DeviceType || data.Model || data.Firmware || data.Serial) {
            if (data.DeviceType) details.device_type_att = data.DeviceType;
            if (data.Model) details.device_model = data.Model;
            if (data.Firmware) details.firmware_version = data.Firmware;
            if (data.Serial) details.device_serial = data.Serial;
          }
          
          // Try to extract public IP from modem API if available
          // T-Mobile and AT&T modems might expose their public IP
          if (!details.public_ip || details.public_ip === 'N/A') {
            // Check common fields where modems might store public IP
            const possiblePublicIpFields = [
              'publicIp', 'public_ip', 'wanIp', 'wan_ip', 'externalIp', 'external_ip',
              'internetIp', 'internet_ip', 'ipv4', 'ipAddress', 'ip_address',
              'WanIP', 'WANIP', 'PublicIP', 'PUBLICIP'
            ];
            for (const field of possiblePublicIpFields) {
              const ip = data[field] || (data.device && data.device[field]) || 
                        (data.signal && data.signal[field]) || 
                        (data.connection && data.connection[field]);
              if (ip && typeof ip === 'string' && 
                  !ip.startsWith('192.168.') && !ip.startsWith('10.') && !ip.startsWith('172.16.') &&
                  !ip.startsWith('172.17.') && !ip.startsWith('172.18.') && !ip.startsWith('172.19.') &&
                  !ip.startsWith('172.20.') && !ip.startsWith('172.21.') && !ip.startsWith('172.22.') &&
                  !ip.startsWith('172.23.') && !ip.startsWith('172.24.') && !ip.startsWith('172.25.') &&
                  !ip.startsWith('172.26.') && !ip.startsWith('172.27.') && !ip.startsWith('172.28.') &&
                  !ip.startsWith('172.29.') && !ip.startsWith('172.30.') && !ip.startsWith('172.31.')) {
                details.public_ip = ip;
                break;
              }
            }
          }

          // Health check
          if (prov.health_key_path) {
            const healthValue = getNested(data, ...prov.health_key_path);
            const isUp = healthValue === true || healthValue === 'true' || healthValue === 'connected' || healthValue === '2'; // Global.net_status == 2 means connected
            return { up: isUp, details };
          }
          return { up: true, details };
        }
      }
    } catch (e) {
      details[`error_${url.split('/').pop()}`] = e.message;
    }
  }

  // Fallback to health_url HTTP check
  if (prov.health_url) {
    try {
      const res = await fetch(prov.health_url, { timeout: 5000 });
      return { up: res.ok, details: { http_status: res.status } };
    } catch {}
  }

  // Merge gateway WAN info if available
  if (gatewayWANInfo) {
    details.gateway_wan_status = gatewayWANInfo.wan_port_status;
    details.gateway_wan_port = gatewayWANInfo.wan_port_name;
    
    // Port information
    if (gatewayWANInfo.port_speed_mbps) {
      details.gateway_port_speed_mbps = gatewayWANInfo.port_speed_mbps;
    }
    if (gatewayWANInfo.port_media) {
      details.gateway_port_media = gatewayWANInfo.port_media;
    }
    if (gatewayWANInfo.port_full_duplex !== undefined) {
      details.gateway_port_full_duplex = gatewayWANInfo.port_full_duplex;
    }
    if (gatewayWANInfo.port_ifname) {
      details.gateway_port_ifname = gatewayWANInfo.port_ifname;
    }
    if (gatewayWANInfo.port_mac) {
      details.gateway_port_mac = gatewayWANInfo.port_mac;
    }
    
    // Traffic statistics from gateway
    if (gatewayWANInfo.rx_bytes_gb) {
      details.gateway_rx_bytes_gb = gatewayWANInfo.rx_bytes_gb;
    }
    if (gatewayWANInfo.tx_bytes_gb) {
      details.gateway_tx_bytes_gb = gatewayWANInfo.tx_bytes_gb;
    }
    if (gatewayWANInfo.rx_packets_total !== undefined) {
      details.gateway_rx_packets = gatewayWANInfo.rx_packets_total;
    }
    if (gatewayWANInfo.tx_packets_total !== undefined) {
      details.gateway_tx_packets = gatewayWANInfo.tx_packets_total;
    }
    if (gatewayWANInfo.rx_errors !== undefined) {
      details.gateway_rx_errors = gatewayWANInfo.rx_errors;
    }
    if (gatewayWANInfo.tx_errors !== undefined) {
      details.gateway_tx_errors = gatewayWANInfo.tx_errors;
    }
    if (gatewayWANInfo.rx_dropped !== undefined) {
      details.gateway_rx_dropped = gatewayWANInfo.rx_dropped;
    }
    if (gatewayWANInfo.tx_dropped !== undefined) {
      details.gateway_tx_dropped = gatewayWANInfo.tx_dropped;
    }
    
    // Current throughput rates
    if (gatewayWANInfo.rx_rate_mbps) {
      details.gateway_rx_rate_mbps = gatewayWANInfo.rx_rate_mbps;
    }
    if (gatewayWANInfo.tx_rate_mbps) {
      details.gateway_tx_rate_mbps = gatewayWANInfo.tx_rate_mbps;
    }
    if (gatewayWANInfo.rx_rate_max_mbps) {
      details.gateway_rx_rate_max_mbps = gatewayWANInfo.rx_rate_max_mbps;
    }
    if (gatewayWANInfo.tx_rate_max_mbps) {
      details.gateway_tx_rate_max_mbps = gatewayWANInfo.tx_rate_max_mbps;
    }
    
    // Network information
    if (gatewayWANInfo.netmask) {
      details.gateway_netmask = gatewayWANInfo.netmask;
    }
    if (gatewayWANInfo.dns_servers) {
      details.gateway_dns_servers = gatewayWANInfo.dns_servers;
    }
    
    // Only set public_ip from gateway if it's actually a public IP
    // For NAT'd connections (T-Mobile, AT&T), gateway only sees private IPs
    if (gatewayWANInfo.public_ip && 
        gatewayWANInfo.public_ip !== 'N/A' &&
        !gatewayWANInfo.public_ip.startsWith('192.168.') &&
        !gatewayWANInfo.public_ip.startsWith('10.') &&
        !gatewayWANInfo.public_ip.startsWith('172.16.')) {
      details.public_ip = gatewayWANInfo.public_ip;
    } else if (gatewayWANInfo.behind_nat) {
      // Connection is behind NAT - public IP must come from modem, not gateway
      details.behind_nat = true;
      details.gateway_private_ip = gatewayWANInfo.private_ip;
    }
    // If gateway shows WAN is up, consider the connection up
    if (gatewayWANInfo.up && details.ping === 'OK') {
      details.gateway_verified = true;
    }
  }

  return { up: true, details }; // Reachable = assume up
}

function getNested(obj, ...keys) {
  return keys.reduce((o, k) => (o || {})[k], obj);
}

async function checkAll() {
  for (const prov of config.providers) {
    const { up, details } = await checkProvider(prov);
    const prevUp = status[prov.name].up;

    // Send Discord webhook notifications if enabled
    if (discordEnabled) {
    if (!up && prevUp) {
        // Service went down
        const detailsSummary = Object.entries(details)
          .slice(0, 10) // Limit to first 10 details to avoid message length issues
          .map(([key, value]) => `**${key.replace(/_/g, ' ')}**: ${value}`)
          .join('\n');
        await sendDiscordWebhook(
          `**${prov.name}** is DOWN!\n\n${detailsSummary}`,
          false
        );
    } else if (up && !prevUp) {
        // Service came back up
        await sendDiscordWebhook(
          `**${prov.name}** is back UP!`,
          true
        );
      }
    }

    status[prov.name].up = up;
    status[prov.name].details = details;
    status[prov.name].last_check = Date.now();
  }
}

// Public endpoint - limited information (only up/down status)
app.get('/api/status', (req, res) => {
  const publicStatus = {};
  Object.keys(status).forEach(providerName => {
    publicStatus[providerName] = {
      up: status[providerName].up,
      last_check: status[providerName].last_check
    };
  });
  res.json({ 
    status: publicStatus, 
    providers: config.providers.map(p => ({ name: p.name })),
    authenticated: false
  });
});

// Protected endpoint - full details (requires authentication and role)
app.get('/api/status/detailed', (req, res, next) => {
  if (keycloak && config.keycloak && config.keycloak.enabled) {
    // Check if user is authenticated
    if (!req.kauth || !req.kauth.grant || !req.kauth.grant.access_token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Check for required role
    const requiredRole = config.keycloak.required_role;
    if (requiredRole) {
      const token = req.kauth.grant.access_token.content;
      
      // Check realm roles
      const realmRoles = token.realm_access?.roles || [];
      // Check client roles
      const clientRoles = token.resource_access?.[config.keycloak.client_id]?.roles || [];
      // Check all roles
      const allRoles = [...realmRoles, ...clientRoles];
      
      if (!allRoles.includes(requiredRole)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          message: `Required role: ${requiredRole}`,
          your_roles: allRoles
        });
      }
    }
  }
  next();
}, (req, res) => {
  // Verify user has the required role (additional check)
  if (config.keycloak && config.keycloak.required_role) {
    const token = req.kauth?.grant?.access_token;
    if (!token) {
      return res.status(403).json({ error: 'Not authenticated' });
    }
    
    const tokenContent = token.content;
    const requiredRole = config.keycloak.required_role;
    
    // Check realm roles
    const realmRoles = tokenContent.realm_access?.roles || [];
    // Check client roles (roles specific to this client)
    const clientRoles = tokenContent.resource_access?.[config.keycloak.client_id]?.roles || [];
    // Check all roles
    const allRoles = [...realmRoles, ...clientRoles];
    
    if (!allRoles.includes(requiredRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Required role: ${requiredRole}`,
        your_roles: allRoles
      });
    }
  }
  
  res.json({ 
    status, 
    providers: config.providers,
    authenticated: true,
    user: req.kauth ? req.kauth.grant.access_token.content : null
  });
});

// Login endpoint - returns login URL for frontend to redirect
app.get('/api/login', (req, res) => {
  if (keycloak && config.keycloak && config.keycloak.enabled) {
    try {
      // Get the redirect URI base - use config if provided, otherwise detect from request
      let redirectBase;
      if (config.keycloak.base_url) {
        // Use configured base URL
        redirectBase = config.keycloak.base_url;
      } else {
        // Auto-detect from request
        const protocol = req.protocol || (req.secure ? 'https' : 'http');
        const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${config.web_port}`;
        redirectBase = `${protocol}://${host}`;
      }
      
      const redirectUri = `${redirectBase}/callback`;
      
      console.log('Generating login URL with redirect_uri:', redirectUri);
      
      // Manually construct login URL with proper state
      const serverUrl = config.keycloak.server_url;
      const realm = config.keycloak.realm;
      const clientId = config.keycloak.client_id;
      
      const authUrl = `${serverUrl}/realms/${realm}/protocol/openid-connect/auth`;
      const encodedClientId = encodeURIComponent(clientId);
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      
      // Generate a proper state token (hex string)
      const crypto = require('crypto');
      const state = crypto.randomBytes(16).toString('hex');
      
      // Store state in session for CSRF protection
      req.session.keycloak_state = state;
      req.session.save();
      
      const loginUrl = `${authUrl}?client_id=${encodedClientId}&redirect_uri=${encodedRedirectUri}&state=${state}&response_type=code&scope=openid`;
      
      res.json({ login_url: loginUrl });
    } catch (error) {
      console.error('Error generating login URL:', error);
      res.status(500).json({ error: 'Failed to generate login URL', message: error.message });
    }
  } else {
    res.status(404).json({ error: 'Keycloak not configured' });
  }
});

// Logout endpoint
app.get('/api/logout', (req, res) => {
  if (keycloak && config.keycloak && config.keycloak.enabled) {
    try {
      // Get tokens BEFORE clearing session (we need them for Keycloak logout)
      const idToken = req.session?.keycloak?.id_token;
      const refreshToken = req.session?.keycloak?.refresh_token;
      
      // Get the redirect URI base - use config if provided, otherwise detect from request
      let redirectBase;
      if (config.keycloak.base_url) {
        // Use configured base URL
        redirectBase = config.keycloak.base_url;
      } else {
        // Auto-detect from request
        const protocol = req.protocol || (req.secure ? 'https' : 'http');
        const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${config.web_port}`;
        redirectBase = `${protocol}://${host}`;
      }
      
      const redirectUri = `${redirectBase}/?logged_out=true`;
      const encodedRedirectUri = encodeURIComponent(redirectUri);
      
      // Clear the session tokens locally first
      if (req.session) {
        delete req.session.keycloak;
        // Destroy the session
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
      }
      
      // Clear req.kauth if it exists
      if (req.kauth) {
        delete req.kauth;
      }
      
      // Manually construct the logout URL
      const serverUrl = config.keycloak.server_url;
      const realm = config.keycloak.realm;
      const clientId = config.keycloak.client_id;
      
      // Build logout URL with all required parameters
      // Keycloak prefers id_token_hint over refresh_token for logout
      let logoutUrl = `${serverUrl}/realms/${realm}/protocol/openid-connect/logout?` +
                      `redirect_uri=${encodedRedirectUri}&` +
                      `client_id=${encodeURIComponent(clientId)}`;
      
      // Use id_token_hint if available (preferred method)
      if (idToken) {
        logoutUrl += `&id_token_hint=${encodeURIComponent(idToken)}`;
      } else if (refreshToken) {
        // Fallback to refresh_token if id_token not available
        logoutUrl += `&refresh_token=${encodeURIComponent(refreshToken)}`;
      }
      
      console.log('Logout URL generated:', logoutUrl.replace(/id_token_hint=[^&]+/, 'id_token_hint=***'));
      
      // Return the logout URL - frontend will redirect to it
      res.json({ logout_url: logoutUrl });
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if there's an error, try to clear the session
      if (req.session) {
        req.session.destroy(() => {});
      }
      res.status(500).json({ error: 'Failed to logout', message: error.message });
    }
  } else {
    res.status(404).json({ error: 'Keycloak not configured' });
  }
});

// Check authentication status
app.get('/api/auth/status', (req, res, next) => {
  // Session restoration middleware already set req.kauth if we have a valid session
  // No need for Keycloak middleware here since we're handling it manually
  next();
}, (req, res) => {
  if (keycloak && config.keycloak && config.keycloak.enabled) {
    const isAuthenticated = req.kauth && req.kauth.grant;
    if (isAuthenticated) {
      const token = req.kauth.grant.access_token.content;
      const requiredRole = config.keycloak.required_role;
      let hasRequiredRole = true;
      
      if (requiredRole) {
        // Check realm roles
        const realmRoles = token.realm_access?.roles || [];
        // Check client roles
        const clientRoles = token.resource_access?.[config.keycloak.client_id]?.roles || [];
        // Check all roles
        const allRoles = [...realmRoles, ...clientRoles];
        hasRequiredRole = allRoles.includes(requiredRole);
      }
      
      res.json({ 
        authenticated: isAuthenticated && hasRequiredRole,
        keycloak_enabled: true,
        has_required_role: hasRequiredRole,
        required_role: requiredRole,
        user: token,
        roles: {
          realm: token.realm_access?.roles || [],
          client: token.resource_access?.[config.keycloak.client_id]?.roles || []
        }
      });
    } else {
      res.json({ 
        authenticated: false,
        keycloak_enabled: true,
        has_required_role: false,
        required_role: config.keycloak.required_role,
        debug: {
          has_kauth: !!req.kauth,
          has_grant: !!(req.kauth && req.kauth.grant),
          query_code: !!req.query.code,
          session_id: req.sessionID
        }
      });
    }
  } else {
    res.json({ authenticated: false, keycloak_enabled: false });
  }
});

// Embedding endpoint - returns embeddable widget HTML
app.get('/embed', (req, res) => {
  res.sendFile('embed.html', { root: './public' });
});

// Widget configuration endpoint
app.get('/api/widget/config', (req, res) => {
  res.json({
    allow_embedding: config.allow_embedding !== false,
    default_theme: 'light',
    available_themes: ['light', 'dark', 'anime'],
    widget_modes: ['full', 'widget', 'compact']
  });
});

app.listen(config.web_port, '0.0.0.0', () => {
  console.log(`Dashboard at http://localhost:${config.web_port}`);
  if (config.allow_embedding !== false) {
    console.log(`Embeddable widget available at http://localhost:${config.web_port}/embed`);
    console.log(`Embed URL: http://localhost:${config.web_port}?mode=widget`);
  }
});
