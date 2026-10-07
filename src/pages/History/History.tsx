import { useEffect, useMemo, useState } from "react";
import { FiArrowLeft, FiChevronRight, FiEdit3, FiMessageCircle, FiMic, FiPlus, FiSearch, FiTrash2, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../hooks/useLanguage";
import { useAppSelector } from "../../hooks/redux";
import { deleteConversation, getConversations, updateConversationTitle, type ApiConversation } from "../../services/chatService";
import ConfirmationSheet from "../../components/ConfirmationSheet";

type ChatKind = "voice" | "text";

interface ChatItem {
  id: string;
  title: string;
  preview: string;
  date: string;
  kind: ChatKind;
  group: "today" | "week" | "older";
}

const History = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { language } = useLanguage();
  const user = useAppSelector((state) => state.auth.user);
  const authLoading = useAppSelector((state) => state.auth.isLoading);
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user) return;
    setIsLoading(true);
    getConversations()
      .then(setConversations)
      .catch((error) => {
        console.error("Failed to load conversations:", error);
        const status = typeof error === "object" && error !== null && "response" in error
          ? (error.response as { status?: number } | undefined)?.status
          : undefined;
        setLoadError(
          status === 401
            ? "Your login session expired. Please sign in again."
            : status === 404
              ? "Conversation history is unavailable on this server."
              : "Unable to load your saved conversations. Check the connection and try again.",
        );
      })
      .finally(() => setIsLoading(false));
  }, [authLoading, user]);

  const chats: ChatItem[] = conversations.map((conversation) => ({
    id: conversation._id,
    title: conversation.title || "New conversation",
    preview: conversation.preview || "No messages yet",
    date: new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(conversation.updatedAt)),
    kind: conversation.kind,
    group: (() => {
      const updated = new Date(conversation.updatedAt);
      const now = new Date();
      const days = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(updated.getFullYear(), updated.getMonth(), updated.getDate())) / 86400000);
      return days === 0 ? "today" : days <= 7 ? "week" : "older";
    })(),
  }));

  const visibleChats = useMemo(
    () => chats.filter((chat) => `${chat.title} ${chat.preview}`.toLowerCase().includes(query.toLowerCase())),
    [chats, query],
  );

  const startRename = (chat: ChatItem) => {
    setEditingId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveRename = () => {
    const title = editingTitle.trim();
    if (!editingId || !title) return;
    setActionError("");
    updateConversationTitle(editingId, title)
      .then((updated) => {
        setConversations((items) => items.map((conversation) => conversation._id === updated._id ? updated : conversation));
        setEditingId(null);
      })
      .catch((error) => {
        console.error("Failed to rename conversation:", error);
        setActionError("Unable to rename this conversation.");
      });
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    const conversationId = deletingId;
    setActionError("");
    try {
      await deleteConversation(conversationId);
      setConversations((items) => items.filter((conversation) => conversation._id !== conversationId));
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      setActionError("Unable to delete this conversation.");
    }
  };

  const groupLabel = (group: ChatItem["group"]) => {
    if (language === "en") return group === "today" ? "Today" : group === "week" ? "This week" : "Earlier";
    if (language === "mr") return group === "today" ? "आज" : group === "week" ? "या आठवड्यात" : "पूर्वी";
    return group === "today" ? "आज" : group === "week" ? "इस सप्ताह" : "पहले";
  };

  return (
    <main className="flex h-dvh justify-center bg-slate-300">
      <div className="flex h-full w-full max-w-[700px] flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white">
        <header className="flex items-center gap-3 bg-white px-4 py-3 sm:gap-4 sm:px-6 sm:py-5">
          <button type="button" onClick={() => navigate(-1)} aria-label={t("back")} className="text-slate-700">
            <FiArrowLeft size={25} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t("historyPage.title")}</h1>
            <p className="text-sm text-slate-500">{t("historyPage.subtitle", { count: chats.length })}</p>
          </div>
          <button type="button" onClick={() => navigate("/")} aria-label={t("historyPage.newChat")} className="ml-auto flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm sm:h-14 sm:w-14">
            <FiPlus size={22} className="sm:h-7 sm:w-7" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-3 pb-20 pt-4 sm:px-6 sm:pb-32 sm:pt-7">
          {!authLoading && !user ? (
            <div className="rounded-2xl bg-white p-5 text-center shadow-sm sm:rounded-3xl sm:p-7">
              <h2 className="text-xl font-bold text-slate-900">Sign in to save your conversations</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Guest chats are temporary and do not appear in History.
              </p>
              <button type="button" onClick={() => navigate("/auth")} className="mt-5 rounded-full bg-blue-600 px-6 py-3 font-bold text-white">
                Sign in or create account
              </button>
            </div>
          ) : (
            <>
          <label className="flex items-center gap-2 rounded-full bg-white px-3 py-2.5 text-slate-400 shadow-sm sm:gap-4 sm:px-5 sm:py-4">
            <FiSearch size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("historyPage.search")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 sm:text-base" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label={t("historyPage.clearSearch")}><FiX /></button>}
          </label>

          {isLoading && (
            <div role="status" aria-live="polite" className="flex flex-col items-center gap-3 py-10 text-center text-sm text-slate-500">
              <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden="true" />
              <span>Loading saved conversations...</span>
            </div>
          )}
          {loadError && <p className="py-8 text-center text-sm text-red-600">{loadError}</p>}
          {actionError && <p className="py-3 text-center text-sm text-red-600">{actionError}</p>}
          {!isLoading && !loadError && !chats.length && <p className="py-8 text-center text-sm text-slate-500">No saved conversations yet.</p>}
          {(["today", "week", "older"] as const).map((group) => {
            const items = visibleChats.filter((chat) => chat.group === group);
            if (!items.length) return null;
            return (
              <section key={group} className="mt-5 sm:mt-7">
                <h2 className="mb-2 px-1 text-base font-semibold text-slate-500 sm:mb-4 sm:px-2 sm:text-lg">{groupLabel(group)}</h2>
                <div className="space-y-2 sm:space-y-3">
                  {items.map((chat) => (
                    <article key={chat.id} className="flex items-center gap-2.5 rounded-2xl bg-white p-3 shadow-sm sm:gap-4 sm:rounded-3xl sm:p-5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600 sm:h-14 sm:w-14 sm:rounded-2xl">
                        {chat.kind === "voice" ? <FiMic size={19} className="sm:h-6 sm:w-6" /> : <FiMessageCircle size={19} className="sm:h-6 sm:w-6" />}
                      </span>
                      <button type="button" onClick={() => navigate(`/chat/${chat.id}`)} className="min-w-0 flex-1 text-left">
                        <h3 className="truncate text-sm font-bold text-slate-900 sm:text-lg">{chat.title}</h3>
                        <p className="truncate text-sm text-slate-500">{chat.preview}</p>
                      </button>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="hidden text-xs text-slate-400 sm:block">{chat.date}</span>
                        <button type="button" onClick={() => startRename(chat)} aria-label={t("historyPage.rename")} className="rounded-full p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600"><FiEdit3 /></button>
                        <button type="button" onClick={() => setDeletingId(chat.id)} aria-label={t("historyPage.delete")} className="rounded-full p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><FiTrash2 /></button>
                        <FiChevronRight className="text-slate-400" />
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
            </>
          )}
          <ConfirmationSheet
            open={Boolean(deletingId)}
            title={t("historyPage.deleteTitle")}
            message={t("historyPage.deleteMessage")}
            confirmLabel={t("historyPage.delete")}
            cancelLabel={t("historyPage.cancel")}
            onConfirm={() => void handleDelete()}
            onCancel={() => setDeletingId(null)}
            destructive
          />
        </div>

        <div className="border-t border-slate-200 bg-white p-3 sm:p-6">
          <button type="button" onClick={() => navigate("/")} className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 sm:gap-3 sm:py-5 sm:text-lg">
            <FiPlus size={20} className="sm:h-6 sm:w-6" /> {t("historyPage.newChat")}
          </button>
        </div>

        {editingId && (
          <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/30 p-5 sm:items-center">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{t("historyPage.renameTitle")}</h2>
                <button type="button" onClick={() => setEditingId(null)} aria-label={t("historyPage.cancel")}><FiX size={22} /></button>
              </div>
              <input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") saveRename(); }} className="mt-5 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />
              <div className="mt-5 flex justify-end gap-3">
                <button type="button" onClick={() => setEditingId(null)} className="rounded-full px-5 py-3 text-slate-600">{t("historyPage.cancel")}</button>
                <button type="button" onClick={saveRename} className="rounded-full bg-blue-600 px-5 py-3 font-semibold text-white">{t("historyPage.save")}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default History;
