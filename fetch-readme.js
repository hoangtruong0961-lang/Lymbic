const https = require('https');

https.get('https://api.github.com/repos/ThienNgongPhiTien/KeHoachDuKien/readme', {
  headers: { 'User-Agent': 'Node.js' }
}, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.content) {
        console.log("README CONTENT:");
        console.log(Buffer.from(json.content, 'base64').toString('utf-8'));
      } else {
        console.log("Response:", data);
      }
    } catch (e) {
      console.log("Error parsing:", e);
    }
  });
}).on('error', (err) => {
  console.log("Error:", err.message);
});
