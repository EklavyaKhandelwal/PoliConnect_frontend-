import { useState } from "react";
import { FiClipboard } from "react-icons/fi";
import { useTranslation } from "react-i18next";

interface ContactStepProps {
  usesManualArea: boolean;
  name: string;
  phone: string;
  privateName: boolean;
  onNameChange: (name: string) => void;
  onPhoneChange: (phone: string) => void;
  onPrivateNameChange: (privateName: boolean) => void;
  onContinue: () => void;
}

const ContactStep = ({
  usesManualArea,
  name,
  phone,
  privateName,
  onNameChange,
  onPhoneChange,
  onPrivateNameChange,
  onContinue,
}: ContactStepProps) => {
  const { t } = useTranslation("common");
  const [phoneError, setPhoneError] = useState(false);

  const continueWithContact = () => {
    const digitCount = phone.replace(/\D/g, "").length;
    if (digitCount !== 10) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    onContinue();
  };

  return (
    <div className="space-y-5 pt-1">
      <div className="flex justify-end">
        <div className="max-w-[82%]">
          <div className="rounded-3xl rounded-br-md bg-blue-600 px-5 py-3 text-base font-medium text-white shadow-sm">
            {t(usesManualArea ? "problemPhoto.useSelectedArea" : "problemPhoto.useCurrentLocation")}
          </div>
          <p className="mt-1.5 text-right text-xs text-slate-500">
            {t("problemPhoto.messageTime", { time: "10:14" })}{" "}
            <span aria-label={t("problemPhoto.sent")}>✓✓</span>
          </p>
        </div>
      </div>

      <div className="flex gap-2.5">
        <span className="mt-7 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white">
          <FiClipboard size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-bold text-blue-800">{t("problemPhoto.stepTitle")}</p>
          <div className="rounded-3xl rounded-tl-md bg-white px-4 py-3.5 text-sm leading-6 text-slate-700 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:px-5 sm:text-base">
            {t("problemPhoto.contactQuestion")}
          </div>
        </div>
      </div>

      <section className="ml-11 space-y-4 rounded-3xl bg-white p-4 shadow-[0_5px_16px_rgba(44,79,125,0.10)] sm:p-5">
        <div>
          <label htmlFor="problem-photo-phone" className="mb-2 block text-sm font-semibold text-slate-500">
            {t("problemPhoto.phoneLabel")}
          </label>
          <div className="flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 sm:px-4">
            <input
              id="problem-photo-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => {
                onPhoneChange(event.target.value);
                setPhoneError(false);
              }}
              maxLength={20}
              className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none"
              placeholder={t("problemPhoto.phonePlaceholder")}
              aria-invalid={phoneError}
            />
          </div>
          {phoneError && <p role="alert" className="mt-1 text-sm text-red-600">{t("problemPhoto.phoneInvalid")}</p>}
        </div>

        <div>
          <label htmlFor="problem-photo-name" className="mb-2 block text-sm font-semibold text-slate-500">
            {t("problemPhoto.nameLabel")}
          </label>
          <input
            id="problem-photo-name"
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            maxLength={100}
            placeholder={t("problemPhoto.namePlaceholder")}
            className="min-h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 text-base font-semibold text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 sm:px-4"
          />
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <div>
            <p className="font-bold text-slate-900">{t("problemPhoto.keepNamePrivate")}</p>
            <p className="mt-1 text-sm leading-5 text-slate-500">
              {t("problemPhoto.privacyDescription")}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={privateName}
            aria-label={t("problemPhoto.keepNamePrivate")}
            onClick={() => onPrivateNameChange(!privateName)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${privateName ? "bg-blue-600" : "bg-slate-300"}`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${privateName ? "right-1" : "left-1"}`}
            />
          </button>
        </div>
      </section>

      <div className="ml-11">
        <button
          type="button"
          onClick={continueWithContact}
          className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
        >
          {t("problemPhoto.continue")}
        </button>
      </div>
    </div>
  );
};

export default ContactStep;
