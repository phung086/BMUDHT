import axios from "axios";

// Create axios instance that points to the backend proxy (CRA will proxy /api to backend)
const api = axios.create({
  baseURL: "/",
  withCredentials: true,
});

// Attach Authorization token from localStorage if present
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // For mutating requests, ensure we have X-CSRF-Token set. We store token on first fetch.
  const method = (config.method || "get").toLowerCase();
  if (["post", "put", "patch", "delete"].includes(method)) {
    if (!api.defaults.headers["X-CSRF-Token"]) {
      try {
        // include credentials so cookie-based token is set by server
        const res = await axios.get("/api/csrf-token", {
          withCredentials: true,
        });
        api.defaults.headers["X-CSRF-Token"] = res.data.csrfToken;
      } catch (e) {
        // ignore — server may be configured to not require CSRF in dev
      }
    }
    config.headers = config.headers || {};
    if (
      api.defaults.headers["X-CSRF-Token"] &&
      !config.headers["X-CSRF-Token"]
    ) {
      config.headers["X-CSRF-Token"] = api.defaults.headers["X-CSRF-Token"];
    }
  }

  return config;
});

// Response interceptor: if 401/403 attempt to refresh token once and retry
let isRefreshing = false;
const refreshSubscribers = [];

function onRefreshed(newToken) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers.length = 0;
}

function addRefreshSubscriber(cb) {
  refreshSubscribers.push(cb);
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      originalRequest &&
      !originalRequest._retry &&
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      originalRequest._retry = true;
      try {
        if (!isRefreshing) {
          isRefreshing = true;
          // Attempt refresh using refresh-token cookie
          const res = await axios.post(
            "/api/auth/refresh-token",
            {},
            { withCredentials: true }
          );
          const newToken = res.data.accessToken;
          if (newToken) {
            localStorage.setItem("token", newToken);
            onRefreshed(newToken);
          }
          isRefreshing = false;
        }

        return new Promise((resolve, reject) => {
          addRefreshSubscriber((newToken) => {
            // update the original request Authorization header and retry
            originalRequest.headers = originalRequest.headers || {};
            if (newToken)
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      } catch (e) {
        // refresh failed — clear token and propagate error
        localStorage.removeItem("token");
        return Promise.reject(error);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
