import { type FormEvent, useState } from "react";
import { FiArrowLeft, FiCheck, FiEye, FiEyeOff, FiLock, FiMail, FiUser } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import leaderImage from "../../assets/images/leader.png";
import { useAppDispatch } from "../../hooks/redux";
import { setCredentials } from "../../store/slices/authSlice";
import { signIn, signUp } from "../../services/authService";
import axios from "axios";
import PasswordRecovery from "./PasswordRecovery";

const Auth = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation("common");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const result = isSignUp
        ? await signUp({ name: name.trim(), email: email.trim(), password })
        : await signIn({ email: email.trim(), password });
      dispatch(setCredentials(result));
      navigate("/", { replace: true });
    } catch (requestError) {
      const serverMessage =
        typeof requestError === "object" &&
        requestError !== null &&
        "response" in requestError &&
        typeof requestError.response === "object" &&
        requestError.response !== null &&
        "data" in requestError.response &&
        typeof requestError.response.data === "object" &&
        requestError.response.data !== null &&
        "error" in requestError.response.data &&
        typeof requestError.response.data.error === "string"
          ? requestError.response.data.error
          : null;
      const message = serverMessage
        ?? (axios.isAxiosError(requestError) && !requestError.response
          ? "Cannot reach the server. Check the phone internet connection and backend URL."
          : t("auth.genericError"));
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const switchMode = () => {
    setError("");
    setPassword("");
    setShowPassword(false);
    setIsSignUp((value) => !value);
  };

  return (
    <main className="min-h-dvh bg-slate-100 px-4 py-4 sm:px-8 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100dvh-2rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white shadow-2xl shadow-blue-900/10 sm:min-h-[calc(100dvh-4rem)] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 p-10 text-white lg:flex lg:flex-col">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
          <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-cyan-300/10" />
          <button
            type="button"
            onClick={() => navigate("/")}
            className="relative flex w-fit items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
          >
            <FiArrowLeft /> {t("auth.back")}
          </button>
          <div className="relative mt-auto">
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-2xl font-black ring-1 ring-white/25">
              AS
            </div>
            <h2 className="max-w-md text-4xl font-black leading-tight">
              {t("auth.panelTitle")}
            </h2>
            <p className="mt-4 max-w-md text-base leading-7 text-blue-100">
              {t("auth.panelDescription")}
            </p>
            <div className="mt-8 space-y-3 text-sm font-medium text-blue-50">
              {[t("auth.benefitOne"), t("auth.benefitTwo"), t("auth.benefitThree")].map((benefit) => (
                <p key={benefit} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400 text-blue-900">
                    <FiCheck size={15} />
                  </span>
                  {benefit}
                </p>
              ))}
            </div>
            <img src={leaderImage} alt="" className="absolute -bottom-10 right-0 w-64 opacity-90 xl:w-72" />
          </div>
        </aside>

        <section className="flex flex-col justify-center px-5 py-0 sm:px-12 lg:px-16 lg:py-7">
          <div className="relative -mx-5 mb-7 overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 px-5 pb-7 pt-5 text-white sm:-mx-12 sm:px-12 lg:hidden">
            <div className="absolute -right-14 -top-16 h-40 w-40 rounded-full bg-white/10" />
            <div className="absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-cyan-300/10" />
            <button
              type="button"
              onClick={() => navigate("/")}
              className="relative mb-6 flex w-fit items-center gap-2 text-sm font-semibold text-blue-100 transition hover:text-white"
            >
              <FiArrowLeft /> {t("auth.back")}
            </button>
            <div className="relative flex items-center justify-between gap-4">
              <div className="max-w-[15rem]">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-sm font-black ring-1 ring-white/25">
                  AS
                </div>
                <h2 className="text-xl font-black leading-tight">{t("auth.panelTitle")}</h2>
                <p className="mt-2 text-xs leading-5 text-blue-100">{t("auth.panelDescription")}</p>
              </div>
              <img src={leaderImage} alt="" className="w-24 shrink-0 opacity-90 sm:w-32" />
            </div>
          </div>
          {!isRecoveringPassword && <div className="mb-8">
            <div className="mb-5 hidden items-center gap-3 lg:flex">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white">AS</span>
              <span className="text-sm font-bold text-blue-700">{t("voice.assistantName")}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {isSignUp ? t("auth.signupTitle") : t("auth.loginTitle")}
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500 sm:text-base">
              {isSignUp ? t("auth.signupDescription") : t("auth.loginDescription")}
            </p>
          </div>}

          {isRecoveringPassword ? (
            <PasswordRecovery
              initialEmail={email}
              onBack={() => {
                setError("");
                setIsRecoveringPassword(false);
              }}
            />
          ) : <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <label className="block text-sm font-semibold text-slate-700">
                {t("auth.name")}
                <span className="relative mt-2 block">
                  <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} autoComplete="name" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-normal outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                </span>
              </label>
            )}
            <label className="block text-sm font-semibold text-slate-700">
              {t("auth.email")}
              <span className="relative mt-2 block">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 font-normal outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
              </span>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              {t("auth.password")}
              <span className="relative mt-2 block">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isSignUp ? 12 : 1} maxLength={72} autoComplete={isSignUp ? "new-password" : "current-password"} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 font-normal outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")} className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700">
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </span>
            </label>

            {error && <p role="alert" className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center rounded-2xl bg-blue-600 py-3.5 font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 hover:shadow-blue-600/30 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-60">
              {isSubmitting ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : isSignUp ? t("auth.signupButton") : t("auth.loginButton")}
            </button>
          </form>}

          {!isRecoveringPassword && (
            <>
              {!isSignUp && (
                <button type="button" onClick={() => setIsRecoveringPassword(true)} className="mt-5 self-center text-sm font-bold text-blue-600 hover:text-blue-700">
                  {t("auth.forgotPassword")}
                </button>
              )}
              <p className="mt-7 text-center text-sm text-slate-500">
                {isSignUp ? t("auth.haveAccount") : t("auth.noAccount")}{" "}
                <button type="button" onClick={switchMode} className="font-bold text-blue-600 hover:text-blue-700">
                  {isSignUp ? t("auth.loginLink") : t("auth.signupLink")}
                </button>
              </p>
              <p className="mt-5 text-center text-xs leading-5 text-slate-400">{t("auth.privacyNote")}</p>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

export default Auth;
