import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { FiArrowLeft, FiCamera, FiClipboard, FiMic, FiSend, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import i18n from "../../i18n";
import CategoryStep from "./CategoryStep";
import ContactStep from "./ContactStep";
import DetailsStep from "./DetailsStep";
import LocationStep from "./LocationStep";
import PhotoAttachments from "./PhotoAttachments";
import PhotoStep from "./PhotoStep";
import ReviewStep from "./ReviewStep";
import SubmissionStep from "./SubmissionStep";
import type { ComplaintCategory } from "./problemPhotoTypes";
import { createComplaint, type ComplaintStatus } from "../../services/complaints";

type ComplaintStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface BrowserSpeechResult {
  0: { transcript: string };
}

interface BrowserSpeechEvent {
  results: ArrayLike<BrowserSpeechResult>;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
}

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const ProblemPhoto = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath =
    typeof location.state === "object" &&
    location.state !== null &&
    "from" in location.state &&
    (
      location.state.from === "/" ||
      location.state.from === "/complaint-center" ||
      location.state.from === "/my-complaints"
    )
      ? location.state.from
      : "/";
  const [step, setStep] = useState<ComplaintStep>(1);
  const [selectedCategory, setSelectedCategory] = useState<ComplaintCategory | null>(null);
  const [details, setDetails] = useState("");
  const [detailsSent, setDetailsSent] = useState(false);
  const [composerText, setComposerText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [usesManualArea, setUsesManualArea] = useState(false);
  const [area, setArea] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [privateName, setPrivateName] = useState(false);
  const [ticketNumber, setTicketNumber] = useState("");
  const [ticketStatus, setTicketStatus] = useState<ComplaintStatus>("received");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(false);
  const [retryOnConnection, setRetryOnConnection] = useState(true);
  const cameraInput = useRef<HTMLInputElement>(null);
  const composerInput = useRef<HTMLTextAreaElement>(null);
  const nativeSpeechListener = useRef<PluginListenerHandle | null>(null);
  const browserSpeechRecognition = useRef<BrowserSpeechRecognition | null>(null);
  const language = i18n.resolvedLanguage ?? i18n.language;
  const speechLanguage = language.startsWith("hi")
    ? "hi-IN"
    : language.startsWith("mr")
      ? "mr-IN"
      : "en-IN";

  const stopDictation = useCallback(async () => {
    if (browserSpeechRecognition.current) {
      browserSpeechRecognition.current.onend = null;
      browserSpeechRecognition.current.stop();
      browserSpeechRecognition.current = null;
    }
    if (nativeSpeechListener.current) {
      const listener = nativeSpeechListener.current;
      nativeSpeechListener.current = null;
      try {
        await SpeechRecognition.stop();
      } catch (error) {
        console.error("Could not stop complaint voice input:", error);
      }
      await listener.remove();
    }
    setIsListening(false);
  }, []);

  const startDictation = useCallback(async () => {
    setVoiceError("");
    try {
      if (Capacitor.isNativePlatform()) {
        const availability = await SpeechRecognition.available();
        if (!availability.available) {
          setVoiceError(t("problemPhoto.voiceUnavailable"));
          return;
        }
        const permission = await SpeechRecognition.requestPermissions();
        if (permission.speechRecognition !== "granted") {
          setVoiceError(t("problemPhoto.voicePermissionDenied"));
          return;
        }

        nativeSpeechListener.current = await SpeechRecognition.addListener(
          "partialResults",
          (event) => {
            const transcript = event.matches?.[0]?.trim();
            if (transcript) setComposerText(transcript.slice(0, 2000));
          },
        );
        await SpeechRecognition.start({
          language: speechLanguage,
          maxResults: 1,
          partialResults: true,
          popup: false,
        });
        setIsListening(true);
        return;
      }

      const speechWindow = window as SpeechRecognitionWindow;
      const SpeechRecognitionConstructor =
        speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
      if (!SpeechRecognitionConstructor) {
        setVoiceError(t("problemPhoto.voiceUnavailable"));
        return;
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = speechLanguage;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join(" ")
          .trim();
        if (transcript) setComposerText(transcript.slice(0, 2000));
      };
      recognition.onerror = (event) => {
        console.error("Complaint voice input failed:", event.error);
        setVoiceError(t("problemPhoto.voiceError"));
        setIsListening(false);
        browserSpeechRecognition.current = null;
      };
      recognition.onend = () => {
        setIsListening(false);
        browserSpeechRecognition.current = null;
      };
      browserSpeechRecognition.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Could not start complaint voice input:", error);
      setVoiceError(t("problemPhoto.voiceError"));
      setIsListening(false);
      browserSpeechRecognition.current = null;
      if (nativeSpeechListener.current) {
        const listener = nativeSpeechListener.current;
        nativeSpeechListener.current = null;
        await listener.remove();
      }
    }
  }, [speechLanguage, t]);

  useEffect(
    () => () => {
      browserSpeechRecognition.current?.stop();
      if (nativeSpeechListener.current) {
        const listener = nativeSpeechListener.current;
        nativeSpeechListener.current = null;
        void SpeechRecognition.stop()
          .catch((error: unknown) => {
            console.error("Could not stop complaint voice input during cleanup:", error);
          })
          .finally(() => listener.remove());
      }
    },
    [],
  );

  useLayoutEffect(() => {
    const textarea = composerInput.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const maxHeight = Math.round(window.innerHeight * 0.35);
    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [composerText]);

  const selectCategory = (category: ComplaintCategory) => {
    setSelectedCategory(category);
    setDetails("");
    setDetailsSent(false);
    setComposerText("");
    setVoiceError("");
    setStep(2);
  };

  const submitComposer = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const message = composerText.trim();
    if (!message) return;
    setVoiceError("");

    if (step === 1) {
      setSelectedCategory("other");
      setDetails(message);
      setDetailsSent(true);
      setComposerText("");
      setStep(2);
      return;
    }
    if (step === 2) {
      setDetails(message);
      setDetailsSent(true);
      setComposerText("");
    }
  };

  const submitComplaint = useCallback(async () => {
    if (isSubmitting || !selectedCategory) return;

    setIsSubmitting(true);
    setSubmissionError(false);
    try {
      const complaint = await createComplaint({
        category: selectedCategory,
        details,
        photos,
        coordinates,
        area,
        name: contactName,
        phone: contactPhone,
        privateName,
      });
      setTicketNumber(complaint.complaintNumber);
      setTicketStatus(complaint.status);
      setStep(7);
    } catch (error) {
      console.error("Complaint submission failed:", error);
      setSubmissionError(true);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    area,
    contactName,
    contactPhone,
    coordinates,
    details,
    isSubmitting,
    photos,
    privateName,
    selectedCategory,
  ]);

  useEffect(() => {
    if (step !== 6 || !submissionError || !retryOnConnection) return;

    const retryWhenOnline = () => submitComplaint();
    window.addEventListener("online", retryWhenOnline);
    return () => window.removeEventListener("online", retryWhenOnline);
  }, [step, submissionError, retryOnConnection, submitComplaint]);

  const goBack = () => {
    if (step > 1) {
      setStep((currentStep) => (currentStep - 1) as ComplaintStep);
      if (step === 2) setSelectedCategory(null);
      return;
    }
    navigate(returnPath);
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[700px] flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white text-slate-900">
      <header className="border-b border-blue-100 bg-white px-3 pb-2 pt-2 shadow-sm sm:px-5 sm:pb-3 sm:pt-3">
        <div className="mx-auto flex w-full items-center gap-2">
          <button
            type="button"
            onClick={goBack}
            aria-label={t("back")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-slate-100 active:scale-95"
          >
            <FiArrowLeft size={24} />
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-700 text-white sm:h-12 sm:w-12">
            <FiClipboard size={22} strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold sm:text-lg">{t("problemPhoto.title")}</h1>
            <p className="truncate text-[11px] font-semibold text-blue-600 sm:text-xs">
              {t("problemPhoto.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate(returnPath)}
            aria-label={t("close")}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white shadow-sm transition hover:bg-slate-50 active:scale-95"
          >
            <FiX size={24} />
          </button>
        </div>
        <div className="mx-auto mt-2 w-full" aria-label={t("problemPhoto.progressLabel")}>
          <p className="mb-2 text-xs font-semibold text-slate-500 sm:text-sm">
            {t(`problemPhoto.progress.${step}`)}
          </p>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className={`h-1 flex-1 rounded-full ${index < step ? "bg-blue-600" : "bg-blue-200"}`}
              />
            ))}
          </div>
        </div>
      </header>

      <input
        ref={cameraInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const selectedFiles = Array.from(event.currentTarget.files ?? [])
            .filter((file) => SUPPORTED_IMAGE_TYPES.has(file.type) && file.size <= 5 * 1024 * 1024);
          setPhotos((currentPhotos) => [...currentPhotos, ...selectedFiles].slice(0, 4));
          event.currentTarget.value = "";
        }}
      />

      <section className="mx-auto w-full flex-1 px-3 py-4 sm:px-6 sm:py-5">
        {step === 1 && (
          <CategoryStep
            onSelect={selectCategory}
          />
        )}
        {step === 2 && selectedCategory && (
          <DetailsStep
            category={selectedCategory}
            details={details}
            detailsSent={detailsSent}
            onContinue={() => setStep(3)}
            onEdit={() => {
              setDetailsSent(false);
              setComposerText(details);
              window.requestAnimationFrame(() => composerInput.current?.focus());
            }}
          />
        )}
        {step === 3 && selectedCategory && (
          <PhotoStep
            files={photos}
            onFilesChange={setPhotos}
            onContinue={() => setStep(4)}
          />
        )}
        {step === 4 && (
          <>
            <PhotoAttachments photos={photos} />
            <LocationStep
              selectedArea={area}
              hasGpsLocation={Boolean(coordinates)}
              onChooseLocation={(latitude, longitude, placeName) => {
                setCoordinates({ latitude, longitude });
                setArea(placeName);
                setUsesManualArea(false);
              }}
              onContinue={(manualArea, selectedArea) => {
                setUsesManualArea(manualArea);
                setArea(selectedArea ?? "");
                if (manualArea) setCoordinates(null);
                setStep(5);
              }}
            />
          </>
        )}
        {step === 5 && (
          <ContactStep
            usesManualArea={usesManualArea}
            name={contactName}
            phone={contactPhone}
            privateName={privateName}
            onNameChange={setContactName}
            onPhoneChange={setContactPhone}
            onPrivateNameChange={setPrivateName}
            onContinue={() => setStep(6)}
          />
        )}
        {step === 6 && selectedCategory && (
          <ReviewStep
            category={selectedCategory}
            details={details}
            photos={photos}
            area={area}
            coordinates={coordinates}
            name={contactName}
            phone={contactPhone}
            privateName={privateName}
            usesManualArea={usesManualArea}
            submissionError={submissionError}
            retryOnConnection={retryOnConnection}
            onRetryOnConnectionChange={setRetryOnConnection}
            onRetry={submitComplaint}
            onChangeStep={setStep}
            onSubmit={submitComplaint}
          />
        )}
        {step === 7 && (
          <SubmissionStep
            ticketNumber={ticketNumber}
            status={ticketStatus}
            onNewComplaint={() => {
              setStep(1);
              setSelectedCategory(null);
              setDetails("");
              setDetailsSent(false);
              setComposerText("");
              setPhotos([]);
              setCoordinates(null);
              setUsesManualArea(false);
              setArea("");
              setContactName("");
              setContactPhone("");
              setPrivateName(false);
              setTicketNumber("");
              setTicketStatus("received");
              setSubmissionError(false);
              setRetryOnConnection(true);
            }}
          />
        )}
      </section>

      {(step === 1 || step === 2) && (
        <footer className="border-t border-blue-100 bg-white px-3 py-2.5 sm:px-5 sm:py-3">
          <form onSubmit={submitComposer} className="mx-auto flex w-full items-center gap-2">
            <button
              type="button"
              onClick={() => cameraInput.current?.click()}
              aria-label={t("problemPhoto.takePhoto")}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-slate-50 text-slate-700 shadow-sm sm:h-12 sm:w-12"
            >
              <FiCamera size={23} />
            </button>
            <div className="flex min-h-10 min-w-0 flex-1 items-center justify-between gap-2 rounded-full border-2 border-blue-100 pl-4 pr-1 sm:min-h-12 sm:pl-5 sm:pr-1">
              <textarea
                ref={composerInput}
                rows={1}
                maxLength={2000}
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    submitComposer();
                  }
                }}
                aria-label={t("problemPhoto.placeholder")}
                placeholder={t("problemPhoto.placeholder")}
                className="min-h-8 min-w-0 flex-1 resize-none bg-transparent py-2 text-xs leading-5 text-slate-800 outline-none placeholder:text-slate-400 sm:text-sm"
              />
              <button
                type="button"
                onClick={() => {
                  if (isListening) void stopDictation();
                  else void startDictation();
                }}
                aria-label={t(isListening ? "problemPhoto.stopSpeaking" : "problemPhoto.speak")}
                aria-pressed={isListening}
                className={`flex h-8 w-8 shrink-0 self-center items-center justify-center rounded-full sm:h-10 sm:w-10 ${
                  isListening ? "animate-pulse bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                }`}
              >
                <FiMic size={20} />
              </button>
            </div>
            <button
              type="submit"
              disabled={!composerText.trim() || isSubmitting}
              aria-label={t("problemPhoto.send")}
              className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 sm:h-12 sm:w-12"
            >
              <FiSend size={21} />
            </button>
          </form>
          {voiceError && <p role="alert" className="mx-auto mt-2 max-w-[700px] px-1 text-sm text-red-600">{voiceError}</p>}
        </footer>
      )}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/75 px-6 backdrop-blur-[1px]" role="status" aria-live="polite">
          <div className="w-full max-w-md rounded-3xl border border-blue-100 bg-white px-6 py-10 text-center shadow-xl">
            <span className="mx-auto block h-14 w-14 animate-spin rounded-full border-[6px] border-blue-100 border-t-blue-600" />
            <p className="mt-5 text-xl font-bold text-slate-900">{t("problemPhoto.submittingTitle")}</p>
            <p className="mt-2 text-sm text-slate-500">{t("problemPhoto.submittingDescription")}</p>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProblemPhoto;
