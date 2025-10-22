const axios = require("axios");

// Brute force attack simulation
// This script attempts to login with common passwords
// Run this against the running server to test rate limiting and account locking

// Configure backend origin: respect BACKEND_ORIGIN env or default to local dev
const ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:3001";
const LOGIN_URL = `${ORIGIN}/api/auth/login`;
const CSRF_URL = `${ORIGIN}/api/csrf-token`;

// Use a test user email; override with EMAIL env if provided
const EMAIL = process.env.EMAIL || "user1@fintech.com";
const COMMON_PASSWORDS = [
  "password",
  "wrongpass1",
  "wrongpass2",
  "wrongpass3",
  "wrongpass4",
  "wrongpass5",
  "password123",
  "123456",
  "qwerty",
  "abc123",
  "admin",
  "letmein",
  "welcome",
  "monkey",
  "123456789",
  "iloveyou",
  "princess",
  "rockyou",
  "1234567",
  "12345678",
  "password1",
  "123123",
  "football",
  "baseball",
  "welcome1",
];

async function getCsrfHeaders() {
  // Double-submit cookie pattern: fetch token then submit it in both header and cookie
  const { data } = await axios.get(CSRF_URL);
  const token = data.csrfToken;
  return {
    headers: {
      "x-csrf-token": token,
      // Manually set cookie header for Node axios
      Cookie: `XSRF-TOKEN=${token}`,
      "Content-Type": "application/json",
    },
    // Timeout to avoid hanging
    timeout: 10000,
    // Avoid throwing for non-2xx so we can inspect error.response
    validateStatus: () => true,
  };
}

async function bruteForceAttack() {
  console.log("Starting brute force attack simulation...");
  console.log(`Backend: ${ORIGIN}`);
  console.log(`Target email: ${EMAIL}`);
  console.log(`Attempts: ${COMMON_PASSWORDS.length}`);

  // Prepare CSRF headers once per run
  const baseConfig = await getCsrfHeaders();

  for (let i = 0; i < COMMON_PASSWORDS.length; i++) {
    const password = COMMON_PASSWORDS[i];
    const response = await axios.post(
      LOGIN_URL,
      {
        email: EMAIL,
        password: password,
      },
      baseConfig
    );

    if (response.status >= 200 && response.status < 300) {
      console.log(`Attempt ${i + 1}: SUCCESS with password "${password}"`);
      break;
    } else {
      const msg =
        response.data && response.data.error
          ? response.data.error
          : `HTTP ${response.status}`;
      console.log(`Attempt ${i + 1}: FAILED - ${msg}`);
      if (typeof msg === "string" && msg.toLowerCase().includes("locked")) {
        console.log("Account locked! Attack mitigated.");
        break;
      }
    }

    // Delay between attempts to simulate real attack
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  console.log("Brute force simulation completed.");
}

// Run the attack
bruteForceAttack().catch(console.error);
