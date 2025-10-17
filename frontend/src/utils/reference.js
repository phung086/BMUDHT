const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const hashSeed = (seed) => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const getReferenceCode = (tx) => {
  if (!tx) return "REF-UNKNOWN";
  if (tx.referenceCode) return tx.referenceCode;
  const baseSeed = `${tx.id || "id"}-${tx.createdAt || "time"}-${
    tx.amount || 0
  }-${tx.type || "tx"}-${tx.status || "st"}`;
  let hash = hashSeed(baseSeed);
  let code = "";
  while (code.length < 8) {
    const index = hash % alphabet.length;
    code += alphabet[index];
    hash = hash / alphabet.length;
    if (hash < 1) {
      hash = hashSeed(`${baseSeed}-${code}-${hash}`);
    }
  }
  const prefix =
    tx.type === "deposit" ? "IN" : tx.type === "transfer" ? "OUT" : "TX";
  return `${prefix}-${code.slice(0, 4)}-${code.slice(4, 8)}`;
};

export default getReferenceCode;
