import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheck, FiChevronDown, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

import { supportedLanguages, type SupportedLanguage } from "../config/supportedLanguages";
import type { Language } from "../store/slices/languageSlice";

interface LanguageSelectorSheetProps {
  language: Language;
  onChange: (language: Language) => void;
  compact?: boolean;
  unified?: boolean;
}

const LanguageSelectorSheet = ({
  language,
  onChange,
  compact = false,
  unified = false,
}: LanguageSelectorSheetProps) => {
  const { t } = useTranslation("common");
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const selectedLanguage = supportedLanguages.find((item) => item.code === language) ?? supportedLanguages[0];

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [isOpen]);

  const selectLanguage = (item: SupportedLanguage) => {
    onChange(item.code);
    setIsOpen(false);
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={t("voice.selectLanguage")}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center rounded-xl font-semibold transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 ${
          unified
            ? "h-9 gap-1.5 px-2 text-xs text-slate-700 sm:h-10 sm:gap-2 sm:px-3 sm:text-sm"
            : `gap-3 rounded-full bg-white shadow-sm hover:shadow-md ${
                compact ? "h-11 px-3 text-xs" : "h-11 px-3 text-sm sm:h-14 sm:px-5 sm:text-base"
              }`
        }`}
      >
        <span className={`shrink-0 rounded-full bg-blue-500 ${unified ? "h-2.5 w-2.5" : "h-3 w-3"}`} />
        <span>{selectedLanguage.nativeName}</span>
        <FiChevronDown size={unified ? 16 : compact ? 18 : 20} />
      </button>

      {isOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="language-sheet-title"
            className="max-h-[min(82dvh,44rem)] w-full overflow-y-auto rounded-t-[1.75rem] border border-white bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] animate-in slide-in-from-bottom duration-200 sm:max-w-lg sm:rounded-[1.75rem] sm:px-7 sm:pb-7 sm:pt-6 sm:animate-in sm:zoom-in-95"
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="language-sheet-title" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                  {t("languageSheet.title")}
                </h2>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">{t("languageSheet.subtitle")}</p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t("close")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
              {supportedLanguages.map((item) => {
                const selected = item.code === language;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => selectLanguage(item)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-5 sm:py-4 ${
                      selected
                        ? "border-blue-500 bg-blue-50/80"
                        : "border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50"
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
        </div>,
        document.body,
      )}
    </>
  );
};

export default LanguageSelectorSheet;
