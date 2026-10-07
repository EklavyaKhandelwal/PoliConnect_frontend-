import { FiBell } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCitizenNotifications } from "./citizenNotificationContext";

const CitizenNotificationBell = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { unreadCount } = useCitizenNotifications();

  return (
    <button
      type="button"
      onClick={() => navigate("/notifications")}
      aria-label={unreadCount ? t("notifications.unreadLabel", { count: unreadCount }) : t("notifications.title")}
      className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:h-11 sm:w-11"
    >
      <FiBell size={23} />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
        >
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default CitizenNotificationBell;
