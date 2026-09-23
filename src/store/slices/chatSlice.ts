import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  fileUrl?: string | null;
  imageUrl?: string | null;
  sourceLabel?: string;
  createdAt?: string;
  autoPlay?: boolean;
}

interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId?: string;
  followUpQuestions: string[];
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  error: null,
  conversationId: undefined,
  followUpQuestions: [],
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((message) => message.id !== action.payload);
    },
    setMessages: (state, action: PayloadAction<Message[]>) => {
      state.messages = action.payload;
    },
    setConversationId: (state, action: PayloadAction<string | undefined>) => {
      state.conversationId = action.payload;
    },
    setFollowUpQuestions: (state, action: PayloadAction<string[]>) => {
      state.followUpQuestions = action.payload;
    },
    setMessageAudio: (state, action: PayloadAction<{ id: string; fileUrl: string }>) => {
      const target = state.messages.find((m) => m.id === action.payload.id);
      if (target) target.fileUrl = action.payload.fileUrl;
    },
    setMessageContent: (state, action: PayloadAction<{ id: string; content: string }>) => {
      const target = state.messages.find((m) => m.id === action.payload.id);
      if (target) target.content = action.payload.content;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearChat: (state) => {
      state.messages = [];
      state.isLoading = false;
      state.error = null;
      state.conversationId = undefined;
      state.followUpQuestions = [];
    },
  },
});

export const {
  addMessage,
  removeMessage,
  setMessages,
  setConversationId,
  setFollowUpQuestions,
  setMessageAudio,
  setMessageContent,
  setLoading,
  setError,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;