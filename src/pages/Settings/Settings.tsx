import { useEffect, useState } from "react";
import { FiArrowLeft, FiChevronRight, FiLogIn, FiLogOut, FiTrash2, FiVolume2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "../../hooks/redux";
import { clearAuth } from "../../store/slices/authSlice";
import { deleteAccount, signOut } from "../../services/authService";
import { clearChat } from "../../store/slices/chatSlice";
import { setPreference } from "../../store/slices/preferencesSlice";
import ConfirmationSheet from "../../components/ConfirmationSheet";
import { triggerHaptic } from "../../services/haptics";

interface ToggleRowProps {
  title: string;
  description?: string;
  enabled: boolean;
  onToggle: () => void;
}

const ToggleRow = ({ title, description, enabled, onToggle }: ToggleRowProps) => (
  <div className="flex items-center justify-between border-b border-slate-200 py-3 last:border-0 sm:py-5">
    <div className="pr-4">
      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition sm:h-9 sm:w-16 ${enabled ? "bg-blue-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition sm:h-7 sm:w-7 ${enabled ? "right-1" : "left-1"}`} />
    </button>
  </div>
);

const Settings = () => {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const isAuthLoading = useAppSelector((state) => state.auth.isLoading);
  const preferences = useAppSelector((state) => state.preferences);
  const [selector, setSelector] = useState<"speed" | "voice" | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [confirmation, setConfirmation] = useState<"logout" | "deleteAccount" | null>(null);

  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    loadVoices();
    window.speechSynthesis?.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", loadVoices);
  }, []);

  const updatePreference = <K extends keyof typeof preferences>(key: K, value: typeof preferences[K]) => {
    dispatch(setPreference({ key, value }));
    void triggerHaptic(preferences.vibration);
  };

  return (
    <main className="flex h-dvh justify-center bg-slate-300">
      <div className="flex h-full w-full max-w-[700px] flex-col overflow-y-auto bg-gradient-to-b from-blue-100 via-blue-50 to-white">
        <header className="flex items-center gap-3 bg-white px-4 py-3 sm:gap-5 sm:px-6 sm:py-5">
          <button type="button" onClick={() => navigate(-1)} aria-label={t("back")} className="text-slate-700">
            <FiArrowLeft size={27} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">{t("settingsPage.title")}</h1>
            <p className="text-sm text-slate-500">{t("settingsPage.subtitle")}</p>
          </div>
        </header>

        <div className="space-y-5 px-3 pb-6 pt-4 sm:space-y-8 sm:px-6 sm:pb-10 sm:pt-8">
          {!isAuthLoading && (
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
              {user ? (
                <>
                  <p className="text-sm font-semibold text-blue-600">Signed in</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{user.name || user.email}</h2>
                  <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={() => setConfirmation("logout")}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiLogOut /> Sign out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-slate-500">Guest mode</p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">Try the assistant without an account</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Guest conversations are temporary. Sign in to save chats, use History, and access your profile.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/auth")}
                    className="mt-4 flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white"
                  >
                    <FiLogIn /> Sign in or create account
                  </button>
                </>
              )}
            </section>
          )}
          <section>
            <h2 className="mb-3 px-2 text-base font-semibold text-slate-500">{t("settingsPage.listenSection")}</h2>
            <div className="rounded-2xl bg-white px-3 shadow-sm sm:rounded-3xl sm:px-5">
              <ToggleRow title={t("settingsPage.answerVoice")} description={t("settingsPage.answerVoiceDescription")} enabled={preferences.autoPlay} onToggle={() => updatePreference("autoPlay", !preferences.autoPlay)} />
              <button type="button" onClick={() => setSelector("speed")} className="flex w-full items-center justify-between border-b border-slate-200 py-3 text-left sm:py-5">
                <span className="text-base font-semibold text-slate-900 sm:text-lg">{t("settingsPage.speed")}</span>
                <span className="flex items-center gap-3 font-semibold text-blue-600">{preferences.playbackSpeed.toFixed(2).replace(/0$/, "")}x <FiChevronRight size={22} className="text-slate-400" /></span>
              </button>
              <button type="button" onClick={() => setSelector("voice")} className="flex w-full items-center justify-between border-b border-slate-200 py-3 text-left sm:py-5">
                <span className="text-base font-semibold text-slate-900 sm:text-lg">{t("settingsPage.voice")}</span>
                <span className="flex max-w-[55%] items-center gap-3 truncate font-semibold text-blue-600">{preferences.voiceName || t("settingsPage.systemVoice")} <FiChevronRight size={22} className="shrink-0 text-slate-400" /></span>
              </button>
              <ToggleRow title={t("settingsPage.highlight")} description={t("settingsPage.highlightDescription")} enabled={preferences.highlight} onToggle={() => updatePreference("highlight", !preferences.highlight)} />
            </div>
            <ConfirmationSheet
              open={confirmation !== null}
              title={confirmation === "deleteAccount" ? t("auth.deleteAccountTitle") : t("auth.logoutTitle")}
              message={confirmation === "deleteAccount" ? t("auth.deleteAccountConfirmation") : t("auth.logoutConfirmation")}
              confirmLabel={confirmation === "deleteAccount" ? t("auth.deleteAccount") : t("auth.logout")}
              cancelLabel={t("auth.cancel")}
              onCancel={() => setConfirmation(null)}
              onConfirm={() => {
                if (confirmation === "deleteAccount") {
                  void deleteAccount()
                    .then(() => {
                      dispatch(clearAuth());
                      dispatch(clearChat());
                      navigate("/", { replace: true });
                    })
                    .catch((error) => console.error("Account deletion failed:", error))
                    .finally(() => setConfirmation(null));
                  return;
                }
                void signOut()
                  .catch((error) => console.error("Sign out failed:", error))
                  .finally(() => {
                    dispatch(clearAuth());
                    dispatch(clearChat());
                    setConfirmation(null);
                  });
              }}
              destructive={confirmation === "deleteAccount"}
            />
          </section>

          <section>
            <h2 className="mb-3 px-2 text-base font-semibold text-slate-500">{t("settingsPage.speakSection")}</h2>
            <div className="rounded-3xl bg-white px-5 shadow-sm">
              <ToggleRow title={t("settingsPage.preview")} description={t("settingsPage.previewDescription")} enabled={preferences.preview} onToggle={() => updatePreference("preview", !preferences.preview)} />
              <ToggleRow title={t("settingsPage.autoSend")} description={t("settingsPage.autoSendDescription")} enabled={preferences.autoSend} onToggle={() => updatePreference("autoSend", !preferences.autoSend)} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 px-2 text-base font-semibold text-slate-500">{t("settingsPage.accessibility")}</h2>
            <div className="rounded-3xl bg-white px-5 shadow-sm">
              <ToggleRow title={t("settingsPage.largeText")} description={t("settingsPage.largeTextDescription")} enabled={preferences.largeText} onToggle={() => updatePreference("largeText", !preferences.largeText)} />
              <ToggleRow title={t("settingsPage.vibration")} description={t("settingsPage.vibrationDescription")} enabled={preferences.vibration} onToggle={() => updatePreference("vibration", !preferences.vibration)} />
            </div>
          </section>

          <button type="button" onClick={() => {
            if (!window.speechSynthesis) return;
            const utterance = new SpeechSynthesisUtterance(t("settingsPage.testVoiceText"));
            const selected = voices.find((voice) => voice.name === preferences.voiceName);
            if (selected) utterance.voice = selected;
            utterance.rate = preferences.playbackSpeed;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
          }} className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-blue-600 bg-white py-4 text-lg font-bold text-blue-600">
            <FiVolume2 size={24} /> {t("settingsPage.testVoice")}
          </button>
          {user && (
            <button
              type="button"
              onClick={() => setConfirmation("deleteAccount")}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 py-4 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <FiTrash2 /> {t("auth.deleteAccount")}
            </button>
          )}
        </div>
        {selector && (
          <div className="fixed inset-0 z-50 flex items-end bg-slate-900/40" onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelector(null);
          }}>
            <section className="w-full rounded-t-[2rem] bg-white px-6 pb-8 pt-4 shadow-2xl">
              <div className="mx-auto mb-5 h-1.5 w-16 rounded-full bg-slate-300" />
              <h2 className="text-xl font-bold text-slate-900">{selector === "speed" ? t("settingsPage.speed") : t("settingsPage.voice")}</h2>
              <div className="mt-4 space-y-2">
                {selector === "speed" ? [0.75, 1, 1.25, 1.5].map((speed) => (
                  <button key={speed} type="button" onClick={() => { updatePreference("playbackSpeed", speed); setSelector(null); }} className={`flex w-full justify-between rounded-2xl px-5 py-4 text-left font-semibold ${preferences.playbackSpeed === speed ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-800"}`}>
                    {speed.toFixed(2).replace(/0$/, "")}x {preferences.playbackSpeed === speed && "✓"}
                  </button>
                )) : (
                  <>
                    <button type="button" onClick={() => { updatePreference("voiceName", ""); setSelector(null); }} className="flex w-full justify-between rounded-2xl bg-slate-50 px-5 py-4 text-left font-semibold">
                      {t("settingsPage.systemVoice")} {!preferences.voiceName && "✓"}
                    </button>
                    {voices.map((voice) => (
                      <button key={voice.voiceURI} type="button" onClick={() => { updatePreference("voiceName", voice.name); setSelector(null); }} className={`flex w-full justify-between rounded-2xl px-5 py-4 text-left ${preferences.voiceName === voice.name ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-800"}`}>
                        <span className="truncate">{voice.name}</span><span>{preferences.voiceName === voice.name && "✓"}</span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export default Settings;
