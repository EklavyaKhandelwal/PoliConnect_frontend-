import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiCopy,
  FiEdit3,
  FiMic,
  FiMoreVertical,
  FiPause,
  FiPlay,
  FiPlus,
  FiRotateCcw,
  FiRotateCw,
  FiSettings,
  FiShare2,
  FiVolume2,
  FiX,
} from "react-icons/fi";
import { MdKeyboard } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import leaderImage from "../assets/images/leader.png";
import { useLanguage } from "../hooks/useLanguage";
import { useAppDispatch, useAppSelector } from "../hooks/redux";
import { addMessage, clearChat, setConversationId } from "../store/slices/chatSlice";
import LanguageSelectorSheet from "./LanguageSelectorSheet";
import { getVoiceErrorMessage, sendChatMessage, transcribeVoiceMessage } from "../services/chatService";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import type { PluginListenerHandle } from "@capacitor/core";

type VoiceState =
  | "listening"
  | "transcript"
  | "thinking"
  | "answer"
  | "paused"
  | "permission"
  | "no-speech"
  | "error";

// The Web Speech API isn't in the default TS DOM lib, so we keep this loose.
// If you want proper typings, `npm i -D @types/dom-speech-recognition` and
// swap the `any`s below for `SpeechRecognition` / `SpeechRecognitionEvent`.
const getSpeechRecognitionCtor = (): any =>
  (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

// Maps your app's language codes to BCP-47 tags the browser's speech engine
// expects. Check these against the `code` values in `supportedLanguages` and
// adjust/add entries as needed.
const toSpeechLang = (code: string) => {
  const overrides: Record<string, string> = {
    hi: "hi-IN",
    en: "en-IN",
    mr: "mr-IN",
    ta: "ta-IN",
    te: "te-IN",
    bn: "bn-IN",
    gu: "gu-IN",
    kn: "kn-IN",
    ml: "ml-IN",
    pa: "pa-IN",
    ur: "ur-IN",
  };
  return overrides[code] ?? code;
};

const IconButton = ({
  label,
  children,
  onClick,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) => (
  <span
    role="button"
    tabIndex={0}
    aria-label={label}
    onClick={onClick}
    className={`flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm transition hover:shadow-md active:scale-95 ${className}`}
  >
    {children}
  </span>
);

const VoiceHeader = () => {
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation("common");
  const navigate = useNavigate();

  return (
    <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-7 sm:px-8">
      <button
        type="button"
        onClick={() => navigate("/history")}
        className="flex items-center gap-3 rounded-full bg-white px-4 py-3 text-sm font-semibold shadow-sm"
      >
        <span className="text-xl">◷</span>
        {t("voice.history")}
      </button>
      <LanguageSelectorSheet language={language} onChange={changeLanguage} compact />
      <IconButton label={t("settings")} onClick={() => navigate("/settings")}>
        <FiSettings size={23} />
      </IconButton>
    </header>
  );
};

const BottomActions = ({
  onMic,
  onKeyboard,
  onCamera,
  onCancel,
  micLabel,
}: {
  onMic: () => void;
  onKeyboard: () => void;
  onCamera?: () => void;
  onCancel?: () => void;
  micLabel?: string;
}) => {
  const { t } = useTranslation("common");

  return (
  <div className="flex items-end justify-between px-8 pb-7 pt-5 sm:px-12">
    {onCancel ? (
      <div
        role="button"
        tabIndex={0}
        onClick={onCancel}
        className="flex cursor-pointer flex-col items-center gap-2 text-xs font-semibold text-slate-600"
      >
        <IconButton label={t("voice.cancel", "Cancel")}>
          <FiX size={23} />
        </IconButton>
        {t("voice.cancel", "Cancel")}
      </div>
    ) : (
      <div role="button" tabIndex={0} onClick={onCamera} className="flex cursor-pointer flex-col items-center gap-2 text-xs font-semibold text-slate-600">
        <IconButton label="Take a photo"><FiCamera size={23} /></IconButton>
        {t("voice.problemPhoto")}
      </div>
    )}
    <button type="button" onClick={onMic} className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-700">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-blue-100 bg-blue-600 text-white shadow-lg shadow-blue-200">
        <FiMic size={28} />
      </span>
      {micLabel ?? t("voice.speakAgain")}
    </button>
    <div role="button" tabIndex={0} onClick={onKeyboard} className="flex cursor-pointer flex-col items-center gap-2 text-xs font-semibold text-slate-600">
      <IconButton label="Use keyboard"><MdKeyboard size={24} /></IconButton>
      {t("voice.askByTyping")}
    </div>
  </div>
  );
};

const Waveform = () => (
  <div className="flex h-12 items-center justify-center gap-1.5">
    {[18, 28, 40, 25, 48, 32, 52, 24, 42, 34, 48, 26, 17].map((height, index) => (
      <span
        key={index}
        className="w-1 rounded-full bg-blue-500"
        style={{ height, opacity: index > 9 ? 0.25 : 1 }}
      />
    ))}
  </div>
);

const playbackSpeeds = [0.75, 1, 1.25, 1.5];

const AnswerCard = ({
  answer,
  audioUrl,
  paused,
  onToggle,
  speed,
  onSpeedChange,
}: {
  answer: string;
  audioUrl?: string | null;
  paused: boolean;
  onToggle: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}) => {
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const { t } = useTranslation("common");

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (!audioUrl) return;
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch((error) => {
      console.warn("Audio autoplay was blocked:", error);
    });
  }, [audioUrl]);

  useEffect(() => {
    if (audioUrl || !answer || typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const utterance = new SpeechSynthesisUtterance(answer);
    utterance.lang = "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);

    return () => window.speechSynthesis.cancel();
  }, [answer, audioUrl]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio && "speechSynthesis" in window) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      } else if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      } else {
        const utterance = new SpeechSynthesisUtterance(answer);
        utterance.lang = "en-IN";
        window.speechSynthesis.speak(utterance);
      }
      onToggle();
      return;
    }
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
    }
    onToggle();
  };

  const formatTime = (value: number) =>
    `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;

  return (
  <article className="mx-4 mb-5 rounded-2xl border-2 border-blue-200 bg-white p-4 shadow-sm sm:mx-8 sm:p-5">
    <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-xs text-white">AS</span>
      {t("voice.assistantName")} <FiCheckCircle className="text-emerald-600" />
    </div>
    <div className="mt-3 rounded-xl bg-white text-slate-700">
      <p className="mt-3 leading-8">
        {answer}
      </p>
      <div className="mt-3 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-800">
        ✓ {t("voice.source")}
      </div>
    </div>
    <div className="mt-3 flex justify-end gap-5 text-slate-500">
      <button
        type="button"
        aria-label="Copy answer"
        onClick={() => void navigator.clipboard.writeText(answer)}
      ><FiCopy /></button>
      <button
        type="button"
        aria-label="Share answer"
        onClick={() => void (navigator.share
          ? navigator.share({ text: answer, url: audioUrl ?? undefined })
          : navigator.clipboard.writeText(answer))}
      ><FiShare2 /></button>
      <button type="button" aria-label="More answer options"><FiMoreVertical /></button>
    </div>
    <div className="fixed bottom-24 left-1/2 z-20 w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-blue-200 bg-white p-3 shadow-xl">
      <div className="flex items-center gap-2 text-sm font-semibold text-blue-600">
      <FiVolume2 /> {audioUrl ? t("voice.answerPlaying") : t("voice.audioUnavailable")}
        <span className="ml-auto text-xs text-slate-500">{t("voice.auto")} <span className="text-blue-600">●</span></span>
      </div>
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => onToggle()}
        />
      )}
      <input
        type="range"
        min="0"
        max={duration || 0}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => {
          const nextTime = Number(event.target.value);
          if (audioRef.current) audioRef.current.currentTime = nextTime;
          setCurrentTime(nextTime);
        }}
        disabled={!audioUrl || !duration}
        aria-label="Audio progress"
        className="mt-3 h-1 w-full accent-blue-600"
      />
      <div className="mt-1 flex justify-between text-xs text-slate-400"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
      <div className="mt-3 flex items-center justify-between">
        <div className="relative">
          {speedMenuOpen && (
            <div className="absolute bottom-12 left-0 z-10 w-32 rounded-2xl bg-white p-2 text-sm shadow-xl ring-1 ring-slate-100">
              <p className="px-3 py-2 font-semibold text-slate-500">{t("voice.speed")}</p>
              {playbackSpeeds.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => {
                    onSpeedChange(option);
                    setSpeedMenuOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${
                    option === speed ? "bg-blue-100 font-bold text-blue-600" : "text-slate-700"
                  }`}
                >
                  {option.toFixed(2).replace(/0$/, "")}x
                  {option === speed && "✓"}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => setSpeedMenuOpen((open) => !open)}
            aria-expanded={speedMenuOpen}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold"
          >
            {speed.toFixed(2).replace(/0$/, "")}x
          </button>
        </div>
        <button type="button" aria-label="Rewind"><FiRotateCcw /></button>
        <button type="button" onClick={toggleAudio} className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg">
          {paused ? <FiPlay size={24} /> : <FiPause size={24} />}
        </button>
        <button type="button" aria-label="Forward"><FiRotateCw /></button>
        <button type="button" aria-label="Close audio" onClick={() => {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
          }
          onToggle();
        }}><FiX /></button>
      </div>
    </div>
  </article>
  );
};

