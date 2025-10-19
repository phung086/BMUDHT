export const AUTH_EVENT = "auth-token-change";

const safeWindow = typeof window !== "undefined" ? window : null;

const TOKEN_KEY = "token";
const META_KEY = "token-meta";

export const IDLE_TIMEOUT_MS = 15 * 60 * 1000;
export const REFRESH_BUFFER_MS = 60 * 1000;

const getStorage = () => {
  if (!safeWindow) return null;
  try {
    if (safeWindow.sessionStorage) {
      return safeWindow.sessionStorage;
    }
  } catch (error) {
    // fall through to localStorage fallback
  }
  try {
    return safeWindow.localStorage;
  } catch (error) {
    return null;
  }
};

const readStorage = (key) => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (error) {
    return null;
  }
};

const writeStorage = (key, value) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (value === null || value === undefined) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
  } catch (error) {
    /* no-op */
  }
};

// Remove legacy localStorage tokens so that sessions reset when the tab closes.
if (safeWindow) {
  try {
    const storage = getStorage();
    if (storage && storage === safeWindow.sessionStorage) {
      safeWindow.localStorage?.removeItem(TOKEN_KEY);
      safeWindow.localStorage?.removeItem(META_KEY);
    }
  } catch (error) {
    /* ignore cleanup failure */
  }
}

const decodeBase64Url = (value) => {
  if (!value) return "";
  let normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (normalized.length % 4)) % 4;
  if (padLength) {
    normalized = normalized.padEnd(normalized.length + padLength, "=");
  }
  if (safeWindow && typeof safeWindow.atob === "function") {
    return safeWindow.atob(normalized);
  }
  if (typeof atob === "function") {
    return atob(normalized);
  }
  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized, "base64").toString("binary");
  }
  throw new Error("Base64 decoding not supported in this environment");
};

const persistMeta = (meta) => {
  writeStorage(META_KEY, JSON.stringify(meta));
};

export const readToken = () => readStorage(TOKEN_KEY);

export const broadcastAuthChange = () => {
  if (!safeWindow) return;
  try {
    safeWindow.dispatchEvent(new Event(AUTH_EVENT));
  } catch (error) {
    /* no-op */
  }
};

export const decodeTokenPayload = (token = readToken()) => {
  if (!token) return null;
  try {
    const [, base64] = token.split(".");
    if (!base64) return null;
    const decoded = decodeBase64Url(base64);
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

export const getTokenMeta = () => {
  const raw = readStorage(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const persistToken = (token) => {
  writeStorage(TOKEN_KEY, token);
  if (!token) {
    writeStorage(META_KEY, null);
    return;
  }
  const payload = decodeTokenPayload(token);
  const meta = {
    exp: payload?.exp ? payload.exp * 1000 : null,
    iat: payload?.iat ? payload.iat * 1000 : null,
    lastActive: Date.now(),
  };
  persistMeta(meta);
};

export const clearToken = () => {
  writeStorage(TOKEN_KEY, null);
  writeStorage(META_KEY, null);
};

export const markSessionActive = () => {
  const token = readToken();
  if (!token) return;
  const meta = getTokenMeta() || {};
  meta.lastActive = Date.now();
  persistMeta(meta);
};

export const getMillisUntilExpiry = () => {
  const meta = getTokenMeta();
  if (!meta?.exp) return Number.POSITIVE_INFINITY;
  return meta.exp - Date.now();
};

export const isTokenExpired = () => {
  const remaining = getMillisUntilExpiry();
  if (!Number.isFinite(remaining)) return false;
  return remaining <= 0;
};

export const shouldProactivelyRefresh = () => {
  const remaining = getMillisUntilExpiry();
  if (!Number.isFinite(remaining)) return false;
  return remaining > 0 && remaining <= REFRESH_BUFFER_MS;
};

export const hasIdleTimedOut = () => {
  const meta = getTokenMeta();
  if (!meta?.lastActive) return false;
  return Date.now() - meta.lastActive >= IDLE_TIMEOUT_MS;
};

export const getLastActive = () => {
  const meta = getTokenMeta();
  return meta?.lastActive ?? null;
};
