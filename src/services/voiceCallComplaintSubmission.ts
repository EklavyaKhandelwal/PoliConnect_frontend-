import {
  createComplaint,
  getComplaints,
} from "./complaints";
import type { VoiceCallComplaintDraft } from "./voiceCall";

export const submitVoiceCallComplaint = async (
  draft: VoiceCallComplaintDraft,
  idempotencyKey: string,
) => {
  if (
    !draft.category ||
    !draft.details?.trim() ||
    !draft.area?.trim() ||
    !draft.name?.trim() ||
    !draft.phone ||
    draft.phone.replace(/\D/g, "").length !== 10
  ) {
    throw new Error("Cannot submit a complaint with missing required details.");
  }

  const created = await createComplaint({
    category: draft.category,
    details: draft.details,
    area: draft.area,
    name: draft.name,
    phone: draft.phone,
    privateName: draft.privateName ?? false,
    photos: [],
    coordinates: null,
  }, idempotencyKey);

  let refreshedComplaints;
  try {
    refreshedComplaints = await getComplaints();
  } catch (error) {
    console.error("Complaint was created, but its visibility could not be verified:", error);
    throw error;
  }
  if (!refreshedComplaints.some((complaint) => complaint.complaintNumber === created.complaintNumber)) {
    throw new Error("Created complaint is missing from the caller's complaint list.");
  }
  return { complaintNumber: created.complaintNumber, complaints: refreshedComplaints };
};
