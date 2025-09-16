#!/usr/bin/env node
(async function(){
  const baseApi = 'http://127.0.0.1:5000';
  const front = 'http://127.0.0.1:5173';
  try {
    console.log('POST /api/login ->', baseApi + '/api/login');
    const loginRes = await fetch(baseApi + '/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@example.com', password: 'admin123' })
    });
    console.log('login status', loginRes.status);
    const loginBody = await loginRes.text();
    console.log('login body:', loginBody.substring(0,1000));

    // prefer using the returned token and send it as Bearer to /api/me
    let token = null;
    try {
      const parsed = JSON.parse(loginBody);
      token = parsed.token || null;
      console.log('token length', token ? token.length : 0);
    } catch (e) {
      console.log('failed to parse login JSON', e && e.message ? e.message : e);
    }

    console.log('\nGET /api/me ->', baseApi + '/api/me');
    const meRes = await fetch(baseApi + '/api/me', {
      method: 'GET',
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    });
    console.log('me status', meRes.status);
    const meBody = await meRes.text();
    console.log('me body:', meBody.substring(0,1000));

    console.log('\nGET admin-dashboard HTML ->', front + '/admin-dashboard');
    const pageRes = await fetch(front + '/admin-dashboard', { headers: { Accept: 'text/html' } });
    console.log('page status', pageRes.status);
    const pageText = await pageRes.text();
    console.log('page body snippet:', pageText ? pageText.substring(0,800) : '<empty>');

    process.exit(0);
  } catch (err) {
    console.error('error', err && err.stack ? err.stack : err);
    process.exit(2);
  }
})();
