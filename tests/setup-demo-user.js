const axios = require("axios");

// Simple helper to create a demo user for brute-force tests
// Usage (PowerShell): $env:BACKEND_ORIGIN="http://localhost:3001"; node setup-demo-user.js

const ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:3001";
const CSRF_URL = `${ORIGIN}/api/csrf-token`;
const REGISTER_URL = `${ORIGIN}/api/auth/register`;

const suffix = `${Math.floor(Date.now() / 1000)}-${Math.floor(
  Math.random() * 1000
)}`;
const username = process.env.USERNAME || `bf-demo-${suffix}`;
const email = process.env.EMAIL || `bf-demo-${suffix}@fintech.com`;
const password = process.env.PASSWORD || "demo123!";

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

async function main() {
  console.log(`Creating demo user at ${ORIGIN} ...`);
  const cfg = await getCsrfHeaders();
  const res = await axios.post(
    REGISTER_URL,
    { username, email, password },
    cfg
  );
  if (res.status >= 200 && res.status < 300) {
    console.log(`Created or attempted create user: ${email}`);
  } else {
    console.log(
      `Server responded ${res.status}:`,
      (res.data && res.data.error) || res.data || ""
    );
  }
}

main().catch((e) => {
  if (e.response) {
    console.error(
      `Failed (${e.response.status}):`,
      e.response.data && e.response.data.error
        ? e.response.data.error
        : e.response.data
    );
  } else {
    console.error(e.message);
  }
});
