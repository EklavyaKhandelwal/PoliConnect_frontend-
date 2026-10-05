import {
  FiArrowLeft,
  FiCheck,
  FiCheckCircle,
  FiImage,
  FiMic,
  FiRotateCcw,
  FiStar,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import {
  getComplaintProgress,
  type ComplaintProgressUpdate,
  type ComplaintRecord,
} from "../../services/complaints";
import type {
  ComplaintFeedbackSubmission,
} from "../../services/complaints";
import CitizenFeedbackReplies from "./CitizenFeedbackReplies";

export type ResolutionStage = "confirm" | "feedback" | "closed";

export interface ResolutionFeedback {
  rating: number;
  selectedTags: string[];
  comment: string;
}

interface ComplaintResolutionProps {
  complaint: ComplaintRecord;
  stage: ResolutionStage;
  onStageChange: (stage: ResolutionStage) => void;
  feedback: ResolutionFeedback;
  onFeedbackChange: (feedback: ResolutionFeedback) => void;
  onBack: () => void;
  onSubmitFeedback: (feedback: ComplaintFeedbackSubmission) => Promise<void>;
  isSubmitting: boolean;
  submitError: string;
}

const ComplaintHeader = ({
  complaint,
  onBack,
}: Pick<ComplaintResolutionProps, "complaint" | "onBack">) => {
  const { t } = useTranslation("common");
  return (
    <header className="border-b border-blue-100 bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          aria-label={t("back")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
        >
          <FiArrowLeft size={24} />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-extrabold sm:text-xl">{complaint.complaintNumber}</h1>
          <p className="truncate text-sm text-slate-500">
            {t(`problemPhoto.categories.${complaint.category}`)}
            {complaint.location.area ? ` · ${complaint.location.area}` : ""}
          </p>
        </div>
      </div>
    </header>
  );
};

const ComplaintPhotos = ({ photos }: { photos: string[] }) => {
  const { t } = useTranslation("common");
  if (photos.length === 0) {
    return (
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500 text-white">
        <FiImage size={21} />
      </span>
    );
  }
  return (
    <>
      {photos.map((photo, index) => (
        <img
          key={`${photo}-${index}`}
          src={photo}
          alt={t("complaintDetail.photoPlaceholder", { number: index + 1 })}
          className="h-14 w-14 rounded-2xl object-cover"
        />
      ))}
    </>
  );
};

const formatDateTime = (value: string, language: string) =>
  new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));

const ComplaintSummary = ({ complaint }: { complaint: ComplaintRecord }) => {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  return (
    <article className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          ● {t("complaintTracking.status.resolved")}
        </span>
        <span className="text-xs font-semibold text-slate-600 sm:text-sm">
          {t("complaintResolution.awaiting.date", {
            date: formatDateTime(complaint.statusHistory.at(-1)?.createdAt ?? complaint.updatedAt, locale),
          })}
        </span>
      </div>
      <h2 className="mt-3 text-xl font-extrabold sm:text-2xl">
        {t(`problemPhoto.categories.${complaint.category}`)}
        {complaint.location.area ? ` — ${complaint.location.area}` : ""}
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">{complaint.details}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ComplaintPhotos photos={complaint.photos} />
        <span className="ml-1 text-xs text-slate-500">
          {t("complaintDetail.submittedBy", {
            date: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(complaint.createdAt)),
            time: new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(new Date(complaint.createdAt)),
          })}
        </span>
      </div>
    </article>
  );
};

