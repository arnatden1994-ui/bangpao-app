const https = require('https');

function fetchUrl(url) {
  https.get(url, (res) => {
    if (res.headers.location) {
      console.log('Redirecting to:', res.headers.location);
      return fetchUrl(res.headers.location);
    }
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      console.log('Received HTML length:', data.length);
      console.log('Contains loginScreen hidden:', data.includes('id="loginScreen" class="hidden"'));
      console.log('Contains view-dashboard:', data.includes('id="view-dashboard"'));
      console.log('Contains view-assessment:', data.includes('id="view-assessment"'));
      
      const loginIdx = data.indexOf('id="loginScreen"');
      if (loginIdx !== -1) {
        console.log('Snippet around loginScreen:\n', data.substring(loginIdx - 30, loginIdx + 70));
      }
    });
  });
}

fetchUrl('https://script.google.com/macros/s/AKfycbylNXKtc6ldvAA6BnxUHmosX4hxhLM_a3uXw_A6xn-f18yar0RF_uZaj-ns6Yrlgax8/exec');
