import { useState } from "react";
import { FiClipboard } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import type { ComplaintCategory } from "./problemPhotoTypes";
import SubmissionErrorNotice from "./SubmissionErrorNotice";
import { usePhotoPreviewUrls } from "./usePhotoPreviewUrls";

interface ReviewStepProps {
  category: ComplaintCategory;
  details: string;
  photos: File[];
  area: string;
  coordinates: { latitude: number; longitude: number } | null;
  name: string;
  phone: string;
  privateName: boolean;
  usesManualArea: boolean;
  submissionError: boolean;
  retryOnConnection: boolean;
  onRetryOnConnectionChange: (enabled: boolean) => void;
  onRetry: () => void;
  onSubmit: () => void;
  onChangeStep: (step: 1 | 2 | 3 | 4 | 5) => void;
}

const ReviewStep = ({
  category,
  details,
  photos,
  area,
  coordinates,
  name,
  phone,
  privateName,
  usesManualArea,
  submissionError,
  retryOnConnection,
  onRetryOnConnectionChange,
  onRetry,
  onSubmit,
  onChangeStep,
}: ReviewStepProps) => {
  const { t } = useTranslation("common");
  const [confirmed, setConfirmed] = useState(true);
  const photoUrls = usePhotoPreviewUrls(photos);

  return (
    <div className="space-y-4 pt-1">
      {submissionError && (
        <SubmissionErrorNotice
          retryOnConnection={retryOnConnection}
          onRetryOnConnectionChange={onRetryOnConnectionChange}
          onRetry={onRetry}
        />
      )}
      <div className="flex gap-2.5">
        <span className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
          <FiClipboard size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-bold text-blue-800">{t("problemPhoto.stepTitle")}</p>
          <div className="rounded-3xl rounded-tl-md bg-white px-4 py-3.5 text-sm leading-6 text-slate-700 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:text-base">
            {t("problemPhoto.reviewPrompt")}
          </div>
        </div>
      </div>

      <section className="ml-11 divide-y divide-slate-200 rounded-3xl bg-white px-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5">
        <ReviewRow label={t("problemPhoto.review.category")} onChange={() => onChangeStep(1)} changeLabel={t("problemPhoto.change")}>
          {t(`problemPhoto.categories.${category}`)}
        </ReviewRow>
        <ReviewRow label={t("problemPhoto.review.details")} onChange={() => onChangeStep(2)} changeLabel={t("problemPhoto.change")}>
          {details}
        </ReviewRow>
        <ReviewRow label={t("problemPhoto.review.photos")} onChange={() => onChangeStep(3)} changeLabel={t("problemPhoto.change")}>
          {photos.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, index) => photoUrls[index] && (
                <img
                  key={`${photo.name}-${photo.lastModified}-${index}`}
                  src={photoUrls[index]}
                  alt={t("problemPhoto.photoNumber", { number: index + 1 })}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ))}
            </div>
          ) : (
            t("problemPhoto.noPhoto")
          )}
        </ReviewRow>
        <ReviewRow label={t("problemPhoto.review.location")} onChange={() => onChangeStep(4)} changeLabel={t("problemPhoto.change")}>
          {area || (coordinates
            ? t("problemPhoto.locationNameUnavailable")
            : usesManualArea
              ? t("problemPhoto.manualLocationName")
              : t("problemPhoto.locationSummary"))}
        </ReviewRow>
        <ReviewRow label={t("problemPhoto.review.contact")} onChange={() => onChangeStep(5)} changeLabel={t("problemPhoto.change")}>
          {`${name || t("problemPhoto.namePlaceholder")} · ${phone}`}
          {privateName && <span className="mt-1 block text-xs font-normal text-slate-500">{t("problemPhoto.nameIsPrivate")}</span>}
        </ReviewRow>
      </section>

      <label className="ml-11 flex cursor-pointer items-start gap-3 px-1">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600"
        />
        <span>
          <span className="block text-sm text-slate-800">{t("problemPhoto.confirmReview")}</span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">{t("problemPhoto.reviewSubmitHint")}</span>
        </span>
      </label>

      <button
        type="button"
        disabled={!confirmed}
        onClick={onSubmit}
        className="fixed bottom-4 left-1/2 w-[calc(100%-2rem)] max-w-[660px] -translate-x-1/2 rounded-full bg-blue-600 px-5 py-4 text-base font-bold text-white shadow-lg shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {t("problemPhoto.submit")}
      </button>
    </div>
  );
};

const ReviewRow = ({
  label,
  changeLabel,
  onChange,
  children,
}: {
  label: string;
  changeLabel: string;
  onChange: () => void;
  children: React.ReactNode;
}) => (
  <div className="py-3.5">
    <div className="mb-2 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-slate-500">{label}</h2>
      <button type="button" onClick={onChange} className="text-sm font-semibold text-blue-600">
        {changeLabel}
      </button>
    </div>
    <div className="text-sm font-semibold leading-6 text-slate-900">{children}</div>
  </div>
);

export default ReviewStep;
