import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import {
  FiCopy,
  FiCheckCircle,
  FiShare2,
  FiVolume2,
  FiPlay,
  FiPause,
  FiRotateCcw,
  FiRotateCw,
  FiX,
  FiLoader,
  FiGlobe,
  FiMove,
} from "react-icons/fi";

import type { Message } from "../../store/slices/chatSlice";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { setMessageAudio, setMessageContent } from "../../store/slices/chatSlice";
import { setPreference } from "../../store/slices/preferencesSlice";
import { speakMessage, translateMessage } from "../../services/chatService";
import { supportedLanguages } from "../../config/supportedLanguages";

interface ChatMessageProps {
  message: Message;
}

const SEEK_STEP_SECONDS = 10;
const playbackSpeeds = [0.75, 1, 1.25, 1.5];

const formatTime = (value: number) => {
  if (!Number.isFinite(value)) return "0:00";
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, "0")}`;
};

const formatMessageTime = (createdAt?: string) =>
  createdAt
    ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(
        new Date(createdAt),
      )
    : null;

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isUser = message.role === "user";
  const { t } = useTranslation("common");
  const dispatch = useAppDispatch();
  const appLanguage = useAppSelector((state) => state.language.currentLanguage);
  const preferences = useAppSelector((state) => state.preferences);

  const [playerOpen, setPlayerOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(preferences.playbackSpeed);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [playerMinimized, setPlayerMinimized] = useState(false);
  const [playerPosition, setPlayerPosition] = useState<{ x: number; y: number } | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const draggingRef = useRef(false);
  const dragFrameRef = useRef<number | null>(null);
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [languageOptionsOpen, setLanguageOptionsOpen] = useState(false);
  const [translationLanguage, setTranslationLanguage] = useState(appLanguage);
  const [isTranslating, setIsTranslating] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, []);

  const ensureAudioAndPlay = async () => {
    setAudioError(null);
    if (message.fileUrl) {
      setPlayerOpen(true);
      return;
    }
    try {
      setIsGenerating(true);
      const fileUrl = await speakMessage(message.id);
      dispatch(setMessageAudio({ id: message.id, fileUrl }));
      setPlayerOpen(true);
    } catch (error) {
      console.error("Failed to generate speech:", error);
      setAudioError("Unable to load audio. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!message.fileUrl || (!playerOpen && !message.autoPlay)) return;
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
  }, [playerOpen, message.fileUrl, message.autoPlay]);

  useEffect(() => {
    if (message.autoPlay && message.fileUrl) setPlayerOpen(true);
  }, [message.autoPlay, message.fileUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const seekBy = (deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(Math.max(audio.currentTime + deltaSeconds, 0), duration || audio.duration || 0);
    audio.currentTime = next;
    setCurrentTime(next);
  };

  const closePlayer = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setPlayerOpen(false);
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      const width = playerMinimized ? 64 : 280;
      const height = playerMinimized ? 48 : 122;
      const nextPosition = {
        x: Math.min(Math.max(event.clientX - dragOffset.current.x, 8), window.innerWidth - width - 8),
        y: Math.min(Math.max(event.clientY - dragOffset.current.y, 8), window.innerHeight - height - 8),
      };
      if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = requestAnimationFrame(() => setPlayerPosition(nextPosition));
    };
    const handlePointerUp = () => {
      draggingRef.current = false;
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      if (dragFrameRef.current !== null) cancelAnimationFrame(dragFrameRef.current);
    };
  }, [playerMinimized]);

  // Dragging now starts from anywhere on the player card, EXCEPT actual
  // controls (buttons, the seek-bar input) so those keep responding to taps
  // normally instead of accidentally starting a drag.
  const startDragging = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input")) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    setPlayerPosition({ x: rect.left, y: rect.top });
    draggingRef.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.body.style.userSelect = "none";
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: message.content, url: message.fileUrl ?? undefined });
      } else {
        await navigator.clipboard.writeText(message.content);
      }
    } catch (error) {
      // AbortError fires when the user cancels the native share sheet — not a real failure.
      if ((error as DOMException)?.name !== "AbortError") {
        console.error("Share failed:", error);
      }
    }
  };

  const messageTime = formatMessageTime(message.createdAt);
  let renderedParagraph = 0;

  const handleTranslate = async (language: string) => {
    if (language === translationLanguage) {
      setActionSheetOpen(false);
      return;
    }
    try {
      setIsTranslating(true);
      const content = await translateMessage(message.id, language);
      dispatch(setMessageContent({ id: message.id, content }));
      setTranslationLanguage(language);
      setActionSheetOpen(false);
    } catch (error) {
      console.error("Failed to translate response:", error);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {isUser ? (
        <div className="flex max-w-[85%] flex-col items-end">
          <div className="rounded-2xl rounded-br-md bg-blue-600 px-5 py-3 text-sm text-white shadow-sm sm:text-base">
            {message.imageUrl && (
              <img
                src={message.imageUrl}
                alt="Selected attachment"
                className="mb-3 max-h-64 max-w-full rounded-xl object-contain"
              />
            )}
            <p className="leading-6">{message.content}</p>
          </div>
          <div className="mt-1 flex items-center gap-1.5 pr-1 text-xs text-slate-500">
            {messageTime}
            <span aria-label={t("chat.sent")} className="font-semibold tracking-[-0.15em]">✓✓</span>
            <span>{t("chat.sent")}</span>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-[90%]">
          <div className="mb-2 flex items-center gap-2 pl-1 text-sm font-semibold text-blue-600">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white ring-2 ring-white">
              AS
            </span>
            <span>{t("voice.assistantName")}</span>
            <FiCheckCircle className="text-emerald-600" size={17} />
          </div>
              <div
            className="rounded-3xl border-2 border-blue-200 bg-white px-5 py-4 text-sm text-slate-800 shadow-sm sm:px-7 sm:py-5 sm:text-base"
            onClick={() => setActionSheetOpen(true)}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") setActionSheetOpen(true);
            }}
          >
            <div className="space-y-2 leading-7">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-bold">{children}</h3>,
                  p: ({ children }) => {
                    renderedParagraph += 1;
                    return (
                      <p className={`leading-7 ${renderedParagraph === 1 && preferences.highlight ? "rounded-xl bg-blue-100 px-3 py-2 font-semibold text-slate-900" : ""}`}>
                        {children}
                      </p>
                    );
                  },
                  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5">{children}</ol>,
                  li: ({ children }) => <li>{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="border-slate-200" />,
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">{children}</table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="border border-slate-200 bg-slate-50 px-3 py-2 text-left font-semibold">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => <td className="border border-slate-200 px-3 py-2">{children}</td>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
            <div className="mt-4 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
              {t("chat.source").split(":")[0]}: {message.sourceLabel ?? "MP Public Assistant"}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-400">
            <span>{messageTime}</span>
            <div className="flex items-center gap-4">
              <button type="button" aria-label={t("chat.copy")} onClick={handleCopy} className="hover:text-blue-600">
                <FiCopy size={19} />
              </button>
              <button type="button" aria-label={t("chat.share")} onClick={handleShare} className="hover:text-blue-600">
                <FiShare2 size={19} />
              </button>
              <button
                type="button"
                aria-label={t("chat.listen")}
                onClick={ensureAudioAndPlay}
                disabled={isGenerating}
                className="hover:text-blue-600 disabled:opacity-50"
              >
                {isGenerating ? <FiLoader size={19} className="animate-spin" /> : <FiVolume2 size={19} />}
              </button>
            </div>
            {actionSheetOpen && (
              <div
                className="fixed inset-0 z-40 flex items-end bg-slate-900/40"
                onMouseDown={(event) => {
                  if (event.target === event.currentTarget) setActionSheetOpen(false);
                }}
              >
                <section
                  role="dialog"
                  aria-modal="true"
                  className="w-full rounded-t-[2rem] bg-white px-7 pb-8 pt-4 shadow-2xl"
                >
                  <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-slate-300" />
                  <h2 className="text-xl font-bold text-slate-900">{t("chat.responseActions")}</h2>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {t("voice.assistantName")} · {messageTime}
                  </p>
                  <div className="mt-4 divide-y divide-slate-200">
                    <button type="button" onClick={() => { void ensureAudioAndPlay(); setActionSheetOpen(false); }} className="flex w-full items-center gap-5 py-4 text-left text-lg font-semibold text-blue-600">
                      <FiVolume2 size={27} /> {t("chat.listen")}
                    </button>
                    <button type="button" onClick={() => { void handleCopy(); setActionSheetOpen(false); }} className="flex w-full items-center gap-5 py-4 text-left text-lg font-semibold text-slate-800">
                      <FiCopy size={27} /> {t("chat.copy")}
                    </button>
                    <button type="button" onClick={() => { void handleShare(); setActionSheetOpen(false); }} className="flex w-full items-center gap-5 py-4 text-left text-lg font-semibold text-slate-800">
                      <FiShare2 size={27} /> {t("chat.share")}
                    </button>
                  <div className="py-4">
                    <button
                      type="button"
                      onClick={() => setLanguageOptionsOpen((open) => !open)}
                      className="flex w-full items-center gap-5 text-left text-lg font-semibold text-slate-800"
                      aria-expanded={languageOptionsOpen}
                    >
                      <FiGlobe size={27} /> {t("chat.changeLanguage")}
                    </button>
                    {languageOptionsOpen && (
                      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 pl-12">
                        {supportedLanguages.map((item) => (
                          <button
                            type="button"
                            key={item.code}
                            disabled={isTranslating}
                            onClick={() => void handleTranslate(item.code)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold ${
                              item.code === translationLanguage ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"
                            } disabled:opacity-50`}
                          >
                            {item.nativeName}
                          </button>
                        ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </div>
            )}
          </div>

          {audioError && <p className="mt-1 text-xs text-red-500">{audioError}</p>}

          {playerOpen && message.fileUrl && (
            <div
              className={`fixed z-20 touch-none rounded-2xl border border-blue-200 bg-white shadow-xl ${
                playerPosition ? "" : "bottom-24 left-1/2 -translate-x-1/2"
              } ${playerMinimized ? "w-16 p-2" : "w-[min(88vw,280px)] p-2.5"}`}
              style={playerPosition ? { left: playerPosition.x, top: playerPosition.y } : undefined}
              onPointerDown={startDragging}
            >
              {playerMinimized ? (
                <div className="flex items-center justify-between gap-1">
                  <button
                    type="button"
                    aria-label="Expand audio player"
                    onClick={() => setPlayerMinimized(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"
                  >
                    {isPlaying ? <FiPause size={16} /> : <FiPlay size={16} />}
                  </button>
                  <button type="button" aria-label="Close player" onClick={closePlayer}>
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    className="mb-1 flex items-center justify-between text-[11px] font-semibold text-slate-500"
                    title="Drag anywhere on this card to move it"
                  >
                    <span className="flex items-center gap-1"><FiMove size={13} /> Audio</span>
                    <button type="button" aria-label="Minimize audio player" onClick={() => setPlayerMinimized(true)}>
                      <span className="text-base leading-none">−</span>
                    </button>
                  </div>
                <audio
                  ref={audioRef}
                  src={message.fileUrl}
                  autoPlay={message.autoPlay}
                  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => {
                    setIsPlaying(false);
                    setAudioError("Audio is ready. Tap play to start it.");
                  }}
                />
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    if (audioRef.current) audioRef.current.currentTime = next;
                    setCurrentTime(next);
                  }}
                  disabled={!duration}
                  aria-label="Audio progress"
                  className="h-3 w-full touch-pan-x accent-blue-600"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="relative">
                    {speedMenuOpen && (
                      <div className="absolute bottom-10 left-0 z-10 w-28 rounded-xl bg-white p-1.5 text-sm shadow-xl ring-1 ring-slate-100">
                        {playbackSpeeds.map((option) => (
                          <button
                            type="button"
                            key={option}
                            onClick={() => {
                              setSpeed(option);
                              dispatch(setPreference({ key: "playbackSpeed", value: option }));
                              setSpeedMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left ${
                              option === speed ? "bg-blue-100 font-bold text-blue-600" : "text-slate-700"
                            }`}
                          >
                            {option.toFixed(2).replace(/0$/, "")}x
                          </button>
                        ))}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSpeedMenuOpen((open) => !open)}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold"
                    >
                      {speed.toFixed(2).replace(/0$/, "")}x
                    </button>
                  </div>
                  <button type="button" aria-label="Rewind 10 seconds" onClick={() => seekBy(-SEEK_STEP_SECONDS)}>
                    <FiRotateCcw size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white"
                  >
                    {isPlaying ? <FiPause size={18} /> : <FiPlay size={18} />}
                  </button>
                  <button type="button" aria-label="Forward 10 seconds" onClick={() => seekBy(SEEK_STEP_SECONDS)}>
                    <FiRotateCw size={18} />
                  </button>
                  <button type="button" aria-label="Close player" onClick={closePlayer}>
                    <FiX size={18} />
                  </button>
                </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
