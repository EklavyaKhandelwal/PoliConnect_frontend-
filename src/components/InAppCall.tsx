import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiArrowLeft,
  FiDelete,
  FiHeadphones,
  FiMic,
  FiMicOff,
  FiPhone,
  FiVolume2,
  FiVolumeX,
  FiX,
} from "react-icons/fi";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import type { PluginListenerHandle } from "@capacitor/core";
import { Capacitor } from "@capacitor/core";
import { useTranslation } from "react-i18next";

import { useLanguage } from "../hooks/useLanguage";
import { transcribeVoiceMessage } from "../services/chatService";
import {
  getComplaints,
  type ComplaintRecord,
} from "../services/complaints";
import { MicMonitor, startBargeInDetector } from "../services/micmonitor";
import {
  getVoiceCallErrorKey,
  getVoiceCallReply,
  type VoiceCallComplaintDraft,
  type VoiceCallTurn,
} from "../services/voiceCall";
import { isAffirmativeVoiceConfirmation } from "../services/voiceCallConfirmation";
import { submitVoiceCallComplaint } from "../services/voiceCallComplaintSubmission";

type CallPhase = "listening" | "thinking" | "speaking" | "error" | "ended";

interface NativePartialResult {
  matches?: string[];
}

interface ListenOptions {
  /** True when the caller is already talking (they just interrupted by voice). */
  speechInProgress?: boolean;
}

const SPEECH_THRESHOLD = 0.02;
const SILENCE_DURATION_MS = 900;
const NATIVE_SILENCE_DURATION_MS = 800;
const NO_SPEECH_TIMEOUT_MS = 15000;
const MAX_RECORDING_DURATION_MS = 30000;
const VAD_INTERVAL_MS = 100;

// Speech speed: 1.0 is the device's normal speed.
const SPEECH_RATE = 1.08;
const SENTENCE_PAUSE_MS = 120;
const CLAUSE_PAUSE_MS = 60;

// Barge-in (caller talking over the assistant). Tuning:
// - Assistant stops by itself? Raise BARGE_IN_ECHO_MULTIPLIER (e.g. 3.5) or BARGE_IN_REQUIRED_MS (e.g. 400).
// - Hard to interrupt? Lower BARGE_IN_MIN_THRESHOLD (e.g. 0.02) or BARGE_IN_ECHO_MULTIPLIER (e.g. 2).
// Set SHOW_MIC_DEBUG to true to see live mic levels on screen while tuning.
const BARGE_IN_ENABLED = true;
const BARGE_IN_MIN_THRESHOLD = 0.03;
const BARGE_IN_ECHO_MULTIPLIER = 2.5;
const BARGE_IN_REQUIRED_MS = 250;
const BARGE_IN_WARMUP_MS = 400;
// Used only if the speech engine never reports that audio started.
const BARGE_IN_FALLBACK_START_MS = 1200;
const SHOW_MIC_DEBUG = false;

const speechLanguage: Record<string, string> = {
  en: "en-IN",
  hi: "hi-IN",
  mr: "mr-IN",
};

// Split only on sentence endings so commas don't create separate, laggy utterances.
const splitSpeechIntoPhrases = (text: string) =>
  text
    .replace(/\s+/g, " ")
    .match(/[^.!?।;]+[.!?।;]?/gu)
    ?.map((phrase) => phrase.trim())
    .filter(Boolean) ?? [];

