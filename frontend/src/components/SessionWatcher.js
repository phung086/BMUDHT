import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  broadcastAuthChange,
  clearToken,
  hasIdleTimedOut,
  isTokenExpired,
  markSessionActive,
  readToken,
  shouldProactivelyRefresh,
} from "../utils/authSignal";
import {
  ensureFreshAccessToken,
  serverLogout,
  setSessionExpiredFlag,
} from "../utils/sessionManager";

const CHECK_INTERVAL_MS = 30 * 1000;
const ACTIVITY_EVENTS = [
  "mousemove",
  "keydown",
  "click",
  "touchstart",
  "scroll",
];

const SessionWatcher = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let destroyed = false;

    const handleActivity = () => {
      markSessionActive();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    const runChecks = async () => {
      const token = readToken();
      if (!token) {
        return;
      }

      if (hasIdleTimedOut() || isTokenExpired()) {
        try {
          await serverLogout();
        } catch (error) {
          // ignore logout errors
        } finally {
          setSessionExpiredFlag();
          clearToken();
          broadcastAuthChange();
          if (!destroyed && location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
        }
        return;
      }

      if (shouldProactivelyRefresh()) {
        try {
          await ensureFreshAccessToken();
        } catch (error) {
          setSessionExpiredFlag();
          clearToken();
          broadcastAuthChange();
          if (!destroyed && location.pathname !== "/login") {
            navigate("/login", { replace: true });
          }
        }
      }
    };

    const intervalId = window.setInterval(() => {
      runChecks().catch(() => {
        /* swallow errors */
      });
    }, CHECK_INTERVAL_MS);

    // run an immediate check after mount
    runChecks().catch(() => {
      /* swallow errors */
    });

    return () => {
      destroyed = true;
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      window.clearInterval(intervalId);
    };
  }, [location.pathname, navigate]);

  return null;
};

export default SessionWatcher;
