/**
 * platforms/lifx.js
 * LIFX smart light control via cloud API
 * Setup: add LIFX_TOKEN=xxx to secrets/lifx.env
 */

const { loadSecrets } = require('../lib/secrets');

function getClient() {
  const { LIFX_TOKEN } = loadSecrets('lifx');
  const headers = { Authorization: `Bearer ${LIFX_TOKEN}`, 'Content-Type': 'application/json' };
  
  async function request(method, endpoint, body = null) {
    const res = await fetch(`https://api.lifx.com/v1${endpoint}`, {
      method, headers, body: body ? JSON.stringify(body) : null
    });
    return res.json();
  }
  
  return {
    // List all lights
    listLights: () => request('GET', '/lights/all'),
    
    // Control lights: selector = 'all', 'label:Living Room', 'id:xxx'
    setState: (selector, state) => request('PUT', `/lights/${selector}/state`, state),
    
    // Shortcuts
    turnOn: (selector = 'all') => request('PUT', `/lights/${selector}/state`, { power: 'on' }),
    turnOff: (selector = 'all') => request('PUT', `/lights/${selector}/state`, { power: 'off' }),
    setBrightness: (selector, brightness) => request('PUT', `/lights/${selector}/state`, { brightness, power: 'on' }),
    setColor: (selector, color) => request('PUT', `/lights/${selector}/state`, { color, power: 'on' }),
    
    // Toggle
    toggle: (selector = 'all') => request('POST', `/lights/${selector}/toggle`),
  };
}

module.exports = { getClient };

// CLI usage: node platforms/lifx.js list
if (require.main === module) {
  const cmd = process.argv[2];
  const lifx = getClient();
  (async () => {
    if (cmd === 'list') {
      const lights = await lifx.listLights();
      for (const l of lights) {
        console.log(`${l.label} | ${l.power} | brightness: ${Math.round(l.color?.brightness * 100)}% | group: ${l.group?.name}`);
      }
    } else if (cmd === 'on') {
      await lifx.turnOn(process.argv[3] || 'all');
      console.log('Lights on ✅');
    } else if (cmd === 'off') {
      await lifx.turnOff(process.argv[3] || 'all');
      console.log('Lights off ✅');
    } else {
      console.log('Usage: node lifx.js [list|on|off] [selector]');
    }
  })();
}
