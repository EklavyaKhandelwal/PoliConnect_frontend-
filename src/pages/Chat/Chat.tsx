import { useEffect, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiMic, FiMoreVertical, FiPlus } from "react-icons/fi";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { clearChat, setConversationId, setFollowUpQuestions, setMessages } from "../../store/slices/chatSlice";
import { setPreference } from "../../store/slices/preferencesSlice";
import { getConversationMessages } from "../../services/chatService";
import ChatInput from "../../components/Chat/ChatInput";
import ChatMessage from "../../components/Chat/ChatMessage";
import { triggerHaptic } from "../../services/haptics";

const Chat = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const dispatch = useAppDispatch();
  const location = useLocation();
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const autoPlayMessageId = (location.state as { autoPlayMessageId?: string } | null)?.autoPlayMessageId;

  const messages = useAppSelector((state) => state.chat.messages);
  const error = useAppSelector((state) => state.chat.error);
  const isLoading = useAppSelector((state) => state.chat.isLoading);
  const conversationId = useAppSelector((state) => state.chat.conversationId);
  const activeConversationId = routeConversationId || conversationId;
  const followUpQuestions = useAppSelector((state) => state.chat.followUpQuestions);
  const preferences = useAppSelector((state) => state.preferences);
  const [optionsOpen, setOptionsOpen] = useState(false);

  const askFollowUp = (question: string) => {
    navigate(location.pathname, {
      replace: true,
      state: { initialMessage: question },
    });
  };

  useEffect(() => {
    if (!activeConversationId) return;
    let cancelled = false;

    (async () => {
      try {
        if (routeConversationId && conversationId !== routeConversationId) {
          dispatch(setConversationId(routeConversationId));
          dispatch(setMessages([]));
        }
        const apiMessages = await getConversationMessages(activeConversationId);
        if (cancelled) return;
        dispatch(
          setMessages(
            apiMessages.map((m) => ({
              id: m._id,
              role: m.role,
              content: m.contentText,
              fileUrl: m.fileUrl ?? null,
              imageUrl: m.inputType === "image" ? m.fileUrl ?? null : null,
              sourceLabel: "MP Public Assistant",
              createdAt: m.createdAt,
              autoPlay: m._id === autoPlayMessageId,
            })),
          ),
        );
        dispatch(setFollowUpQuestions([]));
      } catch (err) {
        console.error("Failed to load conversation history:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, autoPlayMessageId, conversationId, dispatch, routeConversationId]);

  const handleBack = () => navigate(-1);

  return (
    <main className="h-dvh overflow-hidden bg-gradient-to-b from-blue-100 via-blue-50 to-white">
      <div className="mx-auto flex h-full w-full max-w-[900px] flex-col px-3 sm:px-8">
        <header className="relative flex shrink-0 items-center gap-2 py-3 sm:gap-4 sm:py-6">
          <button
            type="button"
            onClick={handleBack}
            aria-label={t("common.back")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm transition hover:shadow-md active:scale-95 sm:h-11 sm:w-11"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-700 text-base font-bold text-white">
              AS
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                  {t("voice.leaderName")}
                </h1>
                <FiCheckCircle className="shrink-0 text-emerald-600" size={17} />
              </div>
              <p className="truncate text-xs font-semibold text-blue-600">{t("voice.assistantName")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              dispatch(clearChat());
              navigate("/chat", { replace: true, state: null });
            }}
            aria-label={t("chat.newConversation")}
            className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:shadow-md active:scale-95 sm:h-11 sm:w-11"
          >
            <FiPlus size={24} />
          </button>
          <button
            type="button"
            onClick={() => navigate(activeConversationId ? `/voice/${activeConversationId}` : "/")}
            aria-label={t("chat.openVoice")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-sm transition hover:shadow-md active:scale-95 sm:h-11 sm:w-11"
          >
            <FiMic size={21} />
          </button>
          <button
            type="button"
            aria-label={t("chat.moreOptions")}
            aria-expanded={optionsOpen}
            onClick={() => setOptionsOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm transition hover:shadow-md active:scale-95 sm:h-11 sm:w-11"
          >
            <FiMoreVertical size={22} />
          </button>
          {optionsOpen && (
            <div className="absolute right-5 top-[4.5rem] z-30 w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:right-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-semibold text-slate-900">{t("settingsPage.speed")}</span>
                <span className="text-sm font-semibold text-blue-600">
                  {preferences.playbackSpeed.toFixed(2).replace(/0$/, "")}x
                </span>
              </div>
              <div className="flex gap-2 py-3">
                {[0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => {
                      dispatch(setPreference({ key: "playbackSpeed", value: speed }));
                      void triggerHaptic(preferences.vibration);
                    }}
                    className={`flex-1 rounded-xl px-2 py-2 text-sm font-semibold ${
                      preferences.playbackSpeed === speed
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.vibration}
                onClick={() => {
                  const nextValue = !preferences.vibration;
                  dispatch(setPreference({ key: "vibration", value: nextValue }));
                  void triggerHaptic(nextValue);
                }}
                className="flex w-full items-center justify-between border-t border-slate-100 pt-3 text-left"
              >
                <span>
                  <span className="block font-semibold text-slate-900">
                    {t("settingsPage.vibration")}
                  </span>
                  <span className="block text-xs text-slate-500">
                    {t("settingsPage.vibrationDescription")}
                  </span>
                </span>
                <span
                  className={`relative h-7 w-12 rounded-full ${
                    preferences.vibration ? "bg-blue-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${
                      preferences.vibration ? "right-1" : "left-1"
                    }`}
                  />
                </span>
              </button>
            </div>
          )}
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto py-2 sm:py-6">
          <div className="flex flex-col gap-4">
            {messages.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <section className="w-full max-w-2xl rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
                  <div className="flex items-center gap-3 text-blue-600">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                      AS
                    </span>
                    <div>
                      <div className="flex items-center gap-2 font-semibold">
                        {t("voice.assistantName")}
                        <FiCheckCircle className="text-emerald-600" />
                      </div>
                      <p className="text-xs text-slate-500">{t("chat.subtitle")}</p>
                    </div>
                  </div>
                  <h2 className="mt-4 text-lg font-bold text-slate-900 sm:mt-6 sm:text-2xl">
                    {t("chat.welcomeTitle")}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 sm:mt-3 sm:text-base sm:leading-7">
                    {t("chat.welcomeMessage")}
                  </p>
                  <p className="mt-5 text-sm font-semibold text-slate-400">
                    {t("chat.emptyState")}
                  </p>
                </section>
              </div>
            ) : (
              messages.map((message) => <ChatMessage key={message.id} message={message} />)
            )}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-1.5" aria-label="Assistant is replying">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" />
                  </div>
                </div>
              </div>
            )}
            {error && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
          </div>
        </div>

        <div className="shrink-0 pb-3 sm:pb-6">
          {messages.length > 0 && !isLoading && followUpQuestions.length > 0 && (
            <div className="mb-2">
              <p className="mb-1 px-1 text-[11px] font-semibold text-slate-500 sm:mb-2 sm:text-xs">
                {t("chat.followUpTitle")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-2">
                {followUpQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => askFollowUp(question)}
                    className="shrink-0 rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-95 sm:px-4 sm:py-2 sm:text-sm"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          <ChatInput key={activeConversationId ?? "new"} />
        </div>
      </div>
    </main>
  );
};

export default Chat;