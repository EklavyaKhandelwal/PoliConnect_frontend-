import { useEffect, useState, type FormEvent } from "react";
import { FiArrowLeft, FiLock, FiMail } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { requestPasswordReset, resetPassword } from "../../services/authService";

interface PasswordRecoveryProps {
  initialEmail: string;
  onBack: () => void;
}

const PasswordRecovery = ({ initialEmail, onBack }: PasswordRecoveryProps) => {
  const { t } = useTranslation("common");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      if (!codeRequested) {
        await requestPasswordReset(email.trim());
        setCodeRequested(true);
        setResendSeconds(60);
        setMessage(t("auth.recoveryRequested"));
      } else {
        await resetPassword({ email: email.trim(), code: code.trim(), password });
        setResetComplete(true);
        setMessage(t("auth.passwordResetSuccess"));
      }
    } catch (requestError) {
      const serverMessage = axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data?.error
        : null;
      setError(serverMessage || t("auth.recoveryError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    setError("");
    setMessage("");
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setResendSeconds(60);
      setMessage(t("auth.recoveryRequested"));
    } catch (requestError) {
      const serverMessage = axios.isAxiosError<{ error?: string }>(requestError)
        ? requestError.response?.data?.error
        : null;
      setError(serverMessage || t("auth.recoveryError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <button type="button" onClick={onBack} className="mb-5 flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
        <FiArrowLeft /> {t("auth.backToLogin")}
      </button>
      <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("auth.recoveryTitle")}</h1>
      <p className="mt-3 mb-7 max-w-md text-sm leading-6 text-slate-500 sm:text-base">{t("auth.recoveryDescription")}</p>

      {resetComplete ? (
        <div>
          <p role="status" className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm leading-5 text-emerald-800">{message}</p>
          <button type="button" onClick={onBack} className="mt-5 flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 font-bold text-white hover:bg-blue-700">
            {t("auth.backToLogin")}
          </button>
        </div>
      ) : (
        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            {t("auth.email")}
            <span className="relative mt-2 block">
              <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254} autoComplete="email" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-normal outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
            </span>
          </label>
          {codeRequested && (
            <>
              <p role="status" className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-800">{message}</p>
              <label className="block text-sm font-semibold text-slate-700">
                {t("auth.recoveryCode")}
                <input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} required className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 font-normal tracking-[0.3em] outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
              </label>
              <button type="button" onClick={() => void resendCode()} disabled={isSubmitting || resendSeconds > 0} className="text-left text-sm font-bold text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400">
                {resendSeconds > 0 ? t("auth.resendCodeCountdown", { seconds: resendSeconds }) : t("auth.resendCode")}
              </button>
              <label className="block text-sm font-semibold text-slate-700">
                {t("auth.newPassword")}
                <span className="relative mt-2 block">
                  <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={72} autoComplete="new-password" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-normal outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                </span>
              </label>
            </>
          )}
          {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</p>}
          <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {isSubmitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : codeRequested ? t("auth.resetPasswordButton") : t("auth.sendRecoveryCode")}
          </button>
        </form>
      )}
    </div>
  );
};

export default PasswordRecovery;
