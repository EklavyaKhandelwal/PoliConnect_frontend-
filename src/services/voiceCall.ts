import axios from "axios";
import { api } from "./api";
import type { ComplaintCategory } from "./complaints";

export interface VoiceCallTurn {
  role: "user" | "assistant";
  content: string;
}

export interface VoiceCallReplyRequest {
  message: string;
  language: string;
  context: VoiceCallTurn[];
  complaintDraft?: VoiceCallComplaintDraft;
  confirmationPending?: boolean;
}

export interface VoiceCallComplaintDraft {
  category?: ComplaintCategory;
  details?: string;
  area?: string;
  name?: string;
  phone?: string;
  privateName?: boolean;
}

export interface VoiceCallReply {
  reply: string;
  action: "continue" | "confirm" | "submit";
  complaintDraft?: VoiceCallComplaintDraft;
}

export type VoiceCallErrorKey =
  | "inAppCall.networkError"
  | "inAppCall.backendUnavailable"
  | "inAppCall.sessionError"
  | "inAppCall.aiUnavailable"
  | "inAppCall.replyError";

export const getVoiceCallErrorKey = (error: unknown): VoiceCallErrorKey => {
  if (!axios.isAxiosError<{ code?: string }>(error)) return "inAppCall.replyError";
  if (!error.response) return "inAppCall.networkError";
  if (error.response.status === 404) return "inAppCall.backendUnavailable";
  if (error.response.status === 401) return "inAppCall.sessionError";
  if (
    error.response.data?.code === "VOICE_CALL_AI_FAILED" ||
    error.response.data?.code === "VOICE_CALL_RATE_LIMITED" ||
    error.response.status === 429 ||
    error.response.status === 502 ||
    error.response.status === 503
  ) {
    return "inAppCall.aiUnavailable";
  }
  return "inAppCall.replyError";
};

export const getVoiceCallReply = async (
  payload: VoiceCallReplyRequest,
): Promise<VoiceCallReply> => {
  try {
    const response = await api.post<{
      success: true;
      reply: string;
      action: "continue" | "confirm" | "submit";
      complaintDraft?: VoiceCallComplaintDraft;
    }>(
      "/api/v1/voice-call/respond",
      payload,
      { timeout: 30000 },
    );
    return {
      reply: response.data.reply,
      action: response.data.action,
      complaintDraft: response.data.complaintDraft,
    };
  } catch (error) {
    console.error("Voice-call response request failed:", {
      status: axios.isAxiosError(error) ? error.response?.status : undefined,
      code: axios.isAxiosError(error) ? error.response?.data?.code ?? error.code : undefined,
    });
    throw error;
  }
};
