import axios from "axios";
import {
  broadcastAuthChange,
  clearToken,
  isTokenExpired,
  persistToken,
  readToken,
  shouldProactivelyRefresh,
} from "./authSignal";

const SESSION_EXPIRED_FLAG = "sessionExpired";

let inFlightRefresh = null;

export const ensureFreshAccessToken = async () => {
  const currentToken = readToken();
  if (!currentToken) return null;

  if (!shouldProactivelyRefresh() && !isTokenExpired()) {
    return currentToken;
  }

  if (!inFlightRefresh) {
    inFlightRefresh = axios
      .post(
        "/api/auth/refresh-token",
        {},
        {
          withCredentials: true,
        }
      )
      .then((response) => {
        const refreshedToken = response.data?.accessToken;
        if (refreshedToken) {
          persistToken(refreshedToken);
          broadcastAuthChange();
          return refreshedToken;
        }
        setSessionExpiredFlag();
        clearToken();
        broadcastAuthChange();
        return null;
      })
      .catch((error) => {
        setSessionExpiredFlag();
        clearToken();
        broadcastAuthChange();
        throw error;
      })
      .finally(() => {
        inFlightRefresh = null;
      });
  }

  return inFlightRefresh;
};

export const serverLogout = async () => {
  try {
    await axios.post(
      "/api/auth/logout",
      {},
      {
        withCredentials: true,
      }
    );
  } catch (error) {
    // ignore network errors during logout
  }
};

export const setSessionExpiredFlag = () => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_EXPIRED_FLAG, "1");
    }
  } catch (error) {
    // ignore quota errors
  }
};

export const consumeSessionExpiredFlag = () => {
  if (typeof window === "undefined") return false;
  try {
    const value = window.localStorage.getItem(SESSION_EXPIRED_FLAG);
    if (!value) return false;
    window.localStorage.removeItem(SESSION_EXPIRED_FLAG);
    return true;
  } catch (error) {
    return false;
  }
};

export const clearSessionExpiredFlag = () => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_EXPIRED_FLAG);
  } catch (error) {
    // ignore failures clearing the flag
  }
};
