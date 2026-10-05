import { api } from "./api";
import type { ComplaintCategory } from "../pages/ProblemPhoto/problemPhotoTypes";
export type { ComplaintCategory } from "../pages/ProblemPhoto/problemPhotoTypes";

export type ComplaintStatus =
  | "received"
  | "under_review"
  | "in_progress"
  | "waiting_for_citizen"
  | "resolved"
  | "rejected";
export type CitizenConfirmation = "resolved" | "not_resolved";

export interface ComplaintStatusUpdate {
  status: ComplaintStatus;
  message?: string;
  updatedBy?: string;
  photos?: string[];
  createdAt: string;
}

export interface ComplaintActivity {
  type: "registered" | "assigned" | "status_changed" | "resolved" | "rejected" | "citizen_reply" | "citizen_reopened";
  status?: ComplaintStatus;
  message?: string;
  updatedBy?: string;
  createdAt: string;
}

export interface ComplaintPublicMessage {
  sender: "admin" | "citizen";
  senderName?: string;
  message: string;
  photos: string[];
  requiresResponse: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface CitizenFeedback {
  confirmation: CitizenConfirmation;
  rating?: number;
  tags: string[];
  comment: string;
  submittedAt: string;
  adminReadAt?: string | null;
  isHighlighted?: boolean;
  adminReplies?: Array<{ message: string; repliedBy: string; createdAt: string }>;
}

export interface ComplaintRecord {
  complaintNumber: string;
  category: ComplaintCategory;
  details: string;
  photos: string[];
  location: {
    latitude?: number;
    longitude?: number;
    area?: string;
  };
  status: ComplaintStatus;
  statusHistory: ComplaintStatusUpdate[];
  activityHistory: ComplaintActivity[];
  publicMessages: ComplaintPublicMessage[];
  assignedDepartment: { id: string; name: string; code: string } | null;
  assignedOfficer: { id: string; name: string; title: string } | null;
  slaDeadline: string | null;
  slaPausedAt: string | null;
  citizenFeedback: CitizenFeedback | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintProgressUpdate {
  type: "registered" | "assigned" | "status_changed";
  status?: ComplaintStatus;
  message?: string;
  updatedBy?: string;
  createdAt: string;
}

export const getComplaintProgress = (complaint: ComplaintRecord): ComplaintProgressUpdate[] => {
  const statusUpdates = [...complaint.statusHistory]
    .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  const milestones: ComplaintProgressUpdate[] = [];
  let previousStatus: ComplaintStatus | undefined;

  for (const update of statusUpdates) {
    if (update.status === previousStatus) continue;
    milestones.push({
      type: update.status === "received" ? "registered" : "status_changed",
      status: update.status,
      message: update.message,
      updatedBy: update.updatedBy,
      createdAt: update.createdAt,
    });
    previousStatus = update.status;
  }

  for (const update of complaint.activityHistory) {
    if (update.type === "assigned") {
      milestones.push({
        type: "assigned",
        message: update.message,
        updatedBy: update.updatedBy,
        createdAt: update.createdAt,
      });
    }
  }

  const priority = (type: ComplaintProgressUpdate["type"]) =>
    type === "registered" ? 0 : type === "assigned" ? 1 : 2;
  milestones.sort((left, right) =>
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime() ||
    priority(left.type) - priority(right.type),
  );

  if (milestones.length === 0) {
    milestones.push({
      type: "registered",
      status: "received",
      createdAt: complaint.createdAt,
    });
  }
  return milestones;
};

export const isComplaintActive = (complaint: ComplaintRecord) =>
  complaint.status !== "rejected" &&
  !(complaint.status === "resolved" && complaint.citizenFeedback?.confirmation === "resolved");

export interface ComplaintSubmission {
  category: ComplaintCategory;
  details: string;
  photos: File[];
  coordinates: { latitude: number; longitude: number } | null;
  area: string;
  name: string;
  phone: string;
  privateName: boolean;
}

interface ComplaintResponse {
  success: true;
  complaint: {
    complaintNumber: string;
    status: ComplaintStatus;
    createdAt: string;
  };
}

export const createComplaint = async (
  complaint: ComplaintSubmission,
  idempotencyKey?: string,
) => {
  const formData = new FormData();
  formData.append("category", complaint.category);
  formData.append("details", complaint.details);
  formData.append("area", complaint.area);
  formData.append("name", complaint.name);
  formData.append("phone", complaint.phone);
  formData.append("privateName", String(complaint.privateName));
  if (idempotencyKey) formData.append("idempotencyKey", idempotencyKey);

  if (complaint.coordinates) {
    formData.append("latitude", String(complaint.coordinates.latitude));
    formData.append("longitude", String(complaint.coordinates.longitude));
  }
  complaint.photos.forEach((photo) => formData.append("photos", photo, photo.name));

  const response = await api.post<ComplaintResponse>("/api/v1/complaints", formData);
  return response.data.complaint;
};

export const getComplaints = async (): Promise<ComplaintRecord[]> => {
  const response = await api.get<{ success: true; complaints: ComplaintRecord[] }>("/api/v1/complaints");
  return response.data.complaints;
};

export const getComplaint = async (complaintNumber: string): Promise<ComplaintRecord> => {
  const response = await api.get<{ success: true; complaint: ComplaintRecord }>(
    `/api/v1/complaints/${encodeURIComponent(complaintNumber)}`,
  );
  return response.data.complaint;
};

export const sendComplaintMessage = async (
  complaintNumber: string,
  message: string,
  photos: File[],
): Promise<ComplaintRecord> => {
  const formData = new FormData();
  formData.append("message", message);
  photos.forEach((photo) => formData.append("photos", photo, photo.name));
  const response = await api.post<{ success: true; complaint: ComplaintRecord }>(
    `/api/v1/complaints/${encodeURIComponent(complaintNumber)}/messages`,
    formData,
  );
  return response.data.complaint;
};

export interface ComplaintFeedbackSubmission {
  confirmation: CitizenConfirmation;
  rating?: number;
  tags?: string[];
  comment?: string;
}

export const submitComplaintFeedback = async (
  complaintNumber: string,
  feedback: ComplaintFeedbackSubmission,
): Promise<ComplaintRecord> => {
  const response = await api.patch<{ success: true; complaint: ComplaintRecord }>(
    `/api/v1/complaints/${encodeURIComponent(complaintNumber)}/feedback`,
    feedback,
  );
  return response.data.complaint;
};
