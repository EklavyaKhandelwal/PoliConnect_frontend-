import { api } from "./api";
import type { SuggestionType } from "../pages/SuggestionThanks/SuggestionTypeSelector";

export interface SuggestionSubmission {
  type: SuggestionType;
  message: string;
  keepNamePrivate: boolean;
}

export interface SuggestionRecord extends SuggestionSubmission {
  referenceNumber: string;
  status: "received" | "read";
  readAt?: string | null;
  isHighlighted?: boolean;
  adminReplies?: SuggestionAdminReply[];
  createdAt: string;
}

export interface SuggestionAdminReply {
  message: string;
  repliedBy: string;
  createdAt: string;
}

export const getMySuggestions = async (): Promise<SuggestionRecord[]> => {
  const response = await api.get<{ success: true; suggestions: SuggestionRecord[] }>("/api/v1/suggestions");
  return response.data.suggestions;
};

export const createSuggestion = async (
  suggestion: SuggestionSubmission,
): Promise<SuggestionRecord> => {
  const response = await api.post<{ success: true; suggestion: SuggestionRecord }>(
    "/api/v1/suggestions",
    suggestion,
  );
  return response.data.suggestion;
};
