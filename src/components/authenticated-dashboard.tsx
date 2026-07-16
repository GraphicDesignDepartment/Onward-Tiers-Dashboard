"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import CustomerDashboard from "@/components/customer-dashboard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type AuthState = "checking" | "demo" | "signed-out" | "signed-in" | "recovery";
const yearWords: Record<number,string> = {1:"ONE",2:"TWO",3:"THREE",4:"FOUR",5:"FIVE",6:"SIX",7:"SEVEN",8:"EIGHT",9:"NINE",10:"TEN"};
const anniversaryLabel = (years:number) => `${yearWords[years] ?? years}-YEAR ANNIVERSARY`;

export default function AuthenticatedDashboard() {
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const [authState, setAuthState] = useState<AuthState>(isSupabaseConfigured ? "checking" : "demo");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [anniversaryYears, setAnniversaryYears] = useState(2);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.from("public_brand_settings").select("anniversary_years").eq("id","signin").single().then(({data}) => {
      if (data?.anniversary_years) setAnniversaryYears(data.anniversary_years);
    });

    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? "signed-in" : "signed-out");
      if (data.session?.user.email) setEmail(data.session.user.email);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setAuthState("recovery");
        return;
      }
      if (!session) {
        setAuthState("signed-out");
        return;
      }
      if (session.user.email) setEmail(session.user.email);
      setAuthState((current) => current === "recovery" ? current : "signed-in");
    });

    return () => listener.subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  function clearFeedback() {
    setMessage(null);
    setError(null);
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setSending(true);
    clearFeedback();

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSending(false);
    if (signInError) {
      setError(signInError.message === "Invalid login credentials"
        ? "The email or password is incorrect. Use Forgot password if this is your first password setup."
        : signInError.message);
    }
  }

  async function sendPasswordReset() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    clearFeedback();
    if (!email.trim()) {
      setError("Enter your approved email address first.");
      return;
    }
    setSending(true);
    const redirectTo = `${window.location.origin}${basePath}/`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setSending(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setMessage("Password setup email sent. Open it to choose your password.");
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    clearFeedback();
    if (password.length < 8) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setSending(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSending(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setPassword("");
    setConfirmPassword("");
    setMessage("Password updated successfully.");
    setAuthState("signed-in");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
    setPassword("");
    clearFeedback();
  }

  function beginPasswordChange() {
    setPassword("");
    setConfirmPassword("");
    clearFeedback();
    setAuthState("recovery");
  }

  if (authState === "demo" || authState === "signed-in") {
    return (
      <CustomerDashboard
        onSignOut={authState === "signed-in" ? signOut : undefined}
        onChangePassword={authState === "signed-in" ? beginPasswordChange : undefined}
      />
    );
  }

  if (authState === "checking") {
    return (
      <main className="auth-page auth-loading" aria-live="polite">
        <LoaderCircle className="auth-spinner" size={28} />
        <p>Checking your secure session…</p>
      </main>
    );
  }

  const isRecovery = authState === "recovery";

  return (
    <main className="auth-page auth-illustrated-page">
      <section className="auth-art-panel" aria-label="Signs of Life anniversary artwork">
        <div className="auth-art-stage">
          <span className="art-orbit" aria-hidden="true" />
          <span className="art-star art-star-one" aria-hidden="true">✦</span>
          <span className="art-star art-star-two" aria-hidden="true">✦</span>
          <span className="art-rocket-glow" aria-hidden="true" />
          <Image className="signs-artwork" src={`${basePath}/signs-of-life.png`} alt="Signs of Life — On the Moon by Onward Customs" width={1256} height={1568} priority />
          <span className="anniversary-live-label">{anniversaryLabel(anniversaryYears)}</span>
        </div>
      </section>
      <section className="auth-card auth-login-panel" aria-labelledby="sign-in-title">
        <div className="auth-brand-row">
          <Image src={`${basePath}/onward-logo.png`} alt="Onward Customs" width={190} height={52} priority />
          <span className="auth-shield"><ShieldCheck size={19} /></span>
        </div>
        <span className="auth-eyebrow"><LockKeyhole size={14} /> Secure rewards access</span>
        <h1 id="sign-in-title">{isRecovery ? "Choose your secure password" : "Welcome back to your rewards"}</h1>
        <p>{isRecovery
          ? "Create a password you’ll use with your approved email address."
          : "Sign in with your email and password. Your secure session stays active until you explicitly sign out."}</p>

        {isRecovery ? (
          <form onSubmit={updatePassword}>
            <label htmlFor="new-password">New password</label>
            <div className="password-field">
              <input id="new-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <label htmlFor="confirm-password">Confirm password</label>
            <input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} required />
            <button className="auth-submit" type="submit" disabled={sending}>{sending ? <LoaderCircle className="auth-spinner" size={18} /> : <KeyRound size={18} />}{sending ? "Updating password…" : "Save password and continue"}</button>
          </form>
        ) : (
          <form onSubmit={signIn}>
            <label htmlFor="rewards-email">Email address</label>
            <input id="rewards-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" placeholder="you@example.com" required />
            <div className="auth-password-label"><label htmlFor="rewards-password">Password</label><button type="button" onClick={() => void sendPasswordReset()}>Forgot password?</button></div>
            <div className="password-field">
              <input id="rewards-password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
            </div>
            <button className="auth-submit" type="submit" disabled={sending}>{sending ? <LoaderCircle className="auth-spinner" size={18} /> : null}{sending ? "Signing in…" : "Sign in to my dashboard"}{!sending ? <ArrowRight size={17} /> : null}</button>
          </form>
        )}

        {message ? <div className="auth-message auth-success"><CheckCircle2 size={18} /> {message}</div> : null}
        {error ? <div className="auth-message auth-error" role="alert">{error}</div> : null}
        <div className="auth-trust-row"><span><ShieldCheck size={14} /> Account protected</span><span><Sparkles size={14} /> Rewards remembered</span></div>
      </section>
    </main>
  );
}
