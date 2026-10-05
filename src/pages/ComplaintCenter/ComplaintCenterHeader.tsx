import { FiClipboard, FiSettings } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setLanguage, type Language } from "../../store/slices/languageSlice";
import LanguageSelectorSheet from "../../components/LanguageSelectorSheet";

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
    <header className="flex items-center justify-between gap-2 py-3 sm:py-5">
      <button
        type="button"
        onClick={() => navigate("/my-complaints")}
        aria-label={t("complaintCenter.myComplaints")}
        className="flex h-11 min-w-11 items-center justify-center gap-2 rounded-full bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm sm:h-12"
      >
        <FiClipboard size={19} />
        <span className="hidden sm:inline">{t("complaintCenter.myComplaints")}</span>
      </button>
      <LanguageSelectorSheet language={language} onChange={handleLanguageChange} compact />
      <button
        type="button"
        onClick={() => navigate("/settings")}
        aria-label={t("settings")}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm sm:h-12 sm:w-12"
      >
        <FiSettings size={22} />
      </button>
    </header>
  );
};

export default ComplaintCenterHeader;
