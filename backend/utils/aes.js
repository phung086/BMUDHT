const crypto = require("crypto");

// Use AES-256-GCM for authenticated encryption (recommended over CBC)
const ALGO = "aes-256-gcm";
const KEY = Buffer.from(process.env.AES_KEY || "", "hex"); // must be 32 bytes (64 hex chars)

function encrypt(text) {
  if (!KEY || KEY.length !== 32) {
    throw new Error("AES_KEY must be set to 32 bytes (hex)");
  }
  const iv = crypto.randomBytes(12); // 96-bit recommended for GCM
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // return iv:tag:encrypted (hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString(
    "hex"
  )}`;
}

function decrypt(encryptedText) {
  const [ivHex, tagHex, cipherHex] = (encryptedText || "").split(":");
  if (!ivHex || !tagHex || !cipherHex) {
    throw new Error("Encrypted payload is malformed");
  }
  if (!KEY || KEY.length !== 32) {
    throw new Error("AES_KEY must be set to 32 bytes (hex)");
  }
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const encrypted = Buffer.from(cipherHex, "hex");

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

module.exports = { encrypt, decrypt };