// crypto.randomUUID is missing in older Android WebViews and non-HTTPS contexts.
const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const InAppCall = ({ onEnd }: { onEnd: (submittedComplaintNumber?: string) => void }) => {
  const { language } = useLanguage();
  const { t } = useTranslation("common");
  const [phase, setPhase] = useState<CallPhase>("speaking");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [keypadOpen, setKeypadOpen] = useState(false);
  const [keypadDigits, setKeypadDigits] = useState("");
  const [matchingComplaints, setMatchingComplaints] = useState<ComplaintRecord[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRecord[] | null>(null);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [keypadError, setKeypadError] = useState("");
  const [callError, setCallError] = useState("");
  const [callTurns, setCallTurns] = useState<VoiceCallTurn[]>([]);
  const [complaintDraft, setComplaintDraft] = useState<VoiceCallComplaintDraft>();
  const [awaitingComplaintConfirmation, setAwaitingComplaintConfirmation] = useState(false);
  const [hasPendingTranscript, setHasPendingTranscript] = useState(false);
  const [micDebug, setMicDebug] = useState("");
  const lastLookedUpDigitsRef = useRef("");
  const complaintSubmissionRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const submittedComplaintNumberRef = useRef<string | null>(null);
  const endCallAfterReplyRef = useRef(false);
  const pendingTranscriptRef = useRef<string | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const speechTimerRef = useRef<number | null>(null);
  const speechSequenceRef = useRef(0);
  const phaseRef = useRef<CallPhase>("speaking");
  const mutedRef = useRef(false);
  const speakerRef = useRef(true);
  const complaintDraftRef = useRef<VoiceCallComplaintDraft | undefined>(undefined);
  const micMonitorRef = useRef<MicMonitor | null>(null);
  const bargeInStopRef = useRef<(() => void) | null>(null);
  const bargeInTimerRef = useRef<number | null>(null);
  const bargeInGenerationRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const vadIntervalRef = useRef<number | null>(null);
  const discardRecordingRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const recordingStartedAtRef = useRef(0);
  const lastSpeechAtRef = useRef(0);
  // Background-noise level; kept across turns (not recalibrated every time).
  const noiseFloorRef = useRef(0.005);
  const nativeListenerRef = useRef<PluginListenerHandle | null>(null);
  const nativeSilenceTimerRef = useRef<number | null>(null);
  const restartTimerRef = useRef<number | null>(null);
  const isStartingListeningRef = useRef(false);
  const listenGenerationRef = useRef(0);
  const isSendingRef = useRef(false);
  const mountedRef = useRef(true);
  const transcriptHandlerRef = useRef<(transcript: string) => void>(() => undefined);
  const startListeningRef = useRef<(options?: ListenOptions) => void>(() => undefined);
  const isCallEnded = () => phaseRef.current === "ended";

  useEffect(() => {
    complaintDraftRef.current = complaintDraft;
  }, [complaintDraft]);

  // Reads the draft from a ref so this callback stays stable.
  const getRecoveryMessage = useCallback((message: string) => {
    const draft = complaintDraftRef.current;
    return draft && Object.keys(draft).length > 0
      ? `${message} ${t("inAppCall.draftPreserved")}`
      : message;
  }, [t]);

  const setCallPhase = useCallback((nextPhase: CallPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const getMicMonitor = useCallback(() => {
    if (!micMonitorRef.current) micMonitorRef.current = new MicMonitor();
    return micMonitorRef.current;
  }, []);

  const stopBargeIn = useCallback(() => {
    bargeInGenerationRef.current += 1;
    if (bargeInTimerRef.current !== null) {
      window.clearTimeout(bargeInTimerRef.current);
      bargeInTimerRef.current = null;
    }
    bargeInStopRef.current?.();
    bargeInStopRef.current = null;
    // On the Android/iOS app the native recognizer needs the mic for itself,
    // so the monitor is only kept open while the assistant is speaking.
    if (Capacitor.isNativePlatform()) getMicMonitor().release();
  }, [getMicMonitor]);

  const stopSpeaking = useCallback(() => {
    speechSequenceRef.current += 1;
    speechQueueRef.current = [];
    if (speechTimerRef.current !== null) {
      window.clearTimeout(speechTimerRef.current);
      speechTimerRef.current = null;
    }
    stopBargeIn();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, [stopBargeIn]);

  const stopBrowserRecording = useCallback((discard = true) => {
    if (vadIntervalRef.current !== null) {
      window.clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    const recorder = recorderRef.current;
    recorderRef.current = null;
    discardRecordingRef.current = discard;
    if (discard) {
      audioChunksRef.current = [];
    } else {
      isSendingRef.current = true;
      setCallPhase("thinking");
    }
    if (recorder && recorder.state !== "inactive") {
      try {
        recorder.stop();
      } catch (error) {
        console.error("Could not stop voice-call audio recording:", error);
        isSendingRef.current = false;
        if (!discard && mountedRef.current) {
          setCallError(getRecoveryMessage(t("inAppCall.transcriptionError")));
          setCallPhase("error");
        }
      }
    }
    // The mic stream itself stays open in the MicMonitor for the next turn.
  }, [getRecoveryMessage, setCallPhase, t]);

  const stopRecognition = useCallback(() => {
    // Invalidates any startListening call that is still awaiting permissions/mic.
    listenGenerationRef.current += 1;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (nativeSilenceTimerRef.current !== null) {
      window.clearTimeout(nativeSilenceTimerRef.current);
      nativeSilenceTimerRef.current = null;
    }
    stopBrowserRecording();
    if (nativeListenerRef.current) {
      void nativeListenerRef.current.remove();
      nativeListenerRef.current = null;
      void SpeechRecognition.stop().catch((error: unknown) => {
        console.warn("Could not stop native voice-call speech recognition:", error);
      });
    }
  }, [stopBrowserRecording]);

  const releaseMic = useCallback(() => {
    stopBargeIn();
    getMicMonitor().release();
  }, [getMicMonitor, stopBargeIn]);

  const endCall = useCallback(() => {
    setCallPhase("ended");
    stopRecognition();
    stopSpeaking();
    releaseMic();
    setCallTurns([]);
    pendingTranscriptRef.current = null;
    setHasPendingTranscript(false);
    complaintSubmissionRef.current = null;
    endCallAfterReplyRef.current = false;
    onEnd(submittedComplaintNumberRef.current ?? undefined);
  }, [onEnd, releaseMic, setCallPhase, stopRecognition, stopSpeaking]);

  const finishAssistantTurn = useCallback(() => {
    if (!mountedRef.current || phaseRef.current !== "speaking") return;
    stopBargeIn();
    if (endCallAfterReplyRef.current) {
      endCall();
      return;
    }
    setCallPhase("listening");
    if (mutedRef.current) return;
    if (restartTimerRef.current !== null) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      startListeningRef.current();
    }, Capacitor.isNativePlatform() ? 250 : 0);
  }, [endCall, setCallPhase, stopBargeIn]);

  // Stops the assistant mid-sentence and starts listening to the caller.
  const interruptAssistant = useCallback((callerAlreadySpeaking: boolean) => {
    if (!mountedRef.current || phaseRef.current !== "speaking") return;
    stopSpeaking();
    setCallPhase("listening");
    if (mutedRef.current) return;
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (Capacitor.isNativePlatform()) {
      // Give the OS a moment to hand the mic to the native recognizer.
      restartTimerRef.current = window.setTimeout(() => {
        restartTimerRef.current = null;
        startListeningRef.current();
      }, 150);
    } else {
      // Browser: the mic is already open, start recording immediately.
      startListeningRef.current({ speechInProgress: callerAlreadySpeaking });
    }
  }, [setCallPhase, stopSpeaking]);

  const startBargeIn = useCallback(() => {
    stopBargeIn();
    if (
      !BARGE_IN_ENABLED ||
      mutedRef.current ||
      !speakerRef.current ||
      phaseRef.current !== "speaking" ||
      !MicMonitor.isSupported()
    ) return;
    const generation = bargeInGenerationRef.current;
    const monitor = getMicMonitor();
    monitor
      .acquire()
      .then(() => {
        if (
          generation !== bargeInGenerationRef.current ||
          !mountedRef.current ||
          phaseRef.current !== "speaking" ||
          mutedRef.current
        ) return;
        bargeInStopRef.current = startBargeInDetector(monitor, {
          minThreshold: BARGE_IN_MIN_THRESHOLD,
          echoMultiplier: BARGE_IN_ECHO_MULTIPLIER,
          requiredMs: BARGE_IN_REQUIRED_MS,
          warmupMs: BARGE_IN_WARMUP_MS,
          noiseFloor: noiseFloorRef.current,
          onLevel: SHOW_MIC_DEBUG
            ? (level, threshold) =>
              setMicDebug(
                `speaking · mic ${level.toFixed(3)} · trigger ${
                  Number.isNaN(threshold) ? "learning" : threshold.toFixed(3)
                }`,
              )
            : undefined,
          onBargeIn: () => interruptAssistant(true),
        });
      })
      .catch((error: unknown) => {
        // Barge-in is optional; tap-to-interrupt still works.
        console.warn("Voice interruption is unavailable:", error);
      });
  }, [getMicMonitor, interruptAssistant, stopBargeIn]);

  const speakReply = useCallback((text: string) => {
    if (!speakerRef.current) {
      finishAssistantTurn();
      return;
    }

    if (!("speechSynthesis" in window)) {
      setCallError(t("inAppCall.speechOutputUnsupported"));
      setCallPhase("error");
      return;
    }

    stopSpeaking();
    const sequence = speechSequenceRef.current;
    speechQueueRef.current = splitSpeechIntoPhrases(text);

    // Start listening for interruptions as soon as audio actually starts,
    // so the detector learns the assistant's own voice level first.
    let bargeInArmed = false;
    const armBargeIn = () => {
      if (bargeInArmed || sequence !== speechSequenceRef.current) return;
      bargeInArmed = true;
      startBargeIn();
    };

    const speakNextPhrase = () => {
      if (sequence !== speechSequenceRef.current) return;
      const phrase = speechQueueRef.current.shift();
      if (!phrase) {
        finishAssistantTurn();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = speechLanguage[language] ?? language;
      utterance.rate = SPEECH_RATE;
      let phraseCompleted = false;
      const scheduleNextPhrase = () => {
        if (phraseCompleted) return;
        phraseCompleted = true;
        if (sequence !== speechSequenceRef.current) return;
        speechTimerRef.current = window.setTimeout(() => {
          speechTimerRef.current = null;
          speakNextPhrase();
        }, /[?!.।]$/u.test(phrase) ? SENTENCE_PAUSE_MS : CLAUSE_PAUSE_MS);
      };
      utterance.onstart = armBargeIn;
      utterance.onend = scheduleNextPhrase;
      utterance.onerror = (event) => {
        if (event.error !== "interrupted" && event.error !== "canceled") {
          console.warn("Device speech synthesis failed:", event.error);
        }
        scheduleNextPhrase();
      };
      window.speechSynthesis.speak(utterance);
    };
    speakNextPhrase();

    if (sequence === speechSequenceRef.current && !mutedRef.current) {
      bargeInTimerRef.current = window.setTimeout(armBargeIn, BARGE_IN_FALLBACK_START_MS);
    }
  }, [finishAssistantTurn, language, setCallPhase, startBargeIn, stopSpeaking, t]);

  const submitTranscript = useCallback(async (rawTranscript: string) => {
    const transcript = rawTranscript.trim();
    if (!transcript || isSendingRef.current || phaseRef.current === "ended") return;

    isSendingRef.current = true;
    pendingTranscriptRef.current = transcript;
    setHasPendingTranscript(true);
    stopRecognition();
    stopSpeaking();
    setCallError("");
    setCallPhase("thinking");
    let isCreatingComplaint = false;
    let submittedComplaintNumber: string | null = null;
    const createConfirmedComplaint = async (draft: VoiceCallComplaintDraft) => {
      isCreatingComplaint = true;
      const submission = {
        category: draft.category,
        details: draft.details,
        area: draft.area,
        name: draft.name,
        phone: draft.phone,
      };
      const fingerprint = JSON.stringify(submission);
      if (complaintSubmissionRef.current?.fingerprint !== fingerprint) {
        complaintSubmissionRef.current = {
          fingerprint,
          key: createIdempotencyKey(),
        };
      }
      const result = await submitVoiceCallComplaint(draft, complaintSubmissionRef.current.key);
      submittedComplaintNumber = result.complaintNumber;
      setComplaints(result.complaints);
      pendingTranscriptRef.current = null;
      complaintSubmissionRef.current = null;
      if (!mountedRef.current || isCallEnded()) return;
      setHasPendingTranscript(false);
      const reply = t("inAppCall.complaintCreated", {
        complaintNumber: result.complaintNumber,
      });
      setComplaintDraft(undefined);
      setAwaitingComplaintConfirmation(false);
      setCallTurns((turns) => [
        ...turns,
        { role: "user" as const, content: transcript },
        { role: "assistant" as const, content: reply },
      ].slice(-8));
      submittedComplaintNumberRef.current = result.complaintNumber;
      endCallAfterReplyRef.current = true;
      setCallPhase("speaking");
      speakReply(reply);
    };
    try {
      if (
        awaitingComplaintConfirmation &&
        isAffirmativeVoiceConfirmation(transcript) &&
        complaintDraft
      ) {
        await createConfirmedComplaint(complaintDraft);
        return;
      }

      const result = await getVoiceCallReply({
        message: transcript,
        language,
        context: callTurns,
        complaintDraft,
        confirmationPending: awaitingComplaintConfirmation,
      });
      if (!mountedRef.current || isCallEnded()) return;
      if (result.action === "submit") {
        await createConfirmedComplaint(result.complaintDraft ?? complaintDraft ?? {});
        return;
      }
      pendingTranscriptRef.current = null;
      setHasPendingTranscript(false);
      setCallTurns((turns) => [
        ...turns,
        { role: "user" as const, content: transcript },
        { role: "assistant" as const, content: result.reply },
      ].slice(-8));
      if (result.complaintDraft) setComplaintDraft(result.complaintDraft);
      setAwaitingComplaintConfirmation(result.action === "confirm");
      setCallPhase("speaking");
      speakReply(result.reply);
    } catch (error) {
      console.error("In-app AI call turn failed.");
      if (mountedRef.current && !isCallEnded()) {
        setCallError(
          getRecoveryMessage(submittedComplaintNumber
            ? t("inAppCall.complaintSavedNotVisible", { complaintNumber: submittedComplaintNumber })
            : t(isCreatingComplaint ? "inAppCall.complaintCreateError" : getVoiceCallErrorKey(error))),
        );
        setCallPhase("error");
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [
    awaitingComplaintConfirmation,
    callTurns,
    complaintDraft,
    getRecoveryMessage,
    language,
    setCallPhase,
    speakReply,
    stopRecognition,
    stopSpeaking,
    t,
  ]);

  useEffect(() => {
    transcriptHandlerRef.current = (transcript) => {
      void submitTranscript(transcript);
    };
  }, [submitTranscript]);

  const startListening = useCallback(async (options: ListenOptions = {}) => {
    if (
      !mountedRef.current ||
      phaseRef.current === "ended" ||
      phaseRef.current === "thinking" ||
      phaseRef.current === "speaking" ||
      mutedRef.current ||
      recorderRef.current ||
      nativeListenerRef.current ||
      isStartingListeningRef.current
    ) return;

    isStartingListeningRef.current = true;
    const generation = listenGenerationRef.current;
    const isCancelled = () =>
      !mountedRef.current ||
      isCallEnded() ||
      mutedRef.current ||
      phaseRef.current === "thinking" ||
      phaseRef.current === "speaking" ||
      generation !== listenGenerationRef.current;

    try {
      setCallError("");
      setCallPhase("listening");
      const locale = speechLanguage[language] ?? language;

      if (Capacitor.isNativePlatform()) {
        try {
          const availability = await SpeechRecognition.available();
          if (isCancelled()) return;
          if (availability.available) {
            // Free the mic for the native recognizer.
            getMicMonitor().release();
            const permission = await SpeechRecognition.requestPermissions();
            if (isCancelled()) return;
            if (permission.speechRecognition !== "granted") {
              setCallError(getRecoveryMessage(t("inAppCall.permissionError")));
              setCallPhase("error");
              return;
            }
            const handle = await SpeechRecognition.addListener(
              "partialResults",
              (event: NativePartialResult) => {
                const transcript = event.matches?.[0]?.trim();
                if (!transcript) return;
                if (nativeSilenceTimerRef.current !== null) {
                  window.clearTimeout(nativeSilenceTimerRef.current);
                }
                nativeSilenceTimerRef.current = window.setTimeout(() => {
                  transcriptHandlerRef.current(transcript);
                }, NATIVE_SILENCE_DURATION_MS);
              },
            );
            if (isCancelled()) {
              void handle.remove();
              return;
            }
            nativeListenerRef.current = handle;
            await SpeechRecognition.start({
              language: locale,
              maxResults: 1,
              partialResults: true,
              popup: false,
            });
            return;
          }
        } catch (error) {
          console.error("Native call speech recognition could not start:", error);
          if (isCancelled()) return;
          stopRecognition();
          setCallError(getRecoveryMessage(t("inAppCall.permissionError")));
          setCallPhase("error");
          return;
        }
      }

      if (!MicMonitor.isSupported() || typeof MediaRecorder === "undefined") {
        setCallError(getRecoveryMessage(t("inAppCall.unsupportedError")));
        setCallPhase("error");
        return;
      }

      try {
        const monitor = getMicMonitor();
        const stream = await monitor.acquire();
        if (isCancelled()) return;

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "";
        const recorder = new MediaRecorder(
          stream,
          mimeType ? { mimeType } : undefined,
        );
        recorderRef.current = recorder;
        audioChunksRef.current = [];
        discardRecordingRef.current = false;
        recordingStartedAtRef.current = Date.now();
        lastSpeechAtRef.current = recordingStartedAtRef.current;
        // If the caller interrupted by voice, they are already talking.
        speechDetectedRef.current = Boolean(options.speechInProgress);

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && !discardRecordingRef.current) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.onerror = (event) => {
          console.error("Voice-call audio recording failed:", event);
          stopBrowserRecording();
          setCallError(getRecoveryMessage(t("inAppCall.transcriptionError")));
          setCallPhase("error");
        };
        recorder.onstop = () => {
          if (discardRecordingRef.current) {
            audioChunksRef.current = [];
            return;
          }
          const audio = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || "audio/webm",
          });
          audioChunksRef.current = [];
          if (!audio.size) {
            isSendingRef.current = false;
            setCallError(getRecoveryMessage(t("inAppCall.noSpeechError")));
            setCallPhase("error");
            return;
          }
          void transcribeVoiceMessage(audio, language)
            .then((transcript) => {
              isSendingRef.current = false;
              if (!mountedRef.current || isCallEnded()) return;
              if (!transcript?.trim()) {
                // Nothing understood: go back to listening instead of getting stuck on "thinking".
                setCallPhase("listening");
                startListeningRef.current();
                return;
              }
              transcriptHandlerRef.current(transcript);
            })
            .catch(() => {
              console.error("Voice-call speech transcription failed.");
              if (mountedRef.current && !isCallEnded()) {
                isSendingRef.current = false;
                setCallError(getRecoveryMessage(t("inAppCall.transcriptionError")));
                setCallPhase("error");
              }
            });
        };
        recorder.start(250);

        vadIntervalRef.current = window.setInterval(() => {
          const now = Date.now();
          const volume = monitor.level();
          const threshold = Math.max(SPEECH_THRESHOLD, noiseFloorRef.current * 2.2);
          if (SHOW_MIC_DEBUG) {
            setMicDebug(`listening · mic ${volume.toFixed(3)} · speech ${threshold.toFixed(3)}`);
          }

          if (volume >= threshold) {
            speechDetectedRef.current = true;
            lastSpeechAtRef.current = now;
          } else if (!speechDetectedRef.current) {
            // Learn background noise while the caller is quiet.
            noiseFloorRef.current = Math.min(
              0.03,
              noiseFloorRef.current * 0.95 + volume * 0.05,
            );
          }

          if (
            speechDetectedRef.current &&
            (now - lastSpeechAtRef.current >= SILENCE_DURATION_MS ||
              now - recordingStartedAtRef.current >= MAX_RECORDING_DURATION_MS)
          ) {
            stopBrowserRecording(false);
          } else if (
            !speechDetectedRef.current &&
            now - recordingStartedAtRef.current >= NO_SPEECH_TIMEOUT_MS
          ) {
            stopBrowserRecording();
            setCallError(getRecoveryMessage(t("inAppCall.noSpeechError")));
            setCallPhase("error");
          }
        }, VAD_INTERVAL_MS);
      } catch (error) {
        console.error("Browser call audio capture could not start:", error);
        stopBrowserRecording();
        if (isCancelled()) return;
        getMicMonitor().release();
        setCallError(getRecoveryMessage(t("inAppCall.permissionError")));
        setCallPhase("error");
      }
    } finally {
      isStartingListeningRef.current = false;
    }
  }, [
    getMicMonitor,
    getRecoveryMessage,
    language,
    setCallPhase,
    stopBrowserRecording,
    stopRecognition,
    t,
  ]);

  useEffect(() => {
    startListeningRef.current = (options) => {
      void startListening(options);
    };
  }, [startListening]);

  // Latest callbacks for the mount effect, so it runs once per call.
  const lifecycleRef = useRef({ speakReply, stopRecognition, stopSpeaking, releaseMic, t });
  useEffect(() => {
    lifecycleRef.current = { speakReply, stopRecognition, stopSpeaking, releaseMic, t };
  }, [speakReply, stopRecognition, stopSpeaking, releaseMic, t]);

  useEffect(() => {
    mountedRef.current = true;
    const greetingTimer = window.setTimeout(() => {
      const { speakReply: speak, t: translate } = lifecycleRef.current;
      speak(translate("inAppCall.greeting"));
    }, 0);
    const durationTimer = window.setInterval(() => {
      if (phaseRef.current !== "ended") {
        setElapsedSeconds((seconds) => seconds + 1);
      }
    }, 1000);
    return () => {
      mountedRef.current = false;
      window.clearTimeout(greetingTimer);
      window.clearInterval(durationTimer);
      lifecycleRef.current.stopRecognition();
      lifecycleRef.current.stopSpeaking();
      lifecycleRef.current.releaseMic();
    };
  }, []);

  const toggleMute = () => {
    const nextMuted = !mutedRef.current;
    mutedRef.current = nextMuted;
    setMuted(nextMuted);
    if (nextMuted) {
      stopRecognition();
      releaseMic();
    } else if (phaseRef.current === "error" || phaseRef.current === "listening") {
      setCallPhase("listening");
      startListeningRef.current();
    } else if (phaseRef.current === "speaking") {
      // Re-enable interrupting while the assistant is still talking.
      startBargeIn();
    }
  };

  const toggleSpeaker = () => {
    const nextSpeakerOn = !speakerRef.current;
    speakerRef.current = nextSpeakerOn;
    setSpeakerOn(nextSpeakerOn);
    if (!nextSpeakerOn && phaseRef.current === "speaking") {
      stopSpeaking();
      finishAssistantTurn();
    }
  };

  const openKeypad = async () => {
    stopRecognition();
    stopSpeaking();
    setCallPhase("listening");
    setKeypadOpen(true);
    setKeypadDigits("");
    lastLookedUpDigitsRef.current = "";
    setKeypadError("");
    setCallError("");
    setMatchingComplaints([]);
    if (complaints !== null || isLoadingComplaints) return;
    setIsLoadingComplaints(true);
    try {
      setComplaints(await getComplaints());
    } catch (error) {
      console.error("Could not load complaints for the in-app call keypad:", error);
      setKeypadError(t("inAppCall.complaintsLoadError"));
    } finally {
      setIsLoadingComplaints(false);
    }
  };

  const closeKeypad = () => {
    setKeypadOpen(false);
    setKeypadDigits("");
    lastLookedUpDigitsRef.current = "";
    setKeypadError("");
    setMatchingComplaints([]);
    if (!mutedRef.current && phaseRef.current !== "ended") {
      setCallPhase("listening");
      startListeningRef.current();
    }
  };

  const selectComplaint = useCallback((complaint: ComplaintRecord) => {
    setKeypadOpen(false);
    setKeypadDigits("");
    setMatchingComplaints([]);
    void submitTranscript(t("inAppCall.keypadLookupPrompt", {
      complaintNumber: complaint.complaintNumber,
    }));
  }, [submitTranscript, t]);

  const lookupComplaint = useCallback((digits: string) => {
    if (digits.length !== 4 || !complaints) return;
    const matches = complaints.filter((item) => item.complaintNumber.endsWith(digits));
    if (matches.length === 0) {
      setKeypadError(t("inAppCall.complaintNotFound"));
      return;
    }
    if (matches.length > 1) {
      setMatchingComplaints(matches);
      setKeypadError("");
      return;
    }
    selectComplaint(matches[0]);
  }, [complaints, selectComplaint, t]);

  useEffect(() => {
    if (
      !keypadOpen ||
      keypadDigits.length !== 4 ||
      isLoadingComplaints ||
      !complaints ||
      lastLookedUpDigitsRef.current === keypadDigits
    ) return;
    lastLookedUpDigitsRef.current = keypadDigits;
    lookupComplaint(keypadDigits);
  }, [complaints, isLoadingComplaints, keypadDigits, keypadOpen, lookupComplaint]);

  const formattedDuration = `${String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:${String(
    elapsedSeconds % 60,
  ).padStart(2, "0")}`;
  const phaseLabel = phase === "listening"
    ? t("inAppCall.listening")
    : phase === "thinking"
      ? t("inAppCall.thinking")
      : phase === "speaking"
        ? t("inAppCall.speaking")
        : phase === "error"
          ? t("inAppCall.needsAttention")
          : t("inAppCall.ended");
  const tapToInterruptLabel = t("inAppCall.tapToInterrupt", "Tap to interrupt");

  return (
    <main className="flex min-h-dvh justify-center bg-slate-200 text-slate-900">
      <div className="relative flex min-h-dvh w-full max-w-[620px] flex-col overflow-hidden bg-gradient-to-b from-blue-100 via-blue-50 to-white">
        <header className="flex items-center justify-between px-5 pt-6">
          <button
            type="button"
            onClick={endCall}
            aria-label={t("back")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-700 shadow-sm"
          >
            <FiArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="font-bold">{t("inAppCall.title")}</h1>
            <p className="text-xs text-slate-500">{t("inAppCall.subtitle")}</p>
          </div>
          <span className="w-10" />
        </header>

        <section className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-5">
          <div className="mt-12 flex flex-col items-center">
            <button
              type="button"
              onClick={() => interruptAssistant(false)}
              disabled={phase !== "speaking"}
              aria-label={tapToInterruptLabel}
              className={`relative flex h-56 w-56 items-center justify-center rounded-full border-2 border-blue-200 disabled:cursor-default ${
                phase === "listening" ? "animate-pulse" : ""
              }`}
            >
              <span className="absolute inset-5 rounded-full bg-blue-200/50" />
              <span className="absolute inset-10 rounded-full bg-blue-300/60" />
              <span className="relative flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-blue-800 text-white shadow-xl">
                <FiHeadphones size={52} />
              </span>
            </button>
            <h2 className="mt-5 text-2xl font-extrabold">{t("inAppCall.title")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("inAppCall.office")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800">
                ● {phaseLabel} · {formattedDuration}
              </span>
              <span className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600">
                <span className="mr-1 text-red-500">●</span>{t("inAppCall.privateCall")}
              </span>
            </div>
            {phase === "speaking" && (
              <p className="mt-3 text-xs text-slate-500">{tapToInterruptLabel}</p>
            )}
            {SHOW_MIC_DEBUG && micDebug && (
              <p className="mt-2 font-mono text-xs text-slate-500">{micDebug}</p>
            )}
          </div>

          <div className="mt-8 flex w-full flex-1 flex-col justify-end pb-5">
            {callError && (
              <div role="alert" className="mx-auto max-w-sm text-center text-sm text-red-700">
                {callError}
                <button
                  type="button"
                  onClick={() => {
                    setCallError("");
                    setCallPhase("listening");
                    if (pendingTranscriptRef.current) {
                      transcriptHandlerRef.current(pendingTranscriptRef.current);
                    } else {
                      startListeningRef.current();
                    }
                  }}
                  className="ml-2 font-bold underline"
                >
                  {t(
                    hasPendingTranscript
                      ? "inAppCall.retryLastQuestion"
                      : "inAppCall.tryAgain",
                  )}
                </button>
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-blue-100 bg-white/90 px-5 pb-7 pt-5">
          <div className="mx-auto flex max-w-sm items-start justify-between">
            <button type="button" onClick={toggleMute} className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                {muted ? <FiMicOff size={23} /> : <FiMic size={23} />}
              </span>
              {muted ? t("inAppCall.unmute") : t("inAppCall.mute")}
            </button>
            <button
              type="button"
              onClick={() => void openKeypad()}
              className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-600"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm text-2xl">
                ⠿
              </span>
              {t("inAppCall.keypad")}
            </button>
            <button type="button" onClick={toggleSpeaker} className="flex flex-col items-center gap-2 text-xs font-semibold text-slate-600">
              <span className="flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
                {speakerOn ? <FiVolume2 size={24} /> : <FiVolumeX size={24} />}
              </span>
              {speakerOn ? t("inAppCall.speakerOn") : t("inAppCall.speakerOff")}
            </button>
          </div>
          <button
            type="button"
            onClick={endCall}
            aria-label={t("inAppCall.endCall")}
            className="mx-auto mt-5 flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-200"
          >
            <FiPhone className="rotate-[135deg]" size={28} />
          </button>
          <p className="mt-2 text-center text-sm font-semibold text-red-700">{t("inAppCall.endCall")}</p>
        </footer>

        {keypadOpen && (
          <div className="absolute inset-x-0 bottom-0 z-20 flex max-h-[78%] flex-col overflow-y-auto rounded-t-3xl border-t border-blue-200 bg-gradient-to-b from-blue-100 via-blue-50 to-white shadow-2xl">
            <header className="flex items-center gap-3 px-5 pt-6">
              <button type="button" onClick={closeKeypad} aria-label={t("back")} className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                <FiArrowLeft size={20} />
              </button>
              <div>
                <h2 className="font-bold">{t("inAppCall.keypadTitle")}</h2>
                <p className="text-xs text-slate-500">{t("inAppCall.keypadPrompt")}</p>
              </div>
            </header>
            <div className="mx-5 mt-5 flex items-center justify-center rounded-2xl border-2 border-blue-500 bg-white px-4 py-4 text-xl font-bold shadow-sm" aria-live="polite">
              <span className="mr-2 text-sm font-semibold tracking-normal text-slate-500">
                JHS-{new Date().getFullYear()}-
              </span>
              <span className="min-w-12 tracking-[0.25em]">
                {isLoadingComplaints
                  ? t("inAppCall.loadingComplaints")
                  : keypadDigits || <span className="text-slate-300">••••</span>}
              </span>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500">{t("inAppCall.keypadHint")}</p>
            {keypadError && <p role="alert" className="mx-5 mt-3 text-center text-sm text-red-700">{keypadError}</p>}
            {matchingComplaints.length > 0 && (
              <section aria-label={t("inAppCall.chooseComplaint")} className="mx-5 mt-4 space-y-2">
                <p className="text-center text-sm font-semibold text-slate-700">
                  {t("inAppCall.multipleComplaintMatches")}
                </p>
                {matchingComplaints.map((complaint) => (
                  <button
                    type="button"
                    key={complaint.complaintNumber}
                    onClick={() => selectComplaint(complaint)}
                    className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-left shadow-sm"
                  >
                    <span className="block font-bold">{complaint.complaintNumber}</span>
                    <span className="mt-1 block text-sm text-slate-600">
                      {t(`problemPhoto.categories.${complaint.category}`)}
                      {complaint.location.area ? ` · ${complaint.location.area}` : ""}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-blue-700">
                      {t(`complaintTracking.status.${complaint.status}`)}
                    </span>
                  </button>
                ))}
              </section>
            )}
            <div className="mx-auto mt-5 grid w-full max-w-sm flex-1 grid-cols-3 content-center gap-x-5 gap-y-3 px-7">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "⌫"].map((key) => (
                <button
                  type="button"
                  key={key}
                  aria-label={key === "⌫" ? t("inAppCall.deleteDigit") : key}
                  onClick={() => {
                    setKeypadError("");
                    setMatchingComplaints([]);
                    if (key === "⌫") {
                      lastLookedUpDigitsRef.current = "";
                      setKeypadDigits((current) => current.slice(0, -1));
                    } else if (/^\d$/.test(key)) {
                      lastLookedUpDigitsRef.current = "";
                      setKeypadDigits((current) => current.length < 4 ? `${current}${key}` : current);
                    } else if (key === "*") {
                      lastLookedUpDigitsRef.current = "";
                      setKeypadDigits("");
                    }
                  }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold shadow-md shadow-blue-100 active:scale-95"
                >
                  {key === "⌫" ? <FiDelete size={21} /> : key}
                </button>
              ))}
            </div>
            <div className="flex justify-center gap-10 px-6 pb-7 pt-4">
              <button type="button" onClick={closeKeypad} className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-800 text-white" aria-label={t("back")}>
                <FiArrowLeft size={22} />
              </button>
              <button type="button" onClick={() => {
                lastLookedUpDigitsRef.current = "";
                setKeypadDigits("");
                setKeypadError("");
                setMatchingComplaints([]);
              }} className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm" aria-label={t("inAppCall.clearDigits")}>
                <FiX size={22} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default InAppCall;
