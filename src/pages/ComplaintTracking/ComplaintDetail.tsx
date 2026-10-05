import { useCallback, useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiClock,
  FiImage,
  FiPause,
  FiRefreshCw,
  FiSend,
  FiX,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAppSelector } from "../../hooks/redux";
import {
  getComplaint,
  getComplaintProgress,
  sendComplaintMessage,
  submitComplaintFeedback,
  type ComplaintFeedbackSubmission,
  type ComplaintRecord,
} from "../../services/complaints";
import ComplaintResolution, {
  type ResolutionFeedback,
  type ResolutionStage,
} from "./ComplaintResolution";
import CitizenFeedbackReplies from "./CitizenFeedbackReplies";

const allowedPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ComplaintDetail = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { complaintId } = useParams();
  const user = useAppSelector((state) => state.auth.user);
  const [complaint, setComplaint] = useState<ComplaintRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [resolutionStage, setResolutionStage] = useState<ResolutionStage>("confirm");
  const [feedback, setFeedback] = useState<ResolutionFeedback>({
    rating: 4,
    selectedTags: ["quick", "polite"],
    comment: "",
  });
  const [message, setMessage] = useState("");
  const [messagePhotos, setMessagePhotos] = useState<File[]>([]);
  const [messageError, setMessageError] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const loadComplaint = useCallback(async () => {
    if (!complaintId) {
      setHasError(true);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setHasError(false);
    try {
      const record = await getComplaint(complaintId);
      setComplaint(record);
      if (record.citizenFeedback) {
        setFeedback({
          rating: record.citizenFeedback.rating ?? 4,
          selectedTags: record.citizenFeedback.tags,
          comment: record.citizenFeedback.comment,
        });
        setResolutionStage(
          record.citizenFeedback.confirmation === "resolved" ? "closed" : "confirm",
        );
      } else {
        setResolutionStage("confirm");
      }
    } catch (error) {
      console.error("Could not load complaint details:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [complaintId]);

  useEffect(() => {
    void loadComplaint();
  }, [loadComplaint]);

  const submitFeedback = async (payload: ComplaintFeedbackSubmission) => {
    if (!complaintId) return;
    setIsSubmitting(true);
    setSubmitError("");
    try {
      const updatedComplaint = await submitComplaintFeedback(complaintId, payload);
      setComplaint(updatedComplaint);
      if (payload.confirmation === "resolved") {
        setResolutionStage("closed");
        setFeedback({
          rating: updatedComplaint.citizenFeedback?.rating ?? feedback.rating,
          selectedTags: updatedComplaint.citizenFeedback?.tags ?? feedback.selectedTags,
          comment: updatedComplaint.citizenFeedback?.comment ?? feedback.comment,
        });
      } else {
        setResolutionStage("confirm");
      }
    } catch (error) {
      console.error("Could not save complaint feedback:", error);
      setSubmitError(t("complaintResolution.feedback.saveError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const sendMessage = async () => {
    if (!complaintId || (!message.trim() && messagePhotos.length === 0)) {
      setMessageError(t("complaintDetail.messageRequired"));
      return;
    }
    setIsSendingMessage(true);
    setMessageError("");
    try {
      const updated = await sendComplaintMessage(complaintId, message.trim(), messagePhotos);
      setComplaint(updated);
      setMessage("");
      setMessagePhotos([]);
    } catch (error) {
      console.error("Could not send complaint reply:", error);
      setMessageError(error instanceof Error ? error.message : t("complaintDetail.messageSendError"));
    } finally {
      setIsSendingMessage(false);
    }
  };

  const chooseMessagePhotos = (files: FileList | null) => {
    const selected = Array.from(files ?? []);
    if (selected.length > 4 || selected.some((file) => !allowedPhotoTypes.has(file.type) || file.size > 5 * 1024 * 1024)) {
      setMessageError(t("complaintDetail.photoValidation"));
      return;
    }
    setMessageError("");
    setMessagePhotos(selected);
  };

  if (isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-blue-100 via-blue-50 to-white px-6 text-center text-slate-500">
        <p role="status">{t("complaintTracking.loading")}</p>
      </main>
    );
  }

  if (hasError || !complaint) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-blue-100 via-blue-50 to-white px-6 text-center text-slate-900">
        <p role="alert" className="text-slate-600">{t("complaintDetail.loadError")}</p>
        <button
          type="button"
          onClick={() => void loadComplaint()}
          className="mt-5 rounded-full bg-blue-600 px-5 py-3 font-bold text-white"
        >
          {t("complaintTracking.retry")}
        </button>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-3 px-5 py-2 font-semibold text-slate-600"
        >
          {t("complaintDetail.backToComplaints")}
        </button>
      </main>
    );
  }

  if (complaint.status === "resolved") {
    return (
      <ComplaintResolution
        complaint={complaint}
        stage={resolutionStage}
        onStageChange={setResolutionStage}
        feedback={feedback}
        onFeedbackChange={setFeedback}
        onBack={() => navigate(-1)}
        onSubmitFeedback={submitFeedback}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
    );
  }

  const statusClasses = complaint.status === "rejected"
    ? "bg-rose-100 text-rose-800"
    : complaint.status === "waiting_for_citizen"
      ? "bg-blue-600 text-white"
      : "border border-amber-300 bg-amber-50 text-amber-800";
  const progressUpdates = getComplaintProgress(complaint);

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <header className="border-b border-blue-100 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("back")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <FiArrowLeft size={24} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-extrabold sm:text-xl">{complaint.complaintNumber}</h1>
            <p className="truncate text-sm text-slate-500">
              {t(`problemPhoto.categories.${complaint.category}`)}
              {complaint.location.area ? ` · ${complaint.location.area}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadComplaint()}
            disabled={isLoading}
            aria-label={t("complaintTracking.refresh")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <FiRefreshCw className={isLoading ? "animate-spin" : ""} size={19} />
          </button>
        </div>
      </header>
      <section className="mx-auto w-full max-w-2xl flex-1 space-y-5 overflow-y-auto px-4 pb-6 pt-5 sm:px-6">
        <article className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses}`}>
              <span aria-hidden="true" className="mr-1.5">●</span>
              {t(`complaintTracking.status.${complaint.status}`)}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 sm:text-sm">
              {complaint.slaPausedAt ? <FiPause size={17} /> : <FiClock size={17} />}
              {complaint.slaPausedAt && complaint.slaDeadline
                ? t("complaintDetail.responsePaused")
                : complaint.slaDeadline
                ? t("complaintDetail.responseDeadline", {
                    date: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
                      dateStyle: "medium",
                    }).format(new Date(complaint.slaDeadline)),
                  })
                : t("complaintDetail.noDeadline")}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-extrabold sm:text-2xl">
            {t(`problemPhoto.categories.${complaint.category}`)}
            {complaint.location.area ? ` — ${complaint.location.area}` : ""}
          </h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600 sm:text-base">
            {complaint.details}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {complaint.photos.length > 0 ? complaint.photos.map((photo, index) => (
              <img
                key={`${photo}-${index}`}
                src={photo}
                alt={t("complaintDetail.photoPlaceholder", { number: index + 1 })}
                className="h-14 w-14 rounded-2xl object-cover"
              />
            )) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-500 text-white">
                <FiImage size={22} />
              </span>
            )}
            <span className="ml-1 text-xs text-slate-500">
              {t("complaintDetail.submittedBy", {
                date: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
                  dateStyle: "medium",
                }).format(new Date(complaint.createdAt)),
                time: new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
                  timeStyle: "short",
                }).format(new Date(complaint.createdAt)),
              })}
            </span>
          </div>
        </article>

        {complaint.citizenFeedback?.confirmation === "not_resolved" && (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {t("complaintResolution.feedback.notResolvedReported")}
          </p>
        )}
        {complaint.citizenFeedback && <CitizenFeedbackReplies feedback={complaint.citizenFeedback} />}
        <section aria-labelledby="complaint-progress-heading">
          <h2 id="complaint-progress-heading" className="mb-2 px-1 text-sm font-bold text-slate-500">
            {t("complaintDetail.progress")}
          </h2>
          <ol className="rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
            {progressUpdates.map((update, index) => (
              <li key={`${update.type}-${update.createdAt}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                {index < progressUpdates.length - 1 && (
                  <span className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5 bg-emerald-500" />
                )}
                <span className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${
                  index === progressUpdates.length - 1
                    ? "border-blue-200 bg-blue-100 text-blue-800"
                    : "border-emerald-100 bg-emerald-100 text-emerald-800"
                }`}>
                  {index < progressUpdates.length - 1 ? <FiCheck size={16} /> : <span className="h-2 w-2 rounded-full bg-current" />}
                </span>
                <div>
                  <p className="font-bold">
                    {update.type === "registered"
                      ? t("complaintDetail.activity.registered")
                      : update.type === "assigned"
                        ? t("complaintDetail.activity.assigned")
                        : update.status
                      ? t(`complaintTracking.status.${update.status}`)
                      : t("complaintDetail.activity.status_changed")}
                  </p>
                  <p className="mt-0.5 text-sm leading-5 text-slate-500">
                    {update.message || new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(update.createdAt))}
                    {update.updatedBy ? ` · ${update.updatedBy}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {complaint.assignedDepartment && (
          <section aria-labelledby="complaint-team-heading">
            <h2 id="complaint-team-heading" className="mb-2 px-1 text-sm font-bold text-slate-500">
              {t("complaintDetail.assignedTeam")}
            </h2>
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

        <section aria-labelledby="complaint-messages-heading">
          <h2 id="complaint-messages-heading" className="mb-2 px-1 text-sm font-bold text-slate-500">
            {t("complaintDetail.teamMessages")}
          </h2>
          {complaint.publicMessages.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
              {t("complaintDetail.noMessages")}
            </p>
          ) : (
            <div className="space-y-3">
              {complaint.publicMessages.map((item, index) => {
                const isAdmin = item.sender === "admin";
                const needsReply = isAdmin && item.requiresResponse && complaint.status === "waiting_for_citizen";
                const citizenName = user?.name?.trim() || t("complaintDetail.you");
                const citizenInitial = Array.from(user?.name?.trim() || t("complaintDetail.youInitials"))[0]?.toLocaleUpperCase() ?? "?";
                return (
                  <div key={`${item.createdAt}-${index}`} className={`flex ${isAdmin ? "justify-start" : "justify-end"}`}>
                    <article
                      className={`w-full max-w-[min(82%,460px)] rounded-3xl bg-white p-3 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-4 ${
                        needsReply ? "ring-2 ring-blue-500" : ""
                      }`}
                    >
                      <div className={`mb-1.5 flex items-center gap-2 ${isAdmin ? "" : "flex-row-reverse text-right"}`}>
                        <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${isAdmin ? "bg-emerald-900" : "bg-blue-600"}`}>
                          {isAdmin ? "AD" : citizenInitial}
                        </span>
                        <div>
                          <p className={`text-sm font-bold ${isAdmin ? "text-emerald-900" : "text-blue-800"}`}>
                            {isAdmin ? item.senderName || t("complaintDetail.adminTeam") : citizenName}
                          </p>
                          {needsReply && <p className="text-xs font-semibold text-blue-600">{t("complaintDetail.replyRequested")}</p>}
                        </div>
                      </div>
                      {item.message && <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{item.message}</p>}
                      {item.photos.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.photos.map((photo, photoIndex) => (
                            <img
                              key={`${photo}-${photoIndex}`}
                              src={photo}
                              alt={t("complaintDetail.replyPhoto", { number: photoIndex + 1 })}
                              className="h-20 w-20 rounded-xl object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <p className={`mt-1.5 text-xs text-slate-400 ${isAdmin ? "" : "text-right"}`}>
                        {new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(item.createdAt))}
                      </p>
                    </article>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {progressUpdates.length === 0 && (
          <p role="status" className="text-center text-sm text-slate-500">
            {t("complaintDetail.noStatusHistory")}
          </p>
        )}
      </section>
      {complaint.status !== "rejected" && (
        <footer className="sticky bottom-0 border-t border-blue-100 bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            {messagePhotos.length > 0 && (
              <div className="mb-2 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2 text-xs text-blue-800">
                <span>{t("complaintDetail.photosSelected", { count: messagePhotos.length })}</span>
                <button type="button" aria-label={t("complaintDetail.removePhotos")} onClick={() => setMessagePhotos([])}>
                  <FiX />
                </button>
              </div>
            )}
            {messageError && <p className="mb-2 text-xs text-rose-700" role="alert">{messageError}</p>}
            <div className="flex items-end gap-2">
              <label className="grid h-12 w-12 shrink-0 cursor-pointer place-items-center rounded-full border border-blue-100 bg-blue-50 text-slate-700" aria-label={t("complaintDetail.attachPhoto")}>
                <FiCamera size={21} />
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(event) => chooseMessagePhotos(event.currentTarget.files)}
                />
              </label>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={1000}
                rows={1}
                placeholder={complaint.status === "waiting_for_citizen"
                  ? t("complaintDetail.replyPlaceholder")
                  : t("complaintDetail.messagePlaceholder")}
                aria-label={t("complaintDetail.messagePlaceholder")}
                className="max-h-28 min-h-12 flex-1 resize-y rounded-3xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={isSendingMessage || (!message.trim() && messagePhotos.length === 0)}
                aria-label={t("complaintDetail.sendMessage")}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-200 disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                <FiSend size={20} />
              </button>
            </div>
          </div>
        </footer>
      )}
    </main>
  );
};

export default ComplaintDetail;
