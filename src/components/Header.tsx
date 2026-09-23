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

const Header = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const language = useAppSelector((state) => state.language.currentLanguage);
  const user = useAppSelector((state) => state.auth.user);
  const [showLogoutConfirmation, setShowLogoutConfirmation] = useState(false);

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
      <header className="flex items-center justify-between gap-2 pt-4 sm:pt-8">
      {/* Account */}
      <button
        type="button"
        onClick={handleAuthAction}
        aria-label={user ? "Sign out" : "Sign in"}
        className="flex h-11 items-center gap-2 rounded-full bg-white px-3 shadow-sm transition hover:shadow-md sm:h-14 sm:px-4"
      >
        {user ? <FiLogOut size={22} /> : <FiUser size={22} />}
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:inline">
          {user ? user.name || user.email : "Sign in"}
        </span>
      </button>

      {/* History */}
      <button
        type="button"
        onClick={() => navigate("/history")}
        aria-label={t("history")}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition hover:shadow-md sm:h-14 sm:w-14"
      >
        <FiClock size={25} />
      </button>

      {/* Language */}
      <LanguageSelectorSheet language={language} onChange={handleLanguageChange} />

      {/* Settings */}
      <button
        type="button"
        onClick={() => navigate("/settings")}
        aria-label={t("settings")}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition hover:shadow-md sm:h-14 sm:w-14"
      >
        <FiSettings size={26} />
      </button>
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
