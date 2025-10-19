const MAX_ENTRIES = 100;

const referenceLedger = new Map();

const registerReference = (reference, payload) => {
  if (!reference) return;
  referenceLedger.set(reference, {
    ...payload,
    reference,
    recordedAt: new Date().toISOString(),
  });

  if (referenceLedger.size > MAX_ENTRIES) {
    const firstKey = referenceLedger.keys().next().value;
    referenceLedger.delete(firstKey);
  }
};

const lookupReference = (reference) => {
  if (!reference) return null;
  return referenceLedger.get(reference) || null;
};

const listRecentReferences = () => {
  return Array.from(referenceLedger.values()).reverse();
};

module.exports = {
  registerReference,
  lookupReference,
  listRecentReferences,
};
