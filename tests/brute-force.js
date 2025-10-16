const axios = require('axios');

// Brute force attack simulation
// This script attempts to login with common passwords
// Run this against the running server to test rate limiting and account locking

const BASE_URL = 'http://localhost:3001/api/auth/login';
const EMAIL = 'user1@fintech.com'; // Use a test user email
const COMMON_PASSWORDS = [
  'password',
  '123456',
  'qwerty',
  'abc123',
  'password123',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  '123456789',
  'iloveyou',
  'princess',
  'rockyou',
  '1234567',
  '12345678',
  'password1',
  '123123',
  'football',
  'baseball',
  'welcome1',
];

async function bruteForceAttack() {
  console.log('Starting brute force attack simulation...');
  console.log(`Target: ${EMAIL}`);
  console.log(`Attempts: ${COMMON_PASSWORDS.length}`);

  for (let i = 0; i < COMMON_PASSWORDS.length; i++) {
    const password = COMMON_PASSWORDS[i];
    try {
      const response = await axios.post(BASE_URL, {
        email: EMAIL,
        password: password,
      });
      console.log(`Attempt ${i + 1}: SUCCESS with password "${password}"`);
      break;
    } catch (error) {
      if (error.response) {
        console.log(`Attempt ${i + 1}: FAILED - ${error.response.data.error}`);
        if (error.response.data.error.includes('locked')) {
          console.log('Account locked! Attack mitigated.');
          break;
        }
      } else {
        console.log(`Attempt ${i + 1}: ERROR - ${error.message}`);
      }
    }

    // Delay between attempts to simulate real attack
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('Brute force simulation completed.');
}

// Run the attack
bruteForceAttack().catch(console.error);
