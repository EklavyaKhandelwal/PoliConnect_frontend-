import { FiClipboard, FiSettings } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setLanguage, type Language } from "../../store/slices/languageSlice";
import LanguageSelectorSheet from "../../components/LanguageSelectorSheet";
import CitizenNotificationBell from "../../components/CitizenNotificationBell";

const ComplaintCenterHeader = () => {
  const { t, i18n } = useTranslation("common");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const language = useAppSelector((state) => state.language.currentLanguage);

  const handleLanguageChange = (nextLanguage: Language) => {
    dispatch(setLanguage(nextLanguage));
    void i18n.changeLanguage(nextLanguage);
  };

  return (
    <header className="relative z-10 pb-0 pt-3 sm:pb-0 sm:pt-5">
      <nav className="flex min-h-14 items-center justify-between gap-1 rounded-[22px] border border-white/90 bg-white/80 p-1.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:min-h-16 sm:gap-2 sm:rounded-3xl sm:p-2">
        <button
          type="button"
          onClick={() => navigate("/my-complaints")}
          aria-label={t("complaintCenter.myComplaints")}
          className="flex h-10 min-w-0 items-center gap-2 rounded-2xl px-2 text-sm font-semibold text-slate-800 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-12 sm:px-3"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100/80 text-blue-700 sm:h-9 sm:w-9">
            <FiClipboard size={18} />
          </span>
          <span className="max-w-28 truncate text-xs sm:max-w-none sm:text-sm">
            {t("complaintCenter.myComplaints")}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-0 sm:gap-1">
          <CitizenNotificationBell />
          <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-slate-200 sm:mx-2 sm:h-8" />
          <LanguageSelectorSheet language={language} onChange={handleLanguageChange} unified />
          <span aria-hidden="true" className="mx-0.5 h-6 w-px bg-slate-200 sm:mx-2 sm:h-8" />
          <button
            type="button"
            onClick={() => navigate("/settings")}
            aria-label={t("settings")}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-11 sm:w-11"
          >
            <FiSettings size={20} />
          </button>
        </div>
      </nav>
    </header>
  );
};

export default ComplaintCenterHeader;
