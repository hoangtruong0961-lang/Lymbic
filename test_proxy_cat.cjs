const http = require('https');

const req = http.request('https://catiecli.sukaka.top/v1/models/gemini-2.5-flash:generateContent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': 'cat-5c57777f5f4d76724d520f450cf75ab95f0b31200a9e18f5'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Status:', res.statusCode, 'Body:', data));
});

req.on('error', e => console.error(e));
req.write(JSON.stringify({"contents":[{"parts":[{"text":"hello"}]}]}));
req.end();
