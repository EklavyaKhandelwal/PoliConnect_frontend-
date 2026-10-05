import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft, FiCheck, FiMessageCircle, FiRefreshCw, FiStar } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { getComplaints, type ComplaintRecord } from "../../services/complaints";
import { getMySuggestions, type SuggestionRecord } from "../../services/suggestions";

const MyUpdates = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestionRecord[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUpdates = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const [mySuggestions, myComplaints] = await Promise.all([getMySuggestions(), getComplaints()]);
      setSuggestions(mySuggestions);
      setComplaints(myComplaints);
    } catch (loadError) {
      console.error("Could not load citizen updates:", loadError);
      setError(loadError instanceof Error ? loadError.message : t("citizenUpdates.loadError"));
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadUpdates();
    const timer = window.setInterval(() => void loadUpdates(false), 15000);
    return () => window.clearInterval(timer);
  }, [loadUpdates]);

  const locale = i18n.resolvedLanguage ?? i18n.language;
  const formatDate = (date: string | null | undefined) => date
    ? new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date))
    : "—";
  const complaintFeedback = complaints
    .filter((complaint) => complaint.citizenFeedback)
    .map((complaint) => ({ complaint, feedback: complaint.citizenFeedback! }));
  const hasUpdates = suggestions.length > 0 || complaintFeedback.length > 0;

  return (
    <main className="min-h-dvh bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <header className="border-b border-blue-100 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/complaint-center")}
            aria-label={t("back")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-slate-100"
          >
            <FiArrowLeft size={22} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold sm:text-xl">{t("citizenUpdates.title")}</h1>
            <p className="text-sm text-slate-500">{t("citizenUpdates.subtitle")}</p>
          </div>
          <button
            type="button"
            onClick={() => void loadUpdates()}
            disabled={loading}
            aria-label={t("complaintTracking.refresh")}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} size={18} />
          </button>
        </div>
      </header>
      <section className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5 sm:px-6">
        {error && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            <p>{t("citizenUpdates.loadError")} {error}</p>
            <button type="button" className="mt-2 font-bold underline" onClick={() => void loadUpdates()}>
              {t("complaintTracking.retry")}
            </button>
          </div>
        )}
        {loading && !hasUpdates ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">{t("citizenUpdates.loading")}</p>
        ) : !hasUpdates && !error ? (
          <article className="rounded-3xl bg-white p-6 text-center shadow-[0_5px_16px_rgba(44,79,125,0.10)]">
            <FiMessageCircle className="mx-auto text-blue-600" size={28} />
            <p className="mt-3 text-sm text-slate-600">{t("citizenUpdates.empty")}</p>
          </article>
        ) : (
          <>
            {suggestions.map((suggestion) => {
              const Icon = suggestion.type === "thanks" ? FiStar : FiMessageCircle;
              return (
                <article key={suggestion.referenceNumber} className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
                  <header className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Icon className="shrink-0 text-blue-600" size={17} />
                      <h2 className="truncate font-bold">{t(`suggestionThanks.types.${suggestion.type}`)}</h2>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${suggestion.status === "read" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                      {suggestion.status === "read" ? t("citizenUpdates.read") : t("citizenUpdates.received")}
                    </span>
                  </header>
                  <p className="mt-2 text-xs text-slate-500">{suggestion.referenceNumber} · {formatDate(suggestion.createdAt)}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{suggestion.message}</p>
                  {suggestion.readAt && (
                    <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                      <FiCheck size={14} />{t("citizenUpdates.readAt", { date: formatDate(suggestion.readAt) })}
                    </p>
                  )}
                  {(suggestion.adminReplies ?? []).map((reply, index) => (
                    <div key={`${reply.createdAt}-${index}`} className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                      <p className="text-xs font-bold text-blue-900">{t("citizenUpdates.teamReply")} · {reply.repliedBy}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.message}</p>
                      <time className="mt-2 block text-xs text-slate-500">{formatDate(reply.createdAt)}</time>
                    </div>
                  ))}
                </article>
              );
            })}
            {complaintFeedback.map(({ complaint, feedback }) => (
              <article key={complaint.complaintNumber} className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
                <header className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FiStar className="shrink-0 text-amber-600" size={17} />
                    <button type="button" onClick={() => navigate(`/my-complaints/${encodeURIComponent(complaint.complaintNumber)}`)} className="truncate text-left font-bold text-blue-700 hover:underline">
                      {t("citizenUpdates.complaintFeedback")} · {complaint.complaintNumber}
                    </button>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${feedback.adminReadAt ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                    {feedback.adminReadAt ? t("citizenUpdates.read") : t("citizenUpdates.received")}
                  </span>
                </header>
                <p className="mt-2 text-xs text-slate-500">{formatDate(feedback.submittedAt)}</p>
                {feedback.rating !== undefined && <p className="mt-2 text-sm font-semibold text-amber-800">{t("citizenUpdates.rating", { rating: feedback.rating })}</p>}
                {feedback.comment && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{feedback.comment}</p>}
                {(feedback.adminReplies ?? []).map((reply, index) => (
                  <div key={`${reply.createdAt}-${index}`} className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
                    <p className="text-xs font-bold text-blue-900">{t("citizenUpdates.teamReply")} · {reply.repliedBy}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.message}</p>
                    <time className="mt-2 block text-xs text-slate-500">{formatDate(reply.createdAt)}</time>
                  </div>
                ))}
              </article>
            ))}
          </>
        )}
      </section>
    </main>
  );
};

export default MyUpdates;
