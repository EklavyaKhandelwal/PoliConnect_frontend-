import { useEffect, useState } from "react";
import { FiMessageCircle, FiClipboard } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { getComplaints, isComplaintActive } from "../services/complaints";

const HomeModeSelector = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const complaintMode = location.pathname.startsWith("/complaint-center");
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    let active = true;
    getComplaints()
      .then((complaints) => {
        if (active) {
          setActiveCount(
            complaints.filter(isComplaintActive).length,
          );
        }
      })
      .catch((error: unknown) => {
        console.error("Could not load complaint count for mode selector:", error);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <nav
      aria-label={t("home.assistantModes")}
      className="mt-3 flex w-full rounded-[22px] border border-white/90 bg-white/55 p-1.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.3)] backdrop-blur-lg sm:mt-4 sm:rounded-3xl sm:p-2"
    >
      <button
        type="button"
        aria-current={!complaintMode ? "page" : undefined}
        onClick={() => navigate("/")}
        className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-14 sm:gap-2 sm:px-3 sm:text-base ${
          !complaintMode
            ? "border-white bg-white text-slate-900 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.35)]"
            : "border-transparent text-slate-600 hover:bg-white/60 hover:text-blue-700"
        }`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${!complaintMode ? "bg-blue-50 text-blue-600" : ""}`}>
          <FiMessageCircle size={17} />
        </span>
        <span className="truncate">{t("home.aiAssistant")}</span>
      </button>
      <button
        type="button"
        aria-current={complaintMode ? "page" : undefined}
        onClick={() => navigate("/complaint-center")}
        className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-sm font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:min-h-14 sm:gap-2 sm:px-3 sm:text-base ${
          complaintMode
            ? "border-white bg-white text-slate-900 shadow-[0_4px_12px_-6px_rgba(15,23,42,0.35)]"
            : "border-transparent text-slate-600 hover:bg-white/60 hover:text-blue-700"
        }`}
      >
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl ${complaintMode ? "bg-blue-50 text-blue-600" : ""}`}>
          <FiClipboard size={17} />
        </span>
        <span className="truncate">{t("home.complaintCenter")}</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white sm:h-6 sm:min-w-6 sm:text-xs">
            {activeCount}
          </span>
        )}
      </button>
    </nav>
  );
};

export default HomeModeSelector;
