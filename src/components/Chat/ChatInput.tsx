import { useEffect, useRef, useState, type FormEvent } from "react";
import { FiCamera, FiMic, FiSend, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { addMessage, removeMessage, setConversationId, setError, setFollowUpQuestions, setLoading } from "../../store/slices/chatSlice";
import { getChatErrorMessage, sendChatMessage, sendImageMessage } from "../../services/chatService";
import ConfirmationSheet from "../ConfirmationSheet";

const ChatInput = () => {
  const [message, setMessage] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [showPhotoComingSoon, setShowPhotoComingSoon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const { t } = useTranslation("common");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const initialMessage = (location.state as { initialMessage?: string } | null)?.initialMessage;
  const initialMessageHandled = useRef<string | null>(null);

  const isLoading = useAppSelector((state) => state.chat.isLoading);
  const language = useAppSelector((state) => state.language.currentLanguage);
  const conversationId = useAppSelector((state) => state.chat.conversationId);
  const autoPlay = useAppSelector((state) => state.preferences.autoPlay);

  const stopDictation = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
  };

  const toggleDictation = () => {
    if (isListening) {
      stopDictation();
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      dispatch(setError(t("chat.voiceUnavailable")));
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let index = 0; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setMessage(transcript.trim());
    };
    recognition.onerror = (event: any) => {
      console.error("Inline speech recognition failed:", event?.error);
      setIsListening(false);
      recognitionRef.current = null;
      dispatch(setError(t("chat.voiceError")));
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setError(null);
    setIsListening(true);
    recognition.start();
  };

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  const submitImage = async () => {
    if (!image || isLoading) return;
    const selectedImage = image;
    const imageUrl = URL.createObjectURL(selectedImage);
    const optimisticMessageId = crypto.randomUUID();
    dispatch(addMessage({
      id: optimisticMessageId,
      role: "user",
      content: `📷 ${selectedImage.name}`,
      imageUrl,
      createdAt: new Date().toISOString(),
    }));
    setImage(null);
    dispatch(setLoading(true));
    dispatch(setError(null));
    try {
      const response = await sendImageMessage(selectedImage, language, conversationId);
      dispatch(setConversationId(response.conversationId));
      dispatch(setFollowUpQuestions(response.followUpQuestions ?? []));
      if (!conversationId) navigate(`/chat/${response.conversationId}`, { replace: true });
      dispatch(addMessage({
        id: response.message._id,
        role: "assistant",
        content: response.message.contentText,
        fileUrl: response.message.fileUrl ?? null,
        sourceLabel: response.sourceLabel ?? "MP Public Assistant",
        createdAt: response.message.createdAt ?? new Date().toISOString(),
        autoPlay,
      }));
    } catch (error) {
      console.error("Failed to send image:", error);
      dispatch(removeMessage(optimisticMessageId));
      dispatch(setError(getChatErrorMessage(error)));
    } finally {
      URL.revokeObjectURL(imageUrl);
      dispatch(setLoading(false));
    }
  };

  const submitMessage = async (rawMessage: string) => {
    const trimmedMessage = rawMessage.trim();
    if (!trimmedMessage || isLoading) return;

    const optimisticMessageId = crypto.randomUUID();
    dispatch(addMessage({
      id: optimisticMessageId,
      role: "user",
      content: trimmedMessage,
      createdAt: new Date().toISOString(),
    }));
    setMessage("");
    dispatch(setLoading(true));
    dispatch(setError(null));

    try {
      const response = await sendChatMessage({ message: trimmedMessage, language, conversationId });
      dispatch(setConversationId(response.conversationId));
      dispatch(setFollowUpQuestions(response.followUpQuestions ?? []));
      if (!conversationId) navigate(`/chat/${response.conversationId}`, { replace: true });
      dispatch(
        addMessage({
          id: response.message._id,
          role: "assistant",
          content: response.message.contentText,
          fileUrl: response.message.fileUrl ?? null,
          sourceLabel: response.sourceLabel ?? "MP Public Assistant",
          createdAt: response.message.createdAt ?? new Date().toISOString(),
          autoPlay,
        }),
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      dispatch(removeMessage(optimisticMessageId));
      dispatch(setError(getChatErrorMessage(error)));
    } finally {
      dispatch(setLoading(false));
    }
  };

  useEffect(() => {
    if (!initialMessage || initialMessageHandled.current === initialMessage) return;
    initialMessageHandled.current = initialMessage;
    navigate(location.pathname, { replace: true, state: null });
    void submitMessage(initialMessage);
  }, [initialMessage]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (image) {
      await submitImage();
      return;
    }
    await submitMessage(message);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-1.5 rounded-full border border-blue-100 bg-white p-1.5 shadow-sm sm:gap-2 sm:p-2"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => setImage(event.target.files?.[0] ?? null)}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => setShowPhotoComingSoon(true)}
        disabled={isLoading}
        aria-label={t("chat.attachPhoto")}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-700 transition hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40 sm:h-12 sm:w-12"
      >
        <FiCamera size={23} />
      </button>
      <input
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={image ? image.name : t("chat.placeholder")}
        disabled={isLoading}
        className="min-w-0 flex-1 bg-transparent px-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-60 sm:px-2 sm:text-base"
      />
      <button
        type="button"
        onClick={toggleDictation}
        disabled={isLoading}
        aria-label={t("chat.useMicrophone")}
        aria-pressed={isListening}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:opacity-40 sm:h-11 sm:w-11 ${
          isListening
            ? "animate-pulse bg-red-100 text-red-600"
            : "bg-blue-100 text-blue-600 hover:bg-blue-200"
        }`}
      >
        <FiMic size={21} />
      </button>
      {image && (
        <button type="button" onClick={() => setImage(null)} aria-label={t("chat.removePhoto")} className="text-slate-400 hover:text-red-500">
          <FiX size={17} />
        </button>
      )}
      <button
        type="submit"
        disabled={(!message.trim() && !image) || isLoading}
        aria-label={t("common.send")}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 sm:h-11 sm:w-11"
      >
        {isLoading ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <FiSend size={19} />
        )}
      </button>
      <ConfirmationSheet
        open={showPhotoComingSoon}
        title={t("home.photoComingSoonTitle")}
        message={t("home.photoComingSoonMessage")}
        confirmLabel={t("ok")}
        cancelLabel={t("close")}
        onConfirm={() => setShowPhotoComingSoon(false)}
        onCancel={() => setShowPhotoComingSoon(false)}
      />
    </form>
  );
};

export default ChatInput;