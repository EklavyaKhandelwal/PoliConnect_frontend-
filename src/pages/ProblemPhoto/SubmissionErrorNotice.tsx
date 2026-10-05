import { FiAlertCircle, FiPhone } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface SubmissionErrorNoticeProps {
  retryOnConnection: boolean;
  onRetryOnConnectionChange: (enabled: boolean) => void;
  onRetry: () => void;
}

const SubmissionErrorNotice = ({
  retryOnConnection,
  onRetryOnConnectionChange,
  onRetry,
}: SubmissionErrorNoticeProps) => {
  const { t } = useTranslation("common");

  return (
    <div className="mb-4 space-y-3" role="alert">
      <section className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-800">
        <div className="flex items-start gap-3">
          <FiAlertCircle className="mt-0.5 shrink-0 text-red-600" size={22} />
          <div>
            <h2 className="font-bold">{t("problemPhoto.submitFailedTitle")}</h2>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">
              {t("problemPhoto.submitFailedDescription")}
            </p>
          </div>
        </div>
      </section>

      <a
        href="tel:1800180XXXX"
        className="flex items-center gap-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600"
      >
        <FiPhone className="shrink-0 text-blue-600" size={19} />
        <span>
          {t("problemPhoto.noInternet")}{" "}
          <strong className="text-blue-600">{t("problemPhoto.helpline")}</strong>
        </span>
      </a>

      <div className="flex items-center justify-between gap-4 rounded-2xl bg-white px-4 py-3 shadow-sm">
        <span className="text-sm font-semibold text-slate-800">
          {t("problemPhoto.retryWhenOnline")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={retryOnConnection}
          aria-label={t("problemPhoto.retryWhenOnline")}
          onClick={() => onRetryOnConnectionChange(!retryOnConnection)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${retryOnConnection ? "bg-blue-600" : "bg-slate-300"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${retryOnConnection ? "right-1" : "left-1"}`}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={onRetry}
        className="w-full rounded-full bg-blue-600 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-200"
      >
        {t("problemPhoto.retrySubmit")}
      </button>
    </div>
  );
};

export default SubmissionErrorNotice;
