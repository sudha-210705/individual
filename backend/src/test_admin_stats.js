const http = require('http');

const loginData = JSON.stringify({
  email: 'admin@gmail.com',
  password: 'password'
});

const loginOptions = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
};

const req = http.request(loginOptions, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const cookie = res.headers['set-cookie'];

    if (cookie) {
      const statsOptions = {
        hostname: 'localhost',
        port: 5000,
        path: '/api/admin/stats?t=' + Date.now(),
        method: 'GET',
        headers: {
          'Cookie': cookie.join('; ')
        }
      };

      const statsReq = http.request(statsOptions, (statsRes) => {
        let statsData = '';
        statsRes.on('data', (chunk) => { statsData += chunk; });
        statsRes.on('end', () => {
          const parsed = JSON.parse(statsData);
          console.log('Stats object:', parsed.stats);
        });
      });
      statsReq.end();
    }
  });
});

req.on('error', (e) => {
  console.error('Problem with request:', e.message);
});

req.write(loginData);
req.end();
