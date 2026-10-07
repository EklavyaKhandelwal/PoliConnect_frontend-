import { FiClock, FiLogOut, FiSettings, FiUser } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { setLanguage, type Language } from "../store/slices/languageSlice";
import LanguageSelectorSheet from "./LanguageSelectorSheet";
import { useNavigate } from "react-router-dom";
import { clearAuth } from "../store/slices/authSlice";
import { clearChat } from "../store/slices/chatSlice";
import { signOut } from "../services/authService";
import ConfirmationSheet from "./ConfirmationSheet";
import { useState } from "react";
import CitizenNotificationBell from "./CitizenNotificationBell";

const Header = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const language = useAppSelector((state) => state.language.currentLanguage);
  const user = useAppSelector((state) => state.auth.user);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);
  const displayName = user?.name?.trim() || user?.email || "";
  const initials = displayName
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const { t } = useTranslation("common");
  const { i18n } = useTranslation();

  const handleLanguageChange = (value: Language) => {
    dispatch(setLanguage(value));
    void i18n.changeLanguage(value);
  };

  const handleAuthAction = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setShowLogoutConfirmation(true);
  };

  const confirmLogout = async () => {
    try {
      await signOut();
    } finally {
      dispatch(clearAuth());
      dispatch(clearChat());
      setShowLogoutConfirmation(false);
    }
  };

  return (
    <>
      <header className="relative z-10 pt-3 sm:pt-6">
        <nav
          className="flex min-h-14 items-center justify-between gap-1 rounded-[22px] border border-white/90 bg-white/80 p-1.5 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:min-h-16 sm:gap-2 sm:rounded-3xl sm:p-2"
        >
          <div className="flex min-w-0 items-center">
            {user ? (
              <div className="flex min-w-0 items-center gap-2 rounded-2xl px-1.5 sm:gap-3 sm:px-2">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 sm:h-11 sm:w-11 sm:text-sm">
                  {initials || <FiUser size={18} />}
                  <span aria-hidden="true" className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
                </span>
                <span className="hidden min-w-0 sm:block">
                  <span className="block max-w-44 truncate text-sm font-semibold leading-5 text-slate-800">
                    {displayName}
                  </span>
                  <span className="block max-w-44 truncate text-xs leading-4 text-slate-500">
                    {user.email}
                  </span>
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleAuthAction}
                aria-label={t("auth.loginButton")}
                className="flex h-10 items-center gap-2 rounded-2xl px-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-12 sm:px-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100/80 text-blue-700 sm:h-9 sm:w-9">
                  <FiUser size={18} />
                </span>
                <span className="hidden sm:inline">{t("auth.loginButton")}</span>
              </button>
            )}

            {user && (
              <>
                <span aria-hidden="true" className="mx-1 h-7 w-px bg-slate-200 sm:mx-3 sm:h-9" />
                <button
                  type="button"
                  onClick={handleAuthAction}
                  aria-label={t("auth.logout")}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-11 sm:w-auto sm:gap-2 sm:px-3"
                >
                  <FiLogOut size={19} />
                  <span className="hidden text-sm font-medium sm:inline">{t("auth.logout")}</span>
                </button>
                <span aria-hidden="true" className="mx-1 h-7 w-px bg-slate-200 sm:mx-3 sm:h-9" />
              </>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-0 sm:gap-1">
            <button
              type="button"
              onClick={() => navigate("/history")}
              aria-label={t("history")}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-11 sm:w-11"
            >
              <FiClock size={20} />
            </button>

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
      <ConfirmationSheet
        open={showLogoutConfirmation}
        title={t("auth.logoutTitle")}
        message={t("auth.logoutConfirmation")}
        confirmLabel={t("auth.logout")}
        cancelLabel={t("auth.cancel")}
        onConfirm={() => void confirmLogout()}
        onCancel={() => setShowLogoutConfirmation(false)}
        destructive
      />
    </>
  );
};

export default Header;
