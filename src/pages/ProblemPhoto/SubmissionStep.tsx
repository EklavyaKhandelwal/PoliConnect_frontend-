import { useState } from "react";
import { FiCheck, FiClock, FiCopy } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import type { ComplaintStatus } from "../../services/complaints";

interface SubmissionStepProps {
  ticketNumber: string;
  status: ComplaintStatus;
  onNewComplaint: () => void;
}

const SubmissionStep = ({ ticketNumber, status, onNewComplaint }: SubmissionStepProps) => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const copyTicket = async () => {
    try {
      await navigator.clipboard.writeText(ticketNumber);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div className="space-y-6 pb-24 pt-6">
      <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-emerald-100">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <FiCheck size={54} strokeWidth={2.5} />
        </span>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
          {t("problemPhoto.successTitle")}
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
          {t("problemPhoto.successDescription")}
        </p>
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-6">
        <p className="text-sm font-semibold text-slate-500">{t("problemPhoto.ticketNumber")}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-2xl font-extrabold tracking-wide text-slate-900 sm:text-3xl">{ticketNumber}</p>
          <button
            type="button"
            onClick={() => void copyTicket()}
            className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700"
          >
            <FiCopy size={17} />
            {copied ? t("problemPhoto.copied") : t("problemPhoto.copyTicket")}
          </button>
        </div>
        {copyError && <p role="alert" className="mt-2 text-sm text-red-600">{t("problemPhoto.copyFailed")}</p>}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4">
          <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
            {t(`problemPhoto.status.${status}`)}
          </span>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
            <FiClock size={18} />
            {t("problemPhoto.responseTime")}
          </span>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-6">
        <h3 className="mb-5 text-lg font-bold text-slate-900">{t("problemPhoto.nextStepsTitle")}</h3>
        <ol className="space-y-5">
          {(["received", "verification", "updates"] as const).map((item, index) => (
            <li key={item} className="flex gap-4">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${index === 0 ? "border-blue-600 bg-blue-600 text-white" : "border-blue-300 text-blue-600"}`}>
                {index + 1}
              </span>
              <div>
                <p className="font-bold text-slate-900">{t(`problemPhoto.nextSteps.${item}.title`)}</p>
                <p className="mt-1 text-sm text-slate-500">{t(`problemPhoto.nextSteps.${item}.description`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => navigate("/my-complaints")}
          className="rounded-full bg-blue-600 px-5 py-4 text-base font-bold text-white shadow-lg shadow-blue-200"
        >
          {t("problemPhoto.trackTicket")}
        </button>
        <button
          type="button"
          onClick={onNewComplaint}
          className="rounded-full border border-blue-100 bg-white px-5 py-4 text-base font-bold text-slate-900 shadow-sm"
        >
          {t("problemPhoto.newComplaint")}
        </button>
      </div>
    </div>
  );
};

export default SubmissionStep;
