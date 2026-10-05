import { useState } from "react";
import { FiArrowLeft, FiMic } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import SuggestionTypeSelector, { type SuggestionType } from "./SuggestionTypeSelector";
import SuggestionSuccess from "./SuggestionSuccess";
import { createSuggestion, type SuggestionRecord } from "../../services/suggestions";

const MAX_MESSAGE_LENGTH = 500;

const SuggestionThanks = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const [type, setType] = useState<SuggestionType>("suggestion");
  const [message, setMessage] = useState("");
  const [keepNamePrivate, setKeepNamePrivate] = useState(false);
  const [submission, setSubmission] = useState<SuggestionRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const submitSuggestion = async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(false);
    try {
      setSubmission(await createSuggestion({
        type,
        message: trimmedMessage,
        keepNamePrivate,
      }));
    } catch (error) {
      console.error("Suggestion submission failed:", error);
      setSubmitError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submission) {
    return (
      <SuggestionSuccess
        submission={submission}
        onSendAnother={() => {
          setSubmission(null);
          setMessage("");
          setType("suggestion");
          setKeepNamePrivate(false);
          setSubmitError(false);
        }}
      />
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <header className="border-b border-blue-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label={t("back")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
          >
            <FiArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold sm:text-xl">{t("suggestionThanks.title")}</h1>
            <p className="text-xs text-slate-500 sm:text-sm">{t("suggestionThanks.subtitle")}</p>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-5 sm:space-y-6 sm:px-6 sm:py-7">
        <p className="text-sm leading-6 text-slate-600 sm:text-base sm:leading-7">
          {t("suggestionThanks.intro")}
        </p>

        <SuggestionTypeSelector selected={type} onChange={setType} />

        <div>
          <label htmlFor="suggestion-message" className="mb-3 block text-sm font-bold text-slate-500">
            {t("suggestionThanks.messagePrompt")}
          </label>
          <div className="relative rounded-3xl border-2 border-blue-500 bg-white p-4 pb-12">
            <textarea
              id="suggestion-message"
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              maxLength={MAX_MESSAGE_LENGTH}
              placeholder={t("suggestionThanks.placeholder")}
              className="min-h-24 w-full resize-none bg-transparent text-sm leading-6 text-slate-800 outline-none placeholder:text-slate-400 sm:min-h-28 sm:text-base"
            />
            <span className="absolute bottom-4 left-4 text-xs text-slate-500">
              {t("suggestionThanks.characterCount", {
                count: message.length,
                max: MAX_MESSAGE_LENGTH,
              })}
            </span>
            <button
              type="button"
              aria-label={t("suggestionThanks.speak")}
              className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-600"
            >
              <FiMic size={20} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{t("suggestionThanks.keepNamePrivate")}</p>
            <p className="mt-1 text-xs text-slate-500">{t("suggestionThanks.privacyDescription")}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={keepNamePrivate}
            aria-label={t("suggestionThanks.keepNamePrivate")}
            onClick={() => setKeepNamePrivate((isPrivate) => !isPrivate)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
              keepNamePrivate ? "bg-blue-600" : "bg-slate-300"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                keepNamePrivate ? "right-1" : "left-1"
              }`}
            />
          </button>
        </div>
      </section>

      <footer className="border-t border-blue-100 bg-white px-4 py-3 sm:px-6 sm:py-4">
        <div className="mx-auto max-w-2xl">
          {submitError && (
            <p role="alert" className="mb-3 text-center text-sm text-red-700">
              {t("suggestionThanks.submitError")}
            </p>
          )}
          <button
            type="button"
            onClick={() => void submitSuggestion()}
            disabled={!message.trim() || isSubmitting}
            className="w-full rounded-full bg-blue-600 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? t("suggestionThanks.sending") : t("suggestionThanks.send")}
          </button>
          <p className="mt-2 text-center text-xs text-slate-500 sm:text-sm">
            {t("suggestionThanks.footerNote")}
          </p>
        </div>
      </footer>
    </main>
  );
};

export default SuggestionThanks;
