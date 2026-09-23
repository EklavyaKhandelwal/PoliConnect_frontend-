import { FiCamera, FiMic } from "react-icons/fi";
import { MdKeyboard } from "react-icons/md";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../hooks/redux";
import { clearChat } from "../store/slices/chatSlice";
import ConfirmationSheet from "./ConfirmationSheet";
import { useState } from "react";

interface InputActionsProps {
  onMicClick?: () => void;
}

const InputActions = ({ onMicClick }: InputActionsProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [showComingSoon, setShowComingSoon] = useState(false);

  return (
    <>
      <div className="flex items-end justify-center gap-14 pb-6 sm:gap-24 sm:pb-8 lg:gap-32">
      {/* Photo */}
      <button
        type="button"
        onClick={() => setShowComingSoon(true)}
        aria-label={t("home.photo")}
        className="group flex flex-col items-center gap-2 focus:outline-none"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition-all duration-200 group-hover:border-blue-200 group-hover:bg-blue-50 group-active:scale-95 sm:h-16 sm:w-16">
          <FiCamera
            size={26}
            className="text-slate-700 transition-colors duration-200 group-hover:text-blue-600"
          />
        </span>

        <span className="text-sm font-medium text-slate-600 transition-colors duration-200 group-hover:text-blue-600">
          {t("home.photo")}
        </span>
      </button>

      {/* Microphone */}
      <button
        type="button"
        onClick={onMicClick}
        aria-label="Ask using microphone"
        className="group flex h-20 w-20 items-center justify-center rounded-full bg-blue-600 shadow-xl shadow-blue-200 transition-all duration-200 hover:scale-105 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-300 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200 sm:h-24 sm:w-24"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-white transition-transform duration-200 group-hover:scale-105 sm:h-16 sm:w-16">
          <FiMic
            size={30}
            className="text-white"
          />
        </span>
      </button>

      {/* Keyboard */}
      <button
        type="button"
        onClick={() => {
          dispatch(clearChat());
          navigate("/chat", { state: null });
        }}
        aria-label={t("home.type")}
        className="group flex flex-col items-center gap-2 focus:outline-none"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-slate-50 transition-all duration-200 group-hover:border-blue-200 group-hover:bg-blue-50 group-active:scale-95 sm:h-16 sm:w-16">
          <MdKeyboard
            size={26}
            className="text-slate-700 transition-colors duration-200 group-hover:text-blue-600"
          />
        </span>

        <span className="text-sm font-medium text-slate-600 transition-colors duration-200 group-hover:text-blue-600">
          {t("home.type")}
        </span>
      </button>
      </div>
      <ConfirmationSheet
        open={showComingSoon}
        title={t("home.photoComingSoonTitle")}
        message={t("home.photoComingSoonMessage")}
        confirmLabel={t("ok")}
        cancelLabel={t("close")}
        onConfirm={() => setShowComingSoon(false)}
        onCancel={() => setShowComingSoon(false)}
      />
    </>
  );
};

export default InputActions;