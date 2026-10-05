import { FiClipboard, FiMic } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import type { ComplaintCategory } from "./problemPhotoTypes";

interface DetailsStepProps {
  category: ComplaintCategory;
  details: string;
  detailsSent: boolean;
  onContinue: () => void;
  onEdit: () => void;
}

const AssistantMessage = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation("common");

  return (
    <div className="flex gap-2.5">
      <span className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
        <FiClipboard size={19} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="mb-2 text-sm font-bold text-blue-800">{t("problemPhoto.stepTitle")}</p>
        {children}
      </div>
    </div>
  );
};

const DetailsStep = ({ category, details, detailsSent, onContinue, onEdit }: DetailsStepProps) => {
  const { t } = useTranslation("common");

  return (
    <div className="space-y-5 pt-1">
      <div className="flex justify-end">
        <div className="max-w-[82%]">
          <div className="rounded-3xl rounded-br-md bg-blue-600 px-5 py-3 text-base font-medium text-white shadow-sm">
            {t(`problemPhoto.categories.${category}`)}
          </div>
          <p className="mt-1.5 text-right text-xs text-slate-500">
            {t("problemPhoto.messageTime", { time: "10:12" })}{" "}
            <span aria-label={t("problemPhoto.sent")}>✓✓</span>
          </p>
        </div>
      </div>

      <AssistantMessage>
        <div className="rounded-3xl rounded-tl-md bg-white px-4 py-3.5 text-sm leading-6 text-slate-700 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:text-base">
          {t("problemPhoto.detailsQuestion")}
          {category === "other" && (
            <span className="mt-2 block text-slate-600">{t("problemPhoto.otherDetailsQuestion")}</span>
          )}
        </div>
        <div className="mt-3 flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500">
            <FiMic size={14} />
            {t("problemPhoto.speakPrompt")}
          </span>
        </div>
      </AssistantMessage>

      {detailsSent && (
        <>
          <div className="flex justify-end">
            <div className="max-w-[90%]">
              <p className="whitespace-pre-wrap rounded-3xl rounded-br-md bg-blue-600 px-4 py-3 text-sm leading-6 text-white shadow-sm sm:px-5 sm:text-base">
                {details}
              </p>
              <p className="mt-1.5 text-right text-xs text-slate-500">
                {t("problemPhoto.messageTime", { time: "10:13" })}{" "}
                <span aria-label={t("problemPhoto.sent")}>✓✓</span>
              </p>
            </div>
          </div>

          <AssistantMessage>
            <div className="rounded-3xl rounded-tl-md bg-white px-4 py-3.5 text-sm text-slate-700 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:text-base">
              {t("problemPhoto.confirmDetails")}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onContinue}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm"
              >
                {t("problemPhoto.confirmYes")}
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="rounded-full border-2 border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600"
              >
                {t("problemPhoto.confirmEdit")}
              </button>
            </div>
          </AssistantMessage>
        </>
      )}
    </div>
  );
};

export default DetailsStep;
