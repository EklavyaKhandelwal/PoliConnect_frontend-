import { FiCheck } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import type { CitizenFeedback } from "../../services/complaints";

const CitizenFeedbackReplies = ({ feedback }: { feedback: CitizenFeedback }) => {
  const { t, i18n } = useTranslation("common");
  const replies = feedback.adminReplies ?? [];
  const formatDate = (value: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

  return (
    <section className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-slate-800">{t("citizenUpdates.complaintFeedback")}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${feedback.adminReadAt ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
          {feedback.adminReadAt ? t("citizenUpdates.read") : t("citizenUpdates.received")}
        </span>
      </div>
      {feedback.adminReadAt && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <FiCheck size={14} />{t("citizenUpdates.readAt", { date: formatDate(feedback.adminReadAt) })}
        </p>
      )}
      {replies.map((reply, index) => (
        <article key={`${reply.createdAt}-${index}`} className="mt-3 rounded-2xl border border-blue-100 bg-blue-50 p-3">
          <h3 className="text-xs font-bold text-blue-900">{t("citizenUpdates.teamReply")} · {reply.repliedBy}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{reply.message}</p>
          <time className="mt-2 block text-xs text-slate-500">{formatDate(reply.createdAt)}</time>
        </article>
      ))}
    </section>
  );
};

export default CitizenFeedbackReplies;
