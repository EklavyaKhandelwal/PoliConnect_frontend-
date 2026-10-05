import { useEffect, useState } from "react";
import { FiCheck, FiHeart, FiZap } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getMySuggestions, type SuggestionRecord } from "../../services/suggestions";

interface SuggestionSuccessProps {
  submission: SuggestionRecord;
  onSendAnother: () => void;
}

const SuggestionSuccess = ({ submission, onSendAnother }: SuggestionSuccessProps) => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [currentSubmission, setCurrentSubmission] = useState(submission);
  const [refreshError, setRefreshError] = useState(false);
  const submittedAt = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(currentSubmission.createdAt));
  const formatTime = (value: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
  const read = currentSubmission.status === "read";
  const replies = currentSubmission.adminReplies ?? [];
  const hasReply = replies.length > 0;
  const latestReply = replies.at(-1);
  const Icon = currentSubmission.type === "thanks" ? FiHeart : FiZap;

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const records = await getMySuggestions();
        const latest = records.find((record) => record.referenceNumber === submission.referenceNumber);
        if (active && latest) setCurrentSubmission(latest);
        if (active) setRefreshError(false);
      } catch (error) {
        console.error("Could not refresh suggestion status:", error);
        if (active) setRefreshError(true);
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [submission.referenceNumber]);

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <header className="border-b border-blue-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={onSendAnother}
            aria-label={t("back")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <span className="text-2xl leading-none">‹</span>
          </button>
          <div>
            <h1 className="text-lg font-bold sm:text-xl">{t("suggestionThanks.title")}</h1>
            <p className="text-xs text-slate-500 sm:text-sm">{t("suggestionThanks.subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <Icon size={34} />
          </span>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-extrabold sm:text-2xl">
            {t(`suggestionThanks.success.${currentSubmission.type}.title`)}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
            {t(`suggestionThanks.success.${currentSubmission.type}.description`)}
          </p>
        </div>

        <section className="rounded-3xl bg-white p-4 shadow-[0_4px_12px_rgba(44,79,125,0.08)] sm:p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-500">{t("suggestionThanks.status")}</h3>
          <div className="relative grid grid-cols-3 gap-2">
            <span className="absolute left-[16%] right-[16%] top-3 h-0.5 bg-slate-200" />
            {(["received", "read", "reply"] as const).map((item, index) => {
              const complete = index === 0 || (index === 1 && read) || (index === 2 && hasReply);
              const current = !complete && (index === (read ? 2 : 1));
              const time = index === 0
                ? t("suggestionThanks.statusSteps.received.time", { time: submittedAt })
                : index === 1
                  ? read && currentSubmission.readAt
                    ? formatTime(currentSubmission.readAt)
                    : t("suggestionThanks.statusSteps.read.time")
                  : latestReply
                    ? formatTime(latestReply.createdAt)
                    : t("suggestionThanks.statusSteps.reply.time");
              return (
              <div key={item} className="relative">
                <span
                  className={`mb-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                    complete
                      ? "border-emerald-100 bg-emerald-100 text-emerald-800"
                      : current
                        ? "border-blue-200 bg-blue-100 text-blue-700"
                        : "border-slate-300 bg-white text-slate-400"
                  }`}
                >
                  {complete ? <FiCheck size={15} /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </span>
                <p className={`text-xs font-bold sm:text-sm ${complete || current ? "text-slate-900" : "text-slate-400"}`}>
                  {t(`suggestionThanks.statusSteps.${item}.title`)}
                </p>
                <p className="mt-1 text-[10px] text-slate-500 sm:text-xs">{time}</p>
              </div>
            );})}
          </div>
          {refreshError && <p role="status" className="mt-3 text-xs text-amber-700">{t("citizenUpdates.refreshError")}</p>}
        </section>

        <section>
          <h3 className="mb-2 text-sm font-bold text-slate-500">{t("suggestionThanks.yourMessage")}</h3>
          <div className="rounded-3xl bg-white p-4 shadow-[0_4px_12px_rgba(44,79,125,0.08)] sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                <Icon className="mr-1 inline" size={13} />
                {t(`suggestionThanks.types.${currentSubmission.type}`)}
              </span>
              <span className="text-xs font-semibold text-slate-500">{currentSubmission.referenceNumber}</span>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              “{currentSubmission.message}”
            </p>
            {replies.map((reply, index) => (
              <article key={`${reply.createdAt}-${index}`} className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                <h4 className="text-xs font-bold text-blue-900">{t("citizenUpdates.teamReply")} · {reply.repliedBy}</h4>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.message}</p>
                <time className="mt-2 block text-xs text-slate-500">{formatTime(reply.createdAt)}</time>
              </article>
            ))}
          </div>
        </section>
      </section>

      <footer className="border-t border-blue-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto grid max-w-2xl gap-2.5">
          <button
            type="button"
            onClick={() => navigate("/complaint-center")}
            className="w-full rounded-full bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-200 sm:text-base"
          >
            {t("suggestionThanks.goToComplaintCenter")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/my-updates")}
            className="w-full rounded-full border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-800"
          >
            {t("citizenUpdates.title")}
          </button>
          <button
            type="button"
            onClick={onSendAnother}
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-900 shadow-sm sm:text-base"
          >
            {t("suggestionThanks.sendAnother")}
          </button>
        </div>
      </footer>
    </main>
  );
};

export default SuggestionSuccess;
