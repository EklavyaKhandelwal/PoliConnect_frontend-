import { useCallback, useEffect, useState } from "react";
import {
  FiChevronRight,
  FiClipboard,
  FiHeart,
  FiMessageCircle,
  FiPhone,
  FiShield,
  FiVolume2,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getComplaints, isComplaintActive, type ComplaintRecord } from "../../services/complaints";

import HomeModeSelector from "../../components/HomeModeSelector";
import InAppCall from "../../components/InAppCall";
import ComplaintCenterHeader from "./ComplaintCenterHeader";

const ComplaintCenter = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(true);
  const [complaintsError, setComplaintsError] = useState(false);
  const [showCallConfirmation, setShowCallConfirmation] = useState(false);
  const [callActive, setCallActive] = useState(false);

  const loadComplaints = useCallback(async () => {
    setIsLoadingComplaints(true);
    setComplaintsError(false);
    try {
      setComplaints(await getComplaints());
    } catch (error) {
      console.error("Could not load complaints for complaint center:", error);
      setComplaintsError(true);
    } finally {
      setIsLoadingComplaints(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getComplaints()
      .then((items) => {
        if (active) setComplaints(items);
      })
      .catch((error: unknown) => {
        console.error("Could not load complaints for complaint center:", error);
        if (active) setComplaintsError(true);
      })
      .finally(() => {
        if (active) setIsLoadingComplaints(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!showCallConfirmation) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowCallConfirmation(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showCallConfirmation]);

  const activeCount = complaints.filter(
    isComplaintActive,
  ).length;
  const newCount = complaints.filter((complaint) => complaint.status === "received").length;
  const latestComplaint = complaints[0];
  const openProblemPhoto = () =>
    navigate("/problem-photo", { state: { from: location.pathname } });

  if (callActive) {
    return (
      <InAppCall
        onEnd={(submittedComplaintNumber) => {
          setCallActive(false);
          if (submittedComplaintNumber) {
            navigate("/my-complaints", { state: { submittedComplaintNumber } });
          } else {
            void loadComplaints();
          }
        }}
      />
    );
  }

  if (isLoadingComplaints) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-gradient-to-b from-blue-100 via-blue-50 to-white px-6 text-center text-slate-500">
        <span className="h-9 w-9 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" aria-hidden="true" />
        <p role="status" aria-live="polite">{t("complaintTracking.loading")}</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pb-5 sm:px-8">
        <ComplaintCenterHeader />
        <HomeModeSelector />

        <section className="mt-6 sm:mt-8">
          <div className="flex items-center gap-3">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FiVolume2 size={29} />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">
                {t("complaintCenter.title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500 sm:text-base">
                {t("complaintCenter.subtitle")}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
            {t("complaintCenter.description")}
          </p>
        </section>

        {latestComplaint && (
          <button
            type="button"
            onClick={() => navigate(`/my-complaints/${encodeURIComponent(latestComplaint.complaintNumber)}`)}
            className="mt-5 w-full rounded-3xl border-2 border-blue-500 bg-white p-4 text-left shadow-sm transition hover:shadow-md sm:mt-7 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
                {t(`complaintTracking.status.${latestComplaint.status}`)}
              </span>
              <span className="text-xs font-semibold text-slate-500">{latestComplaint.complaintNumber}</span>
            </div>
            <h2 className="mt-2 text-base font-bold sm:text-lg">
              {t(`problemPhoto.categories.${latestComplaint.category}`)}
              {latestComplaint.location.area ? ` — ${latestComplaint.location.area}` : ""}
            </h2>
            <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">{latestComplaint.details}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-blue-600">
              {t("complaintCenter.viewComplaint")}
              <span aria-hidden="true">→</span>
            </span>
          </button>
        )}
        {complaintsError && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {t("complaintCenter.countLoadError")}
            <button type="button" onClick={() => void loadComplaints()} className="ml-2 font-bold underline">
              {t("complaintTracking.retry")}
            </button>
          </p>
        )}

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-bold text-slate-500">
            {t("complaintCenter.whatWouldYouLike")}
          </h2>
          <div className="space-y-3">
            <ActionCard
              icon={<FiVolume2 size={23} />}
              title={t("complaintCenter.actions.file.title")}
              description={t("complaintCenter.actions.file.description")}
              onClick={openProblemPhoto}
            />
            <ActionCard
              icon={<FiHeart size={23} />}
              title={t("complaintCenter.actions.feedback.title")}
              description={t("complaintCenter.actions.feedback.description")}
              onClick={() => navigate("/suggestion-thanks")}
              green
            />
            <ActionCard
              icon={<FiMessageCircle size={23} />}
              title={t("complaintCenter.myUpdates")}
              description={t("complaintCenter.myUpdatesDescription")}
              onClick={() => navigate("/my-updates")}
            />
            <ActionCard
              icon={<FiPhone size={23} />}
              title={t("complaintCenter.actions.call.title")}
              description={t("complaintCenter.actions.call.description")}
              onClick={() => setShowCallConfirmation(true)}
              badge={t("complaintCenter.new")}
            />
            <button
              type="button"
              onClick={() => navigate("/my-complaints")}
              className="flex min-h-[68px] w-full items-center gap-3 rounded-3xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_4px_12px_rgba(44,79,125,0.08)]"
            >
              <FiClipboard className="shrink-0 text-slate-700" size={21} />
              <span className="flex-1 font-bold">{t("complaintCenter.myComplaints")}</span>
              <span className="text-right text-xs font-bold text-blue-600 sm:text-sm">
                {t("complaintCenter.activeCount", { active: activeCount, new: newCount })}
              </span>
              <FiChevronRight className="shrink-0 text-slate-400" size={21} />
            </button>
          </div>
        </section>

        <p className="mt-6 flex items-center justify-center gap-2 pb-2 text-center text-xs text-slate-500 sm:mt-8 sm:text-sm">
          <FiShield className="shrink-0 text-emerald-700" size={18} />
          {t("complaintCenter.privacyNote")}
        </p>
      </div>
      {showCallConfirmation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowCallConfirmation(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="voice-call-confirmation-title"
            className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
          >
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
              <FiPhone size={28} />
            </span>
            <h2 id="voice-call-confirmation-title" className="mt-5 text-xl font-extrabold text-slate-900">
              {t("inAppCall.confirmTitle")}
            </h2>
            <div className="mt-6 grid gap-3">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setShowCallConfirmation(false);
                  setCallActive(true);
                }}
                className="w-full rounded-full bg-blue-700 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-200"
              >
                {t("inAppCall.startCall")}
              </button>
              <button
                type="button"
                onClick={() => setShowCallConfirmation(false)}
                className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 font-semibold text-slate-700"
              >
                {t("inAppCall.cancelCall")}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

const ActionCard = ({
  icon,
  title,
  description,
  onClick,
  green = false,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  green?: boolean;
  badge?: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[88px] w-full items-center gap-3 rounded-3xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-[0_4px_12px_rgba(44,79,125,0.08)] transition hover:shadow-md active:scale-[0.99] sm:gap-4 sm:px-5"
  >
    <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${green ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-700"}`}>
      {icon}
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2 font-bold text-slate-900">
        {title}
        {badge && <span className="rounded-full bg-sky-800 px-2 py-0.5 text-[10px] font-bold text-white">{badge}</span>}
      </span>
      <span className="mt-1 block text-sm leading-5 text-slate-500">{description}</span>
    </span>
    <FiChevronRight className="shrink-0 text-slate-400" size={21} />
  </button>
);

export default ComplaintCenter;