const VoiceAssistant = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { conversationId: routeConversationId } = useParams<{ conversationId: string }>();
  const storedConversationId = useAppSelector((state) => state.chat.conversationId);
  const autoPlay = useAppSelector((state) => state.preferences.autoPlay);
  const conversationId = routeConversationId || storedConversationId;
  useEffect(() => {
    if (routeConversationId) dispatch(setConversationId(routeConversationId));
    else dispatch(clearChat());
  }, [dispatch, routeConversationId]);
  const { language } = useLanguage();
  const { t } = useTranslation("common");
  const [state, setState] = useState<VoiceState>("listening");
  const [seconds, setSeconds] = useState(0);
  const [text, setText] = useState("");
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  // NEW: live speech-to-text shown while the mic is listening (separate from
  // `text`, which is the confirmed transcript that comes back from your
  // backend after recording stops).
  const [interimText, setInterimText] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [answer, setAnswer] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [messageTime, setMessageTime] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const stoppingRef = useRef(false);
  // NEW: holds the live SpeechRecognition instance, if the browser supports it.
  const recognitionRef = useRef<any>(null);
  const nativeRecognitionListenerRef = useRef<PluginListenerHandle | null>(null);
  const sendingRef = useRef(false);

  const releaseMicrophone = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }, []);

  // NEW: stop the live-caption recognizer cleanly.
  const stopRecognition = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null; // prevent auto-restart on manual stop
      try {
        recognitionRef.current.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    }
    if (nativeRecognitionListenerRef.current) {
      void nativeRecognitionListenerRef.current.remove();
      nativeRecognitionListenerRef.current = null;
      void SpeechRecognition.stop().catch(() => undefined);
    }
  }, []);

  const startListening = useCallback(async () => {
    stoppingRef.current = false;
    setText("");
    setIsEditingTranscript(false);
    setInterimText("");
    setErrorMessage("");
    setSeconds(0);
    setState("listening");

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("permission");
      return;
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error("Microphone permission request failed:", error);
      setState("permission");
      return;
    }

    // NEW: start live captions alongside recording, if the browser supports it.
    // This never blocks or breaks the recording/transcription flow below —
    // if it's unsupported or errors out, we just silently skip live captions.
    const startNativeRecognition = async () => {
      const availability = await SpeechRecognition.available();
      if (!availability.available) return false;

      const permission = await SpeechRecognition.requestPermissions();
      if (permission.speechRecognition !== "granted") {
        console.warn("Native speech recognition permission was not granted.");
        return false;
      }

      nativeRecognitionListenerRef.current = await SpeechRecognition.addListener(
        "partialResults",
        (event) => {
          const latest = event.matches?.[0]?.trim();
          if (latest) setInterimText(latest);
        },
      );
      await SpeechRecognition.start({
        language: toSpeechLang(language),
        maxResults: 1,
        partialResults: true,
        popup: false,
      });
      return true;
    };

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    let nativeRecognitionStarted = false;
    if (Capacitor.isNativePlatform()) {
      try {
        nativeRecognitionStarted = await startNativeRecognition();
      } catch (error) {
        console.warn("Could not start native live caption recognition:", error);
        nativeRecognitionListenerRef.current = null;
      }
    }
    if (!nativeRecognitionStarted && SpeechRecognitionCtor) {
      try {
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = toSpeechLang(language);
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
          let combined = "";
          for (let i = 0; i < event.results.length; i += 1) {
            combined += event.results[i][0].transcript;
          }
          setInterimText(combined.trim());
        };
        recognition.onerror = (event: any) => {
          console.warn("Live caption recognition error (non-fatal):", event?.error);
        };
        recognition.onend = () => {
          if (!stoppingRef.current) {
            try {
              recognition.start();
            } catch {
              /* ignore */
            }
          }
        };
        recognition.start();
        recognitionRef.current = recognition;
      } catch (error) {
        console.warn("Could not start live caption recognition:", error);
        recognitionRef.current = null;
      }
    }

    audioChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "";
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunksRef.current.push(event.data);
    };
    recorder.onerror = (event) => {
      console.error("Audio recording failed:", event);
      stoppingRef.current = true;
      stopRecognition();
      releaseMicrophone();
      setState("no-speech");
    };
    recorder.onstop = () => {
      const audio = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      });
      releaseMicrophone();
      if (!audio.size) {
        setState("no-speech");
        return;
      }
      void transcribeVoiceMessage(audio, language)
        .then((transcript) => {
          setText(transcript);
          setIsEditingTranscript(false);
          setState("transcript");
        })
        .catch((error) => {
          console.error("Failed to transcribe voice message:", error);
          setErrorMessage(getVoiceErrorMessage(error));
          setState("no-speech");
        });
    };
    recorderRef.current = recorder;

    try {
      recorder.start();
    } catch (error) {
      console.error("Audio recording could not start:", error);
      stopRecognition();
      releaseMicrophone();
      setState("no-speech");
    }
  }, [language, releaseMicrophone, stopRecognition]);

  const stopListening = useCallback(() => {
    stoppingRef.current = true;
    stopRecognition();
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      setState("no-speech");
      return;
    }
    recorderRef.current.stop();
  }, [stopRecognition]);

  // NEW: cancel the recording entirely (used by the ✕ button on the
  // listening/thinking screens) — discards audio instead of transcribing it.
  const cancelListening = useCallback(() => {
    stoppingRef.current = true;
    stopRecognition();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    releaseMicrophone();
    navigate(-1);
  }, [navigate, releaseMicrophone, stopRecognition]);

  const send = async () => {
    if (!text.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setState("thinking");
    setErrorMessage("");
    try {
      const submittedText = text.trim();
      const submittedAt = new Date().toISOString();
      const response = await sendChatMessage({
        message: submittedText,
        language,
        conversationId,
      });
      dispatch(setConversationId(response.conversationId));
      if (!conversationId) {
        navigate(`/voice/${response.conversationId}`, { replace: true });
      }
      dispatch(addMessage({
        id: crypto.randomUUID(),
        role: "user",
        content: submittedText,
        createdAt: submittedAt,
      }));
      dispatch(addMessage({
        id: response.message._id,
        role: "assistant",
        content: response.message.contentText,
        fileUrl: response.message.fileUrl ?? null,
        createdAt: response.message.createdAt ?? new Date().toISOString(),
        autoPlay: autoPlay && Boolean(response.message.fileUrl),
      }));
      setAnswer(response.message.contentText);
      setAudioUrl(response.message.fileUrl ?? null);
      setMessageTime(new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date()));
      navigate(`/chat/${response.conversationId}`, {
        replace: true,
        state: { autoPlayMessageId: response.message._id },
      });
    } catch (error) {
      console.error("Failed to send voice message:", error);
      setErrorMessage(getVoiceErrorMessage(error));
      setState("error");
    } finally {
      sendingRef.current = false;
    }
  };

  useEffect(() => {
    const startTimer = window.setTimeout(() => {
      void startListening();
    }, 0);
    return () => {
      window.clearTimeout(startTimer);
      stoppingRef.current = true;
      stopRecognition();
      recorderRef.current?.stop();
      releaseMicrophone();
    };
  }, [releaseMicrophone, startListening, stopRecognition]);

  useEffect(() => {
    if (state !== "listening") return;
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [state]);

  if (state === "answer" || state === "paused") {
    return (
      <main className="flex h-dvh justify-center bg-slate-300">
        <div className="flex h-full w-full max-w-[620px] flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white">
          <header className="flex items-center gap-3 bg-white px-5 py-5">
            <button type="button" onClick={() => setState("listening")} aria-label="Back"><FiArrowLeft size={24} /></button>
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-700 font-bold text-white">AS</span>
            <div><h1 className="font-bold">सांसद अनुराग शर्मा</h1><p className="text-xs text-blue-600">{t("voice.assistantName")} · ✓</p></div>
            <FiPlus className="ml-auto" size={25} /><FiMoreVertical size={22} />
          </header>
          <div className="flex-1 overflow-y-auto pt-6">
            <div className="mx-5 ml-auto max-w-[85%] rounded-2xl bg-blue-600 p-4 text-white shadow-sm">
              <div>{text}</div>
              <button
                type="button"
                onClick={() => {
                  setIsEditingTranscript(true);
                  setState("transcript");
                }}
                className="mt-3 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white"
              >
                {t("voice.edit")}
              </button>
            </div>
            <p className="px-6 py-2 text-right text-xs text-slate-500">
              {messageTime ?? ""} · ✓✓ भेजा गया
            </p>
            <AnswerCard
              answer={answer}
              audioUrl={audioUrl}
              paused={state === "paused"}
              onToggle={() => setState(state === "paused" ? "answer" : "paused")}
              speed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
            />
          </div>
          <div className="flex items-center gap-3 border-t border-slate-200 bg-white p-4">
            <IconButton label="Take a photo"><FiCamera size={22} /></IconButton>
            <div className="flex h-14 flex-1 items-center rounded-full border border-slate-200 px-5 text-sm text-slate-400">{t("voice.nextQuestion")}</div>
            <IconButton label="Send" className="bg-blue-50 text-blue-600"><FiMic size={22} /></IconButton>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-dvh justify-center bg-slate-300">
      <div className="flex h-full w-full max-w-[620px] flex-col bg-gradient-to-b from-blue-100 via-blue-50 to-white">
        <VoiceHeader />
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <img src={leaderImage} alt="Assistant" className="w-64 max-w-full sm:w-72" />
          {state === "listening" && (
            <>
              <h1 className="mt-5 text-4xl font-bold text-slate-900">{t("voice.listening")}</h1>
              <Waveform />
              <p className="mt-2 font-semibold text-slate-500">0:{String(seconds).padStart(2, "0")}</p>
              <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
                {interimText ? `"${interimText}"` : t("voice.startSpeaking")}
              </p>
              <p className="mt-2 text-sm text-slate-500">{t("voice.listeningHint")}</p>
            </>
          )}
          {state === "transcript" && (
            <>
              <h1 className="mt-5 text-3xl font-bold">{t("voice.transcriptTitle")}</h1>
              <div className="mt-5 w-full max-w-lg rounded-2xl bg-white p-5 text-left shadow-sm">
                <textarea
                  value={text}
                  readOnly={!isEditingTranscript}
                  onChange={(event) => setText(event.target.value)}
                  aria-label={t("voice.transcriptTitle")}
                  className={`min-h-24 w-full resize-none text-lg leading-8 outline-none ${
                    isEditingTranscript ? "rounded-lg ring-2 ring-blue-200" : ""
                  }`}
                />
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsEditingTranscript((editing) => !editing)}
                    className="flex items-center gap-2 rounded-full bg-blue-100 px-5 py-3 text-base font-semibold text-blue-600 transition hover:bg-blue-200 active:scale-95"
                  >
                    {isEditingTranscript ? <FiCheckCircle size={21} /> : <FiEdit3 size={21} />}
                    {isEditingTranscript ? t("voice.doneEditing") : t("voice.edit")}
                  </button>
                </div>
              </div>
              <p className="mt-5 text-sm text-slate-500">
                {isEditingTranscript ? t("voice.editing") : t("voice.reviewBeforeSend")}
              </p>
            </>
          )}
          {state === "thinking" && (
            <>
              <div className="mt-5 rounded-full bg-white px-5 py-2 text-sm text-slate-500">{text}</div>
              <h1 className="mt-5 text-4xl font-bold">{t("voice.thinking")}</h1>
              <div className="mt-6 w-full max-w-lg space-y-4"><div className="h-4 rounded-full bg-blue-100" /><div className="h-4 rounded-full bg-blue-100" /><div className="h-4 w-2/3 rounded-full bg-blue-100" /></div>
            </>
          )}
          {state === "permission" && (
            <>
              <div className="mt-5 rounded-full border-2 border-red-200 p-5 text-red-500"><FiMic size={34} /></div>
              <h1 className="mt-5 text-3xl font-bold">{t("voice.permissionTitle")}</h1>
              <p className="mt-4 max-w-md leading-7 text-slate-500">{t("voice.permissionText")}</p>
              <button type="button" onClick={() => void startListening()} className="mt-7 w-full max-w-md rounded-full bg-blue-600 py-4 font-bold text-white">{t("voice.allowAgain")}</button>
            </>
          )}
          {state === "no-speech" && (
            <>
              <div className="mt-5 rounded-full border-2 border-amber-300 p-5 text-amber-700">◔</div>
              <h1 className="mt-5 text-3xl font-bold">{t("voice.noSpeechTitle")}</h1>
              <p className="mt-4 text-slate-500">{t("voice.noSpeechText")}</p>
              {errorMessage && <p className="mt-3 max-w-md text-sm text-red-600">{errorMessage}</p>}
            </>
          )}
          {state === "error" && (
            <>
              <div className="mt-5 rounded-full border-2 border-red-300 p-5 text-red-600">
                <FiX size={34} />
              </div>
              <h1 className="mt-5 text-3xl font-bold">{t("voice.answerErrorTitle")}</h1>
              <p className="mt-4 max-w-md text-slate-500">{t("voice.answerErrorText")}</p>
              {errorMessage && <p className="mt-3 max-w-md text-sm text-red-600">{errorMessage}</p>}
              {text.trim() && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTranscript(true);
                    setState("transcript");
                  }}
                  className="mt-5 rounded-full bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm"
                >
                  {t("voice.edit")}
                </button>
              )}
            </>
          )}
        </div>
        {state === "listening" && (
          <BottomActions
            onMic={stopListening}
            onKeyboard={() => navigate(conversationId ? `/chat/${conversationId}` : "/chat")}
            onCancel={cancelListening}
            micLabel={t("voice.stopListening", "रोकें")}
          />
        )}
        {state === "transcript" && (
          <div className="flex items-end justify-between px-8 pb-7 pt-5 sm:px-12">
            <button type="button" onClick={() => void startListening()} className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-600"><IconButton label={t("voice.speakAgain")}><FiMic /></IconButton>{t("voice.speakAgain")}</button>
            <button type="button" onClick={() => void send()} className="flex flex-col items-center gap-2 text-xs font-semibold"><span className="flex h-20 w-20 items-center justify-center rounded-full border-8 border-blue-100 bg-blue-600 text-white shadow-lg"><FiArrowLeft className="rotate-90" size={27} /></span>{t("voice.send")}</button>
          </div>
        )}
        {state === "thinking" && (
          <BottomActions
            onMic={() => void startListening()}
            onKeyboard={() => navigate(conversationId ? `/chat/${conversationId}` : "/chat")}
            micLabel={t("voice.thinking")}
            onCancel={() => navigate(-1)}
          />
        )}
        {(state === "permission" || state === "no-speech" || state === "error") && (
          <BottomActions
            onMic={() => {
              if (state === "error" && text.trim()) {
                setState("transcript");
                return;
              }
              void startListening();
            }}
            onKeyboard={() => navigate(conversationId ? `/chat/${conversationId}` : "/chat")}
            micLabel={state === "error" ? t("voice.tryAgain") : undefined}
          />
        )}
      </div>
    </main>
  );
};

export default VoiceAssistant;
