import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import api from "../services/api";
import { getReferenceCode } from "../utils/reference";

const NotificationContext = createContext({
  notifications: [],
  unreadCount: 0,
  refresh: () => Promise.resolve(),
  markAllAsRead: () => {},
  markAsRead: () => {},
});

const STORAGE_KEY = "notification.read";

const loadReadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
};

const saveReadState = (map) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {}
};

const buildNotificationFromTransaction = (tx) => {
  const verb =
    tx.type === "deposit"
      ? "Nạp"
      : tx.type === "transfer"
      ? "Chuyển"
      : "Giao dịch";
  const actor =
    tx.type === "deposit"
      ? "vào tài khoản"
      : tx.type === "transfer"
      ? `đến ${tx.toUsername}`
      : tx.description || "";
  const title =
    tx.type === "deposit"
      ? "Nạp tiền thành công"
      : tx.type === "transfer"
      ? "Chuyển khoản thành công"
      : "Giao dịch";
  const decoratedTx = { ...tx, reference: getReferenceCode(tx) };
  const direction = tx.type === "deposit" ? 1 : -1;
  return {
    id: String(tx.id),
    title,
    description: decoratedTx.description || `${verb} ${actor}`.trim(),
    amount: direction * Number(decoratedTx.amount || 0),
    status: decoratedTx.status,
    createdAt: decoratedTx.createdAt,
    reference: decoratedTx.reference,
    raw: decoratedTx,
  };
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [readMap, setReadMap] = useState(() => loadReadState());
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/transactions/history");
      const items = (res.data?.transactions || []).map(
        buildNotificationFromTransaction
      );
      setNotifications(
        items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
      return items;
    } catch (e) {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    saveReadState(readMap);
  }, [readMap]);

  const markAllAsRead = useCallback(() => {
    const next = notifications.reduce((acc, item) => {
      acc[item.id] = true;
      return acc;
    }, {});
    setReadMap(next);
  }, [notifications]);

  const markAsRead = useCallback((id) => {
    setReadMap((curr) => ({ ...curr, [id]: true }));
  }, []);

  const refresh = useCallback(async () => {
    const items = await fetchNotifications();
    setNotifications(items);
    return items;
  }, [fetchNotifications]);

  const value = useMemo(() => {
    const unreadCount = notifications.reduce((count, item) => {
      return readMap[item.id] ? count : count + 1;
    }, 0);
    return {
      notifications,
      unreadCount,
      loading,
      refresh,
      markAllAsRead,
      markAsRead,
      readMap,
    };
  }, [notifications, readMap, refresh, markAllAsRead, markAsRead, loading]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
