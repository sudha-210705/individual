const run = async () => {
  try {
    // 1. Login as rider1
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'rider1@gmail.com', password: 'password' })
    });
    
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);

    if (loginData.success) {
      const token = loginData.token;
      
      // 2. Toggle status to online
      const statusRes = await fetch('http://localhost:5000/api/riders/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'online' })
      });
      const statusData = await statusRes.json();
      console.log('Online Toggle Response:', statusData);

      // 3. Toggle status to offline
      const statusRes2 = await fetch('http://localhost:5000/api/riders/status', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ status: 'offline' })
      });
      const statusData2 = await statusRes2.json();
      console.log('Offline Toggle Response:', statusData2);
    }
  } catch (err) {
    console.error(err);
  }
};

run();
