export const complaintCategoryKeys = [
  "road",
  "water",
  "electricity",
  "cleanliness",
  "health",
  "ration",
  "education",
  "other",
] as const;

export type ComplaintCategoryKey = (typeof complaintCategoryKeys)[number];

export const notificationEventKeys = [
  "registered",
  "assigned",
  "status_changed",
  "resolved",
  "rejected",
  "citizen_reply",
  "citizen_reopened",
] as const;

export type ComplaintActivityType = (typeof notificationEventKeys)[number];

export interface AdminConfiguration {
  profile: {
    organizationName: string;
    officeName: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
  };
  slaWorkingDays: Record<ComplaintCategoryKey, number>;
  notifications: Record<ComplaintActivityType, boolean>;
}

export const defaultAdminConfiguration: AdminConfiguration = {
  profile: {
    organizationName: "",
    officeName: "",
    address: "",
    contactEmail: "",
    contactPhone: "",
  },
  slaWorkingDays: {
    road: 5,
    water: 5,
    electricity: 5,
    cleanliness: 5,
    health: 5,
    ration: 5,
    education: 5,
    other: 5,
  },
  notifications: {
    registered: true,
    assigned: true,
    status_changed: true,
    resolved: true,
    rejected: true,
    citizen_reply: true,
    citizen_reopened: true,
  },
};

export const cloneAdminConfiguration = (settings: AdminConfiguration): AdminConfiguration => ({
  profile: { ...settings.profile },
  slaWorkingDays: { ...settings.slaWorkingDays },
  notifications: { ...settings.notifications },
});
