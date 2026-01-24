const axios = require('axios');

async function testHospitalLogin() {
  const users = [
    { username: 'admin', role: 'Admin' },
    { username: 'finance', role: 'Finance' },
    { username: 'recep', role: 'Reception' },
    { username: 'umar', role: 'Doctor' },
    { username: 'ibad', role: 'Doctor' }
  ];

  console.log('Testing Hospital Module Login...\n');

  for (const user of users) {
    try {
      const response = await axios.post('http://localhost:4000/api/hospital/users/login', {
        username: user.username,
        password: '123'
      });
      
      console.log(`✅ ${user.username} (${user.role}): Login SUCCESS`);
      console.log(`   Token: ${response.data.token ? 'Received' : 'Not received'}`);
      console.log(`   User data: ${JSON.stringify(response.data.user || response.data)}`);
      
    } catch (error) {
      console.log(`❌ ${user.username} (${user.role}): Login FAILED`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
    }
    console.log('');
  }
}

testHospitalLogin().catch(console.error);
