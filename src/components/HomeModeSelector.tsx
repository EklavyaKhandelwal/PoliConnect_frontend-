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
      className="mt-3 flex w-full rounded-full border border-white/80 bg-blue-50/90 p-1 shadow-sm sm:mt-6"
    >
      <button
        type="button"
        aria-current={!complaintMode ? "page" : undefined}
        onClick={() => navigate("/")}
        className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-3 sm:py-3 sm:text-base ${
          !complaintMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-blue-700"
        }`}
      >
        <FiMessageCircle className="shrink-0 text-blue-600" size={19} />
        <span className="truncate">{t("home.aiAssistant")}</span>
      </button>
      <button
        type="button"
        aria-current={complaintMode ? "page" : undefined}
        onClick={() => navigate("/complaint-center")}
        className={`flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-3 sm:py-3 sm:text-base ${
          complaintMode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-blue-700"
        }`}
      >
        <FiClipboard className="shrink-0" size={18} />
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
