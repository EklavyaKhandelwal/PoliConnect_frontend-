
import axios from "axios";
import { api } from "./api";

interface ChatRequest {
  message: string;
  language: string;
  conversationId?: string;
}

interface ChatResponse {
  conversationId: string;
  message: {
    _id: string;
    contentText: string;
    fileUrl?: string | null;
    createdAt?: string;
  };
  followUpQuestions: string[];
  sourceLabel?: string;
  sources?: Array<{ title: string; url: string }>;
}

export const sendChatMessage = async (
  payload: ChatRequest
): Promise<ChatResponse> => {
  const response = await api.post<ChatResponse>(
    `/api/v1/message/conversations/${payload.conversationId ?? "new"}/messages`,
    {
      inputType: "text",
      outputType: "voice",
      text: payload.message,
      responseLanguage: payload.language,
      ...(payload.conversationId
        ? { languageOverride: payload.language }
        : {}),
    },
  );

  return response.data;
};

export const sendImageMessage = async (
  image: File,
  language: string,
  conversationId?: string,
): Promise<ChatResponse> => {
  const formData = new FormData();
  formData.append("inputType", "image");
  formData.append("outputType", "voice");
  formData.append("responseLanguage", language);
  if (conversationId) {
    formData.append("languageOverride", language);
  }
  formData.append("file", image);

  const response = await api.post<ChatResponse>(
    `/api/v1/message/conversations/${conversationId ?? "new"}/messages`,
    formData,
  );
  return response.data;
};

export const sendVoiceMessage = async (
  audio: Blob,
  language: string,
): Promise<ChatResponse> => {
  const formData = new FormData();
  formData.append("inputType", "voice");
  formData.append("outputType", "voice");
  formData.append("responseLanguage", language);
  formData.append("file", audio, "voice.webm");

  const response = await api.post<ChatResponse>(
    "/api/v1/message/conversations/new/messages",
    formData,
  );

  return response.data;
};

export const transcribeVoiceMessage = async (
  audio: Blob,
  language: string,
): Promise<string> => {
  const formData = new FormData();
  formData.append("responseLanguage", language);
  formData.append("file", audio, "voice.webm");

  const response = await api.post<{ transcript: string }>(
    "/api/v1/message/transcribe",
    formData,
  );

  return response.data.transcript;
};

export const getVoiceErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    if (error.response?.data?.error) return error.response.data.error;

    if (error.code === "ERR_NETWORK") {
      return "Cannot reach the server. Check that the backend is running and that this device can access it.";
    }
  }

  return error instanceof Error
    ? error.message
    : "Unable to process the recording.";
};

export const getChatErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    const status = error.response?.status;
    if (status === 413 || error.response?.data?.error?.includes("tokens per minute")) {
      return "This answer is too large to prepare right now. Please try a shorter question.";
    }
    if (status === 429) return "The assistant is busy right now. Please try again shortly.";
    if (status && status >= 500) return "The assistant is temporarily unavailable. Please try again.";
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      return "The response is taking longer than expected. Please try again.";
    }
    if (error.code === "ERR_NETWORK") {
      return "Cannot reach the server. Please check your connection and try again.";
    }
  }
  return "Unable to prepare an answer right now. Please try again.";
};

export interface ApiMessage {
  _id: string;
  role: "user" | "assistant";
  inputType?: "text" | "voice" | "image";
  contentText: string;
  fileUrl?: string | null;
  createdAt?: string;
}

export const getConversationMessages = async (
  conversationId: string,
): Promise<ApiMessage[]> => {
  const response = await api.get<{ messages: ApiMessage[] }>(
    `/api/v1/message/conversations/${conversationId}/messages`,
  );

  return response.data.messages;
};

export const speakMessage = async (messageId: string): Promise<string> => {
  const response = await api.post<{ fileUrl: string }>(
    `/api/v1/message/${messageId}/speak`,
  );

  return response.data.fileUrl;
};

export const translateMessage = async (
  messageId: string,
  language: string,
): Promise<string> => {
  const response = await api.post<{ contentText: string }>(
    `/api/v1/message/${messageId}/translate`,
    { language },
  );
  return response.data.contentText;
};

export interface ApiConversation {
  _id: string;
  title: string;
  responseLanguage: string;
  updatedAt: string;
  createdAt: string;
  preview: string;
  kind: "voice" | "text";
}

export const getConversations = async (): Promise<ApiConversation[]> => {
  const response = await api.get<{ conversations: ApiConversation[] }>("/api/v1/conversation");
  return response.data.conversations;
};

export const updateConversationTitle = async (
  conversationId: string,
  title: string,
): Promise<ApiConversation> => {
  const response = await api.patch<{ conversation: ApiConversation }>(
    `/api/v1/conversation/${conversationId}`,
    { title },
  );
  return response.data.conversation;
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  await api.delete(`/api/v1/conversation/${conversationId}`);
};