const ResolutionTimeline = ({ complaint }: { complaint: ComplaintRecord }) => {
  const { t, i18n } = useTranslation("common");
  const timeline: (ComplaintProgressUpdate | { type: "confirmed"; status?: never; createdAt: string; message: string })[] = [
    ...getComplaintProgress(complaint),
    ...(complaint.citizenFeedback?.confirmation === "resolved"
      ? [{
          type: "confirmed" as const,
          createdAt: complaint.citizenFeedback.submittedAt,
          message: "",
        }]
      : []),
  ];
  return (
    <section aria-labelledby="complaint-resolution-progress">
      <h2 id="complaint-resolution-progress" className="mb-2 px-1 text-sm font-bold text-slate-500">
        {t("complaintDetail.progress")}
      </h2>
      <ol className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
        {timeline.map((update, index) => (
          <li key={`${update.type}-${update.createdAt}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
            {index < timeline.length - 1 && (
              <span className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 bg-emerald-700" />
            )}
            <span className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
              <FiCheck size={17} strokeWidth={3} />
            </span>
            <div>
              <p className="font-bold">
                {update.type === "assigned"
                  ? t("complaintDetail.activity.assigned")
                  : update.type === "registered"
                    ? t("complaintDetail.activity.registered")
                  : update.status === "resolved"
                  ? t("complaintTracking.status.resolved")
                  : update.status
                    ? t(`complaintTracking.status.${update.status}`)
                    : update.type === "confirmed"
                      ? t("complaintResolution.timeline.confirmed.title")
                      : t(`complaintDetail.activity.${update.type}`)}
              </p>
              <p className="mt-0.5 text-sm leading-5 text-slate-500">
                {update.type === "confirmed"
                  ? formatDateTime(update.createdAt, i18n.resolvedLanguage ?? i18n.language)
                  : update.message || formatDateTime(update.createdAt, i18n.resolvedLanguage ?? i18n.language)}
                {"updatedBy" in update && update.updatedBy ? ` · ${update.updatedBy}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

const ResolutionConfirmation = ({
  complaint,
  onBack,
  onStageChange,
  onSubmitFeedback,
  isSubmitting,
  submitError,
}: ComplaintResolutionProps) => {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const resolutionUpdate = complaint.statusHistory.at(-1);

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <ComplaintHeader complaint={complaint} onBack={onBack} />
      <section className="mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-5 sm:px-6">
        {complaint.citizenFeedback?.confirmation === "not_resolved" && (
          <p role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {t("complaintResolution.feedback.notResolvedReported")}
          </p>
        )}
        <ComplaintSummary complaint={complaint} />
        <ResolutionTimeline complaint={complaint} />
        {complaint.citizenFeedback && <CitizenFeedbackReplies feedback={complaint.citizenFeedback} />}
        {complaint.assignedDepartment && (
          <section>
            <h2 className="mb-2 px-1 text-sm font-bold text-slate-500">{t("complaintDetail.assignedTeam")}</h2>
            <article className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)]">
              <p className="font-bold text-emerald-900">{complaint.assignedDepartment.name}</p>
              {complaint.assignedOfficer && (
                <p className="mt-1 text-sm text-slate-600">
                  {complaint.assignedOfficer.name} · {complaint.assignedOfficer.title}
                </p>
              )}
            </article>
          </section>
        )}
        <section>
          <h2 className="mb-2 px-1 text-sm font-bold text-slate-500">
            {t("complaintResolution.resolutionHeading")}
          </h2>
          <article className="flex gap-4 rounded-3xl border-2 border-emerald-300 bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)]">
            {resolutionUpdate?.photos?.[0]
              ? <img src={resolutionUpdate.photos[0]} alt={t("complaintResolution.afterRepairPhoto")} className="h-24 w-24 shrink-0 rounded-2xl object-cover" />
              : <span aria-hidden="true" className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-slate-500 text-white"><FiImage size={32} /></span>}
            <div className="min-w-0">
              <p className="text-sm leading-6 text-slate-800 sm:text-base">
                {resolutionUpdate?.message || t("complaintResolution.noResolutionNote")}
              </p>
              <p className="mt-2 text-xs text-slate-500">{t("complaintResolution.afterRepairPhoto")}</p>
              {resolutionUpdate && (
                <p className="mt-2 text-sm font-bold text-emerald-950">
                  {resolutionUpdate.updatedBy || formatDateTime(resolutionUpdate.createdAt, locale)}
                </p>
              )}
            </div>
          </article>
        </section>
      </section>
      <footer className="border-t border-blue-100 bg-white px-4 py-5 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <h2 className="mb-4 text-center text-lg font-extrabold sm:text-xl">
            {t("complaintResolution.confirmQuestion")}
          </h2>
          {submitError && <p role="alert" className="mb-3 text-center text-sm text-red-700">{submitError}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void onSubmitFeedback({ confirmation: "not_resolved" })}
              className="min-h-14 flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 font-bold shadow-sm disabled:opacity-60"
            >
              {t("complaintResolution.notResolved")}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => onStageChange("feedback")}
              className="min-h-14 flex-1 rounded-full bg-blue-600 px-4 py-3 font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-60"
            >
              {t("complaintResolution.yesResolved")}
            </button>
          </div>
          <p className="mt-4 text-center text-sm leading-6 text-slate-500">
            {t("complaintResolution.autoCloseNote")}
          </p>
        </div>
      </footer>
    </main>
  );
};

const FeedbackForm = ({
  complaint,
  onBack,
  onStageChange,
  feedback,
  onFeedbackChange,
  onSubmitFeedback,
  isSubmitting,
  submitError,
}: ComplaintResolutionProps) => {
  const { t } = useTranslation("common");
  const tags = ["quick", "polite", "complete", "faster"];

  const toggleTag = (tag: string) => {
    const selectedTags = feedback.selectedTags.includes(tag)
      ? feedback.selectedTags.filter((item) => item !== tag)
      : [...feedback.selectedTags, tag];
    onFeedbackChange({ ...feedback, selectedTags });
  };

  const submit = () =>
    onSubmitFeedback({
      confirmation: "resolved",
      rating: feedback.rating,
      tags: feedback.selectedTags,
      comment: feedback.comment,
    });

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <ComplaintHeader complaint={complaint} onBack={onBack} />
      <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-5 sm:px-6">
        <div className="rounded-3xl border-2 border-emerald-300 bg-emerald-100 px-4 py-3">
          <div className="flex items-start gap-3 text-emerald-800">
            <FiCheckCircle className="mt-0.5 shrink-0" size={24} />
            <div>
              <h2 className="font-extrabold">{t("complaintResolution.feedback.thanksTitle")}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-700">
                {t("complaintResolution.feedback.thanksDescription")}
              </p>
            </div>
          </div>
        </div>
        <h2 className="mt-6 text-center text-xl font-extrabold sm:text-2xl">
          {t("complaintResolution.feedback.ratingQuestion")}
        </h2>
        <div className="mt-5 flex justify-center gap-2" role="group" aria-label={t("complaintResolution.feedback.ratingQuestion")}>
          {Array.from({ length: 5 }, (_, index) => {
            const starRating = index + 1;
            return (
              <button
                key={starRating}
                type="button"
                aria-label={t("complaintResolution.feedback.starLabel", { count: starRating })}
                aria-pressed={feedback.rating === starRating}
                onClick={() => onFeedbackChange({ ...feedback, rating: starRating })}
                className="rounded-md p-1 text-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <FiStar size={39} className={starRating <= feedback.rating ? "fill-blue-600" : "text-slate-300"} />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center font-bold text-blue-600">
          {t(`complaintResolution.feedback.ratingLabel.${feedback.rating}`)}
        </p>
        <div className="mt-7">
          <h3 className="mb-3 text-sm font-bold text-slate-500">{t("complaintResolution.feedback.whatWentWell")}</h3>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const selected = feedback.selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleTag(tag)}
                  className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    selected ? "border-blue-600 bg-blue-50 text-blue-600" : "border-transparent bg-white text-slate-800 shadow-sm"
                  }`}
                >
                  {selected && <FiCheck className="mr-1.5 inline" size={16} />}
                  {t(`complaintResolution.feedback.tags.${tag}`)}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-7">
          <label htmlFor="resolution-feedback" className="mb-3 block text-sm font-bold text-slate-500">
            {t("complaintResolution.feedback.commentLabel")}
          </label>
          <div className="relative">
            <textarea
              id="resolution-feedback"
              value={feedback.comment}
              onChange={(event) => onFeedbackChange({ ...feedback, comment: event.target.value })}
              rows={4}
              maxLength={1000}
              className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-4 pb-12 text-sm leading-6 shadow-sm focus:border-blue-500 focus:outline-none"
            />
            <button
              type="button"
              disabled
              aria-label={t("complaintResolution.feedback.micUnavailable")}
              className="absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 disabled:opacity-70"
            >
              <FiMic size={21} />
            </button>
          </div>
        </div>
      </section>
      <footer className="border-t border-blue-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2.5">
          {submitError && <p role="alert" className="text-center text-sm text-red-700">{submitError}</p>}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void submit()}
            className="min-h-14 rounded-full bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-200 disabled:opacity-60"
          >
            {isSubmitting ? t("complaintResolution.feedback.submitting") : t("complaintResolution.feedback.submitAndClose")}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void onSubmitFeedback({ confirmation: "resolved" })}
            className="min-h-14 rounded-full border border-slate-200 bg-white px-5 py-3 font-bold shadow-sm disabled:opacity-60"
          >
            {t("complaintResolution.feedback.skipAndClose")}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onStageChange("confirm")}
            className="self-center px-4 py-2 text-sm font-semibold text-slate-500 disabled:opacity-60"
          >
            {t("complaintResolution.feedback.backToConfirmation")}
          </button>
        </div>
      </footer>
    </main>
  );
};

const ClosedComplaint = ({
  complaint,
  onBack,
  onSubmitFeedback,
  isSubmitting,
  submitError,
}: ComplaintResolutionProps) => {
  const { t } = useTranslation("common");
  const savedFeedback = complaint.citizenFeedback;
  const savedRating = savedFeedback?.rating;

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <ComplaintHeader complaint={complaint} onBack={onBack} />
      <section className="mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
        <ComplaintSummary complaint={complaint} />
        <ResolutionTimeline complaint={complaint} />
        {savedFeedback?.confirmation === "resolved" && (
          <section>
            <h2 className="mb-2 px-1 text-sm font-bold text-slate-500">
              {t("complaintResolution.closed.ratingHeading")}
            </h2>
            <article className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)]">
              {typeof savedRating === "number" && (
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="flex gap-1 text-blue-600"
                    aria-label={t("complaintResolution.feedback.starLabel", { count: savedRating })}
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <FiStar key={index} size={27} className={index < savedRating ? "fill-blue-600" : "text-slate-300"} />
                    ))}
                  </div>
                  <span className="font-bold">{t(`complaintResolution.feedback.ratingLabel.${savedRating}`)}</span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {savedFeedback.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-sm">
                    {t(`complaintResolution.feedback.tags.${tag}`)}
                  </span>
                ))}
              </div>
              {savedFeedback.comment && (
                <p className="mt-3 text-sm leading-6 text-slate-700">“{savedFeedback.comment}”</p>
              )}
            </article>
          </section>
        )}
      </section>
      <footer className="border-t border-blue-100 bg-white px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-2xl">
          <p className="mb-4 text-center text-sm leading-6 text-slate-500">
            {t("complaintResolution.closed.reopenNote")}
          </p>
          {submitError && <p role="alert" className="mb-3 text-center text-sm text-red-700">{submitError}</p>}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void onSubmitFeedback({ confirmation: "not_resolved" })}
            className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 font-bold shadow-sm disabled:opacity-60"
          >
            <FiRotateCcw size={22} />
            {t("complaintResolution.closed.reopen")}
          </button>
        </div>
      </footer>
    </main>
  );
};

const ComplaintResolution = (props: ComplaintResolutionProps) => {
  switch (props.stage) {
    case "confirm":
      return <ResolutionConfirmation {...props} />;
    case "feedback":
      return <FeedbackForm {...props} />;
    case "closed":
      return <ClosedComplaint {...props} />;
  }
};

export default ComplaintResolution;
