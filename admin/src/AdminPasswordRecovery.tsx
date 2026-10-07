import { useEffect, useState, type FormEvent } from "react";
import { FiArrowLeft, FiLock, FiMail } from "react-icons/fi";
import {
  requestAdminPasswordRecovery,
  resetAdminPassword,
} from "./adminPasswordRecoveryService";

interface AdminPasswordRecoveryProps {
  initialEmail: string;
  text: {
    emailAddress: string;
    recoveryTitle: string;
    recoveryDescription: string;
    backToSignIn: string;
    recoveryCode: string;
    resendCode: string;
    resendCodeCountdown: string;
    newPassword: string;
    sendRecoveryCode: string;
    resetPassword: string;
    recoveryRequested: string;
    passwordResetSuccess: string;
    recoveryError: string;
  };
  onBack: () => void;
}

export default function AdminPasswordRecovery({
  initialEmail,
  text,
  onBack,
}: AdminPasswordRecoveryProps) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!resendSeconds) return;
    const timer = window.setTimeout(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!codeRequested) {
        await requestAdminPasswordRecovery(email.trim());
        setCodeRequested(true);
        setResendSeconds(60);
      } else {
        await resetAdminPassword({ email: email.trim(), code: code.trim(), password });
        setCompleted(true);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text.recoveryError);
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setError("");
    setBusy(true);
    try {
      await requestAdminPasswordRecovery(email.trim());
      setResendSeconds(60);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text.recoveryError);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {completed ? (
        <>
          <p className="auth-security-note" role="status">{text.passwordResetSuccess}</p>
          <button className="auth-submit" type="button" onClick={onBack}>{text.backToSignIn}</button>
        </>
      ) : (
        <>
          <form className="auth-form" onSubmit={(event) => void submit(event)}>
            <label>{text.emailAddress}
              <span className="auth-input-wrap">
                <FiMail aria-hidden="true" />
                <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
              </span>
            </label>
            {codeRequested && (
              <>
                <p className="auth-security-note" role="status">{text.recoveryRequested}</p>
                <button type="button" className="auth-retry" disabled={busy || resendSeconds > 0} onClick={() => void resendCode()}>
                  {resendSeconds > 0
                    ? text.resendCodeCountdown.replace("{{seconds}}", String(resendSeconds))
                    : text.resendCode}
                </button>
                <label>{text.recoveryCode}
                  <span className="auth-input-wrap">
                    <input className="admin-recovery-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} />
                  </span>
                </label>
                <label>{text.newPassword}
                  <span className="auth-input-wrap">
                    <FiLock aria-hidden="true" />
                    <input type="password" autoComplete="new-password" minLength={12} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} />
                  </span>
                </label>
              </>
            )}
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? <span className="auth-spinner" /> : codeRequested ? text.resetPassword : text.sendRecoveryCode}
            </button>
          </form>
          <button className="auth-retry" type="button" onClick={onBack}>
            <FiArrowLeft aria-hidden="true" /> {text.backToSignIn}
          </button>
        </>
      )}
    </div>
  );
}
