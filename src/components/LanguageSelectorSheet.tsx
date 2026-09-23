import { useEffect, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { supportedLanguages, type SupportedLanguage } from "../config/supportedLanguages";
import type { Language } from "../store/slices/languageSlice";

interface LanguageSelectorSheetProps {
  language: Language;
  onChange: (language: Language) => void;
  compact?: boolean;
}

const LanguageSelectorSheet = ({
  language,
  onChange,
  compact = false,
}: LanguageSelectorSheetProps) => {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const selectedLanguage = supportedLanguages.find((item) => item.code === language) ?? supportedLanguages[0];

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const selectLanguage = (item: SupportedLanguage) => {
    onChange(item.code);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("voice.selectLanguage")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center gap-3 rounded-full bg-white font-semibold shadow-sm transition hover:shadow-md active:scale-95 ${
          compact ? "h-11 px-3 text-xs" : "h-11 px-3 text-sm sm:h-14 sm:px-5 sm:text-base"
        }`}
      >
        <span className="h-3 w-3 rounded-full bg-blue-500" />
        <span>{selectedLanguage.nativeName}</span>
        <FiChevronDown size={compact ? 18 : 20} />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-slate-900/40"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-sheet-title"
            className="max-h-[82dvh] w-full overflow-y-auto rounded-t-[1.5rem] bg-white px-4 pb-5 pt-3 shadow-2xl animate-in slide-in-from-bottom duration-200 sm:rounded-t-[2rem] sm:px-6 sm:pb-8 sm:pt-4"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 sm:mb-6 sm:w-16" />
            <h2 id="language-sheet-title" className="text-xl font-bold text-slate-900 sm:text-2xl">
              {t("languageSheet.title")}
            </h2>
            <p className="mt-1 text-sm text-slate-500 sm:mt-2 sm:text-base">{t("languageSheet.subtitle")}</p>

            <div className="mt-4 space-y-2 sm:mt-6 sm:space-y-3">
              {supportedLanguages.map((item) => {
                const selected = item.code === language;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => selectLanguage(item)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition sm:rounded-3xl sm:border-2 sm:px-6 sm:py-4 ${
                      selected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-blue-200"
                    }`}
                  >
                    <span>
                      <span className={`block text-base font-bold sm:text-xl ${selected ? "text-blue-600" : "text-slate-900"}`}>
                        {item.nativeName}
                      </span>
                      <span className="mt-1 block text-sm text-slate-500">{item.name}</span>
                    </span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full border-3 sm:h-9 sm:w-9 sm:border-4 ${
                        selected ? "border-blue-500 bg-blue-500" : "border-slate-300"
                      }`}
                    >
                      {selected && <FiCheck className="text-white" size={18} />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </>
  );
};

export default LanguageSelectorSheet;
