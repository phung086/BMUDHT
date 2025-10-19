const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const hashSeed = (seed) => {
  let hash = 0;
  for (let idx = 0; idx < seed.length; idx += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(idx);
  }
  return hash >>> 0;
};

const mixHash = (current, salt) => {
  return hashSeed(`${current}-${salt}-${current.length}`);
};

const buildEntropySeed = (tx) => {
  const created = tx.createdAt ? new Date(tx.createdAt).getTime() : 0;
  return [
    tx.id || "id",
    created || Date.now(),
    tx.amount || 0,
    tx.type || "tx",
    tx.status || "st",
    tx.description || "",
  ].join("|");
};

const generateReferenceCode = (tx) => {
  if (!tx) return "REF-UNKNOWN";
  if (tx.referenceCode) return tx.referenceCode;

  let seed = buildEntropySeed(tx);
  let hash = hashSeed(seed);
  let code = "";

  while (code.length < 12) {
    hash = mixHash(seed, `${hash}-${code.length}`);
    const index = hash % alphabet.length;
    code += alphabet[index];
    seed = `${seed}-${index}-${code.length}`;
  }

  const segments = [code.slice(0, 4), code.slice(4, 8), code.slice(8, 12)];
  const prefix =
    tx.type === "deposit" ? "IN" : tx.type === "transfer" ? "OUT" : "TX";
  return `${prefix}-${segments.join("-")}`;
};

module.exports = { generateReferenceCode };
