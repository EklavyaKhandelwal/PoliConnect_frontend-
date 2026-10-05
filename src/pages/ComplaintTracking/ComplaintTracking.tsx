import { useCallback, useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiChevronRight,
  FiClipboard,
  FiDroplet,
  FiHeart,
  FiNavigation,
  FiPlus,
  FiRefreshCw,
  FiZap,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getComplaints,
  type ComplaintCategory,
  type ComplaintRecord,
} from "../../services/complaints";

type ComplaintTab = "active" | "resolved";

const categoryIcons: Record<ComplaintCategory, typeof FiHeart> = {
  road: FiNavigation,
  water: FiDroplet,
  electricity: FiZap,
  cleanliness: FiHeart,
  health: FiHeart,
  ration: FiHeart,
  education: FiHeart,
  other: FiHeart,
};

const ComplaintTracking = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { submittedComplaintNumber?: unknown } | null;
  const submittedComplaintNumber =
    typeof routeState?.submittedComplaintNumber === "string"
      ? routeState.submittedComplaintNumber
      : undefined;
  const [selectedTab, setSelectedTab] = useState<ComplaintTab>("active");
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadComplaints = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      setComplaints(await getComplaints());
    } catch (error) {
      console.error("Could not load complaints:", error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    getComplaints()
      .then((records) => {
        if (isActive) setComplaints(records);
      })
      .catch((error: unknown) => {
        console.error("Could not load complaints:", error);
        if (isActive) setHasError(true);
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  const orderedComplaints = submittedComplaintNumber
    ? [...complaints].sort((first, second) => {
        if (first.complaintNumber === submittedComplaintNumber) return -1;
        if (second.complaintNumber === submittedComplaintNumber) return 1;
        return 0;
      })
    : complaints;
  const activeComplaints = orderedComplaints.filter(
    (complaint) =>
      complaint.status !== "rejected" &&
      !(complaint.status === "resolved" && complaint.citizenFeedback?.confirmation === "resolved"),
  );
  const resolvedComplaints = orderedComplaints.filter(
    (complaint) =>
      complaint.status === "rejected" ||
      (complaint.status === "resolved" && complaint.citizenFeedback?.confirmation === "resolved"),
  );
  const visibleComplaints = selectedTab === "active" ? activeComplaints : resolvedComplaints;

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
      day: "numeric",
      month: "short",
    }).format(new Date(date));

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <header className="border-b border-blue-100 bg-white px-5 py-4">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("back")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-slate-100"
          >
            <FiArrowLeft size={24} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold sm:text-2xl">{t("complaintTracking.title")}</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {!isLoading && complaints.length === 0
                ? t("complaintTracking.emptyActive")
                : t("complaintTracking.subtitle", {
                    active: activeComplaints.length,
                    reply: complaints.filter(
                      (complaint) => complaint.status === "resolved" && !complaint.citizenFeedback,
                    ).length,
                  })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadComplaints()}
            aria-label={t("complaintTracking.refresh")}
            disabled={isLoading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <FiRefreshCw className={isLoading ? "animate-spin" : ""} size={19} />
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-28 pt-5 sm:px-6 sm:pt-6">
        <div
          role="tablist"
          aria-label={t("complaintTracking.tabsLabel")}
          className="mb-5 flex rounded-full border border-white bg-white/70 p-1 shadow-sm"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === "active"}
            onClick={() => setSelectedTab("active")}
            className={`min-h-11 flex-1 rounded-full px-3 py-2 text-sm font-bold transition ${
              selectedTab === "active" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t("complaintTracking.activeTab", { count: activeComplaints.length })}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedTab === "resolved"}
            onClick={() => setSelectedTab("resolved")}
            className={`min-h-11 flex-1 rounded-full px-3 py-2 text-sm font-bold transition ${
              selectedTab === "resolved" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t("complaintTracking.resolvedTab", { count: resolvedComplaints.length })}
          </button>
        </div>

        {isLoading ? (
          <p role="status" className="rounded-3xl bg-white p-6 text-center text-slate-500 shadow-sm">
            {t("complaintTracking.loading")}
          </p>
        ) : hasError ? (
          <div role="alert" className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="text-slate-600">{t("complaintTracking.loadError")}</p>
            <button
              type="button"
              onClick={() => void loadComplaints()}
              className="mt-4 rounded-full bg-blue-600 px-5 py-2.5 font-bold text-white"
            >
              {t("complaintTracking.retry")}
            </button>
          </div>
        ) : visibleComplaints.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-5 pb-10 pt-12 text-center">
            <span className="flex h-32 w-32 items-center justify-center rounded-[2.5rem] bg-blue-100/70 text-blue-700">
              <FiClipboard size={52} strokeWidth={1.7} />
            </span>
            <h2 className="mt-8 text-2xl font-extrabold text-slate-900">
              {t(selectedTab === "active" ? "complaintTracking.emptyActive" : "complaintTracking.emptyResolved")}
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-slate-500">
              {t(
                selectedTab === "active"
                  ? "complaintTracking.emptyActiveDescription"
                  : "complaintTracking.emptyResolvedDescription",
              )}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {visibleComplaints.map((complaint) => {
              const Icon = categoryIcons[complaint.category];
              const latestUpdate = complaint.statusHistory.at(-1);
              const description = latestUpdate?.message
                ? latestUpdate.message
                : t(`complaintTracking.statusDescription.${complaint.status}`);
              return (
                <button
                  type="button"
                  key={complaint.complaintNumber}
                  onClick={() => navigate(`/my-complaints/${encodeURIComponent(complaint.complaintNumber)}`)}
                  aria-label={t("complaintDetail.openComplaint", {
                    title: `${t(`problemPhoto.categories.${complaint.category}`)} ${complaint.location.area ?? ""}`,
                  })}
                  className={`w-full rounded-3xl border bg-white p-4 text-left shadow-[0_5px_16px_rgba(44,79,125,0.10)] transition hover:shadow-md active:scale-[0.99] sm:p-5 ${
                    complaint.complaintNumber === submittedComplaintNumber
                      ? "border-blue-500 ring-2 ring-blue-200"
                      : "border-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                      <Icon size={26} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-extrabold leading-snug sm:text-lg">
                        {t(`problemPhoto.categories.${complaint.category}`)}
                        {complaint.location.area ? ` — ${complaint.location.area}` : ""}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                        {complaint.complaintNumber} · {formatDate(complaint.createdAt)}
                      </p>
                    </div>
                    <FiChevronRight className="shrink-0 text-slate-400" size={22} />
                  </div>
                  <div className="ml-[68px] mt-2.5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                        complaint.status === "resolved"
                          ? "bg-emerald-100 text-emerald-800"
                          : complaint.status === "rejected"
                            ? "bg-rose-100 text-rose-800"
                            : complaint.status === "waiting_for_citizen"
                              ? "bg-blue-100 text-blue-800"
                            : "border border-amber-300 bg-amber-50 text-amber-800"
                      }`}
                    >
                      <span aria-hidden="true" className="mr-1.5">●</span>
                      {t(`complaintTracking.status.${complaint.status}`)}
                    </span>
                    <p className="mt-1.5 text-sm leading-5 text-slate-500">{description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <footer className="sticky bottom-0 border-t border-blue-100 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <button
            type="button"
            onClick={() => navigate("/problem-photo", { state: { from: "/my-complaints" } })}
            className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-base font-bold text-white shadow-lg shadow-blue-200"
          >
            <FiPlus size={22} />
            {t("complaintTracking.newComplaint")}
          </button>
        </div>
      </footer>
    </main>
  );
};

export default ComplaintTracking;
