import { createContext, useContext } from "react";

export interface CitizenNotificationContextValue {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

export const CitizenNotificationContext =
  createContext<CitizenNotificationContextValue | null>(null);

export function useCitizenNotifications(): CitizenNotificationContextValue {
  const context = useContext(CitizenNotificationContext);
  if (!context) {
    throw new Error("useCitizenNotifications must be used inside CitizenNotificationProvider.");
  }
  return context;
}
