/**
 * platforms/twilio.js
 * Twilio voice & SMS via REST API
 * Setup: add ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER to secrets/twilio.env
 */

const { loadSecrets } = require('../lib/secrets');

function getClient() {
  const { ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER } = loadSecrets('twilio');
  const base = `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}`;
  const auth = 'Basic ' + Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString('base64');
  const headers = { Authorization: auth, 'Content-Type': 'application/x-www-form-urlencoded' };

  async function request(method, path, params = {}) {
    const body = new URLSearchParams(params).toString();
    const res = await fetch(`${base}${path}`, {
      method, headers, body: method !== 'GET' ? body : undefined
    });
    return res.json();
  }

  return {
    // Send SMS
    sendSMS: (to, body) => request('POST', '/Messages.json', { From: FROM_NUMBER, To: to, Body: body }),
    
    // Make voice call with TwiML message
    makeCall: (to, message) => request('POST', '/Calls.json', {
      From: FROM_NUMBER, To: to,
      Twiml: `<Response><Say voice="Polly.Joanna">${message}</Say></Response>`
    }),
    
    // List phone numbers on account
    listNumbers: () => request('GET', '/IncomingPhoneNumbers.json'),
    
    // Account info
    accountInfo: () => request('GET', '.json'),
  };
}

module.exports = { getClient };

// CLI: node platforms/twilio.js sms "+13109483204" "Hello from Julia"
if (require.main === module) {
  const [,, cmd, to, msg] = process.argv;
  const twilio = getClient();
  (async () => {
    if (cmd === 'sms') {
      const r = await twilio.sendSMS(to, msg);
      console.log('SMS sent:', r.sid);
    } else if (cmd === 'call') {
      const r = await twilio.makeCall(to, msg);
      console.log('Call initiated:', r.sid);
    } else if (cmd === 'numbers') {
      const r = await twilio.listNumbers();
      r.incoming_phone_numbers?.forEach(n => console.log(n.phone_number, n.friendly_name));
    } else {
      console.log('Usage: node twilio.js [sms|call|numbers] [to] [message]');
    }
  })();
}
