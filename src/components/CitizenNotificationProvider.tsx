import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAppSelector } from "../hooks/redux";
import { getCitizenNotifications } from "../services/citizenNotifications";
import { playNotificationSound } from "../services/notificationSound";
import { CitizenNotificationContext } from "./citizenNotificationContext";

export function CitizenNotificationProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const initialized = useRef(false);
  const soundEnabled = useAppSelector((state) => state.preferences.notificationSound);

  const refreshUnreadCount = useCallback(async () => {
    const page = await getCitizenNotifications("unread", 1);
    setUnreadCount((current) => {
      if (initialized.current && page.counts.unread > current && soundEnabled) {
        playNotificationSound();
      }
      initialized.current = true;
      return page.counts.unread;
    });
  }, [soundEnabled]);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      if (!active || document.visibilityState === "hidden") return;
      void refreshUnreadCount().catch((error: unknown) => {
        console.error("Could not refresh citizen notifications:", error);
      });
    };
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [refreshUnreadCount]);

  const value = useMemo(
    () => ({ unreadCount, refreshUnreadCount }),
    [unreadCount, refreshUnreadCount],
  );
  return (
    <CitizenNotificationContext.Provider value={value}>
      {children}
    </CitizenNotificationContext.Provider>
  );
}
