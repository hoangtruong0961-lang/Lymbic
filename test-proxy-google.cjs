const https = require('https');

const data = JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: 'test' }] }]
});

const options = {
  hostname: 'gcli.ggchan.dev',
  port: 443,
  path: '/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=invalid',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, res => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', d => {
    process.stdout.write(d);
  });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
