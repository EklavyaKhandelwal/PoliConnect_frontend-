import { api } from "./api";

export type CitizenNotificationType =
  | "registered"
  | "assigned"
  | "status_changed"
  | "resolved"
  | "rejected"
  | "message";

export interface CitizenNotification {
  id: string;
  complaintNumber: string;
  category: string;
  type: CitizenNotificationType;
  status: string | null;
  message: string | null;
  createdAt: string;
  isRead: boolean;
}

export interface CitizenNotificationPage {
  notifications: CitizenNotification[];
  counts: { total: number; unread: number };
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const getCitizenNotifications = async (
  filter: "all" | "unread" = "all",
  page = 1,
): Promise<CitizenNotificationPage> => {
  const response = await api.get<CitizenNotificationPage>("/api/v1/complaints/notifications", {
    params: { filter, page },
  });
  return response.data;
};

export const markCitizenNotificationsRead = async (ids: string[]): Promise<void> => {
  await api.patch("/api/v1/complaints/notifications/read", { ids });
};

export const markAllCitizenNotificationsRead = async (): Promise<void> => {
  await api.patch("/api/v1/complaints/notifications/read", { markAll: true });
};
