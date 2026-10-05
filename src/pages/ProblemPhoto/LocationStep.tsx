import { useState } from "react";
import { FiClipboard, FiMapPin } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { reverseGeocode } from "../../services/reverseGeocode";

interface LocationStepProps {
  selectedArea: string;
  hasGpsLocation: boolean;
  onChooseLocation: (latitude: number, longitude: number, area: string) => void;
  onContinue: (usesManualArea: boolean, area?: string) => void;
}

const LocationStep = ({
  selectedArea,
  hasGpsLocation,
  onChooseLocation,
  onContinue,
}: LocationStepProps) => {
  const { t } = useTranslation("common");
  const { i18n: translation } = useTranslation();
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [manualLocation, setManualLocation] = useState(Boolean(selectedArea) && !hasGpsLocation);
  const [area, setArea] = useState(selectedArea);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t("problemPhoto.locationUnavailable"));
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        onChooseLocation(latitude, longitude, "");
        setArea("");
        setManualLocation(false);
        void reverseGeocode(
          latitude,
          longitude,
          translation.resolvedLanguage ?? i18n.resolvedLanguage ?? "en",
        )
          .then((placeName) => {
            setArea(placeName);
            onChooseLocation(latitude, longitude, placeName);
          })
          .catch((error: unknown) => {
            console.error("Failed to find the current location name:", error);
            setLocationError(t("problemPhoto.locationNameError"));
          })
          .finally(() => setIsLocating(false));
      },
      (error) => {
        setIsLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? t("problemPhoto.locationDenied")
            : t("problemPhoto.locationError"),
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-5 pt-1">
      <div className="flex gap-2.5">
        <span className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
          <FiClipboard size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-bold text-blue-800">{t("problemPhoto.stepTitle")}</p>
          <div className="rounded-3xl rounded-tl-md bg-white px-4 py-3.5 text-sm leading-6 text-slate-700 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:text-base">
            {t("problemPhoto.locationQuestion")}
          </div>
        </div>
      </div>

      <section className="ml-11 overflow-hidden rounded-3xl bg-white shadow-[0_5px_16px_rgba(44,79,125,0.10)]">
        <div className="relative h-40 overflow-hidden bg-slate-200 sm:h-48" aria-label={t("problemPhoto.mapPreview")}>
          <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_47%,rgba(255,255,255,0.9)_48%,rgba(255,255,255,0.9)_54%,transparent_55%),linear-gradient(90deg,transparent_58%,rgba(255,255,255,0.9)_59%,rgba(255,255,255,0.9)_65%,transparent_66%)]" />
          <div className="absolute left-[8%] top-[12%] h-16 w-32 rounded-2xl bg-green-100/90 sm:h-20 sm:w-40" />
          <div className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-blue-300/70 bg-blue-200/50">
            <span className="flex h-6 w-6 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow" />
          </div>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <FiMapPin className="mt-1 shrink-0 text-blue-600" size={22} />
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900">
                {t("problemPhoto.locationCardTitle")}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {t("problemPhoto.locationCardDescription")}
              </p>
              {(area.trim() || hasGpsLocation) && (
                <p className="mt-1 text-sm font-semibold text-blue-600">
                  {area.trim() || (isLocating
                    ? t("problemPhoto.findingLocationName")
                    : t("problemPhoto.locationNameUnavailable"))}
                </p>
              )}
            </div>
          </div>

          {(manualLocation || hasGpsLocation) && (
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-slate-600">
                {t(hasGpsLocation && !manualLocation
                  ? "problemPhoto.locationNameLabel"
                  : "problemPhoto.areaPlaceholder")}
              </span>
              <input
                value={area}
                onChange={(event) => setArea(event.target.value)}
                maxLength={150}
                placeholder={t("problemPhoto.areaPlaceholder")}
                className="w-full rounded-xl border border-blue-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </label>
          )}

          {locationError && <p role="alert" className="mt-3 text-sm text-red-600">{locationError}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={requestLocation}
              disabled={isLocating}
              className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {isLocating
                ? t("problemPhoto.locating")
                : hasGpsLocation
                  ? t("problemPhoto.refreshLocation")
                  : t("problemPhoto.getCurrentLocation")}
            </button>
            <button
              type="button"
              onClick={() => {
                if (manualLocation && area.trim()) {
                  onContinue(true, area.trim());
                  return;
                }
                setManualLocation((isOpen) => !isOpen);
              }}
              className="rounded-full border-2 border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600"
            >
              {manualLocation && area.trim()
                ? t("problemPhoto.useSelectedArea")
                : t("problemPhoto.chooseArea")}
            </button>
            {hasGpsLocation && !manualLocation && (
              <button
                type="button"
                onClick={() => onContinue(false, area.trim())}
                disabled={!area.trim() || isLocating}
                className="rounded-full border-2 border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600"
              >
                {t("problemPhoto.confirmLocation")}
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {t("problemPhoto.locationLookupPrivacy")}{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
              className="font-semibold underline"
            >
              OpenStreetMap
            </a>
          </p>
        </div>
      </section>
    </div>
  );
};

export default LocationStep;
