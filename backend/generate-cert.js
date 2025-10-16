const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Generate self-signed certificate for local HTTPS development
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) {
  fs.mkdirSync(certDir);
}

const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

// Generate private key
exec(`openssl genrsa -out ${keyPath} 2048`, (err) => {
  if (err) {
    console.error('Error generating private key:', err);
    return;
  }

  // Generate certificate
  exec(`openssl req -new -x509 -key ${keyPath} -out ${certPath} -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`, (err) => {
    if (err) {
      console.error('Error generating certificate:', err);
      return;
    }
    console.log('Self-signed certificate generated successfully!');
    console.log('Key:', keyPath);
    console.log('Cert:', certPath);
  });
});
