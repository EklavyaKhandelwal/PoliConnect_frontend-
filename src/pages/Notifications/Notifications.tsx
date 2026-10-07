import { useCallback, useEffect, useState } from "react";
import {
  FiArrowLeft,
  FiBell,
  FiCheck,
  FiChevronRight,
  FiMessageCircle,
  FiRefreshCw,
} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  getCitizenNotifications,
  markAllCitizenNotificationsRead,
  markCitizenNotificationsRead,
  type CitizenNotification,
} from "../../services/citizenNotifications";
import { useCitizenNotifications } from "../../components/citizenNotificationContext";

type Filter = "all" | "unread";

const typeLabelKey: Record<CitizenNotification["type"], string> = {
  registered: "notifications.events.registered",
  assigned: "notifications.events.assigned",
  status_changed: "notifications.events.status_changed",
  resolved: "notifications.events.resolved",
  rejected: "notifications.events.rejected",
  message: "notifications.events.message",
};

const Notifications = () => {
  const { t, i18n } = useTranslation("common");
  const navigate = useNavigate();
  const { refreshUnreadCount } = useCitizenNotifications();
  const [filter, setFilter] = useState<Filter>("all");
  const [items, setItems] = useState<CitizenNotification[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (nextPage: number, mode: "replace" | "append") => {
    try {
      const response = await getCitizenNotifications(filter, nextPage);
      setItems((current) => mode === "append"
        ? [...current, ...response.notifications]
        : response.notifications);
      setUnreadCount(response.counts.unread);
      setHasMore(response.hasMore);
      setPage(nextPage);
    } catch (requestError) {
      console.error("Could not load citizen notifications:", requestError);
      setError(t("notifications.loadError"));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    let active = true;
    getCitizenNotifications(filter, 1)
      .then((response) => {
        if (!active) return;
        setItems(response.notifications);
        setUnreadCount(response.counts.unread);
        setHasMore(response.hasMore);
        setPage(1);
        setError("");
        setLoading(false);
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        console.error("Could not load citizen notifications:", requestError);
        setError(t("notifications.loadError"));
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, t]);

  const changeFilter = (nextFilter: Filter) => {
    if (nextFilter === filter) return;
    setItems([]);
    setLoading(true);
    setError("");
    setFilter(nextFilter);
  };

  const reload = () => {
    setLoading(true);
    setError("");
    void load(1, "replace");
  };

  const loadMore = () => {
    setLoading(true);
    void load(page + 1, "append");
  };

  const openNotification = async (notification: CitizenNotification) => {
    if (!notification.isRead) {
      try {
        await markCitizenNotificationsRead([notification.id]);
        setItems((current) => current.map((item) =>
          item.id === notification.id ? { ...item, isRead: true } : item,
        ));
        setUnreadCount((count) => Math.max(0, count - 1));
        await refreshUnreadCount();
      } catch (requestError) {
        console.error("Could not mark citizen notification as read:", requestError);
        setError(t("notifications.readError"));
        return;
      }
    }
    navigate(`/my-complaints/${encodeURIComponent(notification.complaintNumber)}`);
  };

  const markAllRead = async () => {
    try {
      await markAllCitizenNotificationsRead();
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
      await refreshUnreadCount();
    } catch (requestError) {
      console.error("Could not mark all citizen notifications as read:", requestError);
      setError(t("notifications.readError"));
    }
  };

  const locale = i18n.resolvedLanguage === "hi"
    ? "hi-IN"
    : i18n.resolvedLanguage === "mr"
      ? "mr-IN"
      : "en-IN";

  return (
    <main className="min-h-dvh bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <div className="mx-auto flex min-h-dvh w-full max-w-[720px] flex-col px-4 pb-8 sm:px-8">
        <header className="flex items-center gap-3 py-4 sm:py-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("back")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm"
          >
            <FiArrowLeft size={22} />
          </button>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <FiBell size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-extrabold sm:text-2xl">{t("notifications.title")}</h1>
            <p className="text-sm text-slate-500">{t("notifications.subtitle", { count: unreadCount })}</p>
          </div>
          <button
            type="button"
            onClick={reload}
            aria-label={t("notifications.refresh")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm"
          >
            <FiRefreshCw size={17} />
          </button>
        </header>

        <div className="mb-4 flex items-center gap-2">
          <div className="flex flex-1 rounded-full bg-white p-1 shadow-sm" role="tablist" aria-label={t("notifications.filters")}>
            {(["all", "unread"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={filter === value}
                onClick={() => changeFilter(value)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-bold transition ${filter === value ? "bg-blue-600 text-white" : "text-slate-600"}`}
              >
                {t(`notifications.filter.${value}`)}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-bold text-blue-700 shadow-sm"
            >
              <FiCheck aria-hidden="true" /> {t("notifications.markAllRead")}
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button type="button" onClick={reload} className="mt-2 font-bold underline">
              {t("notifications.retry")}
            </button>
          </div>
        )}

        <section aria-label={t("notifications.title")} aria-busy={loading} className="space-y-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void openNotification(item)}
              className={`flex w-full items-start gap-3 rounded-3xl border p-4 text-left shadow-sm transition hover:shadow-md ${item.isRead ? "border-white bg-white/90" : "border-blue-200 bg-white"}`}
            >
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${item.type === "message" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"}`}>
                {item.type === "message" ? <FiMessageCircle size={19} /> : <FiBell size={19} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm">{t(typeLabelKey[item.type])}</strong>
                  <span className="shrink-0 text-[11px] text-slate-400">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}
                  </span>
                </span>
                <span className="mt-1 block text-xs font-semibold text-blue-700">
                  {item.complaintNumber} · {t(`problemPhoto.categories.${item.category}`)}
                </span>
                {item.status && (
                  <span className="mt-1 block text-xs text-slate-500">
                    {t(`complaintTracking.status.${item.status}`, { defaultValue: item.status })}
                  </span>
                )}
                {item.message && <span className="mt-2 block line-clamp-2 text-sm leading-5 text-slate-600">{item.message}</span>}
              </span>
              {!item.isRead && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" aria-label={t("notifications.unread")} />}
              <FiChevronRight className="mt-3 shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          ))}
          {!loading && items.length === 0 && !error && (
            <div className="rounded-3xl bg-white px-6 py-12 text-center shadow-sm">
              <FiBell size={30} className="mx-auto text-slate-300" />
              <h2 className="mt-4 font-bold">{t("notifications.emptyTitle")}</h2>
              <p className="mt-2 text-sm text-slate-500">{t("notifications.emptyDescription")}</p>
            </div>
          )}
          {loading && items.length === 0 && (
            <p className="py-10 text-center text-sm text-slate-500" role="status">{t("notifications.loading")}</p>
          )}
          {hasMore && (
            <button
              type="button"
              disabled={loading}
              onClick={loadMore}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-sm disabled:opacity-60"
            >
              {loading ? t("notifications.loading") : t("notifications.loadMore")}
            </button>
          )}
        </section>
      </div>
    </main>
  );
};

export default Notifications;
