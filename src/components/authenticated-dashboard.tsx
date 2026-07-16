"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, LoaderCircle, LockKeyhole } from "lucide-react";
import CustomerDashboard from "@/components/customer-dashboard";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

type AuthState = "checking" | "demo" | "signed-out" | "signed-in";

export default function AuthenticatedDashboard() {
  const isSupabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const [authState, setAuthState] = useState<AuthState>(
    isSupabaseConfigured ? "checking" : "demo",
  );
  const [email, setEmail] = useState("vincent@onwardcustoms.com");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? "signed-in" : "signed-out");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(session ? "signed-in" : "signed-out");
    });

    return () => listener.subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  async function sendMagicLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setSending(true);
    setMessage(null);
    setError(null);

    const redirectTo = `${window.location.origin}${basePath}/`;
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
        shouldCreateUser: false,
      },
    });

    setSending(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    setMessage("Check your inbox for your secure sign-in link.");
  }

  async function signOut() {
    const supabase = getSupabaseBrowserClient();
    await supabase?.auth.signOut();
  }

  if (authState === "demo" || authState === "signed-in") {
    return <CustomerDashboard onSignOut={authState === "signed-in" ? signOut : undefined} />;
  }

  if (authState === "checking") {
    return (
      <main className="auth-page auth-loading" aria-live="polite">
        <LoaderCircle className="auth-spinner" size={28} />
        <p>Checking your secure session…</p>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="sign-in-title">
        <Image src={`${basePath}/onward-logo.png`} alt="Onward Customs" width={190} height={52} priority />
        <span className="auth-eyebrow"><LockKeyhole size={14} /> Secure rewards access</span>
        <h1 id="sign-in-title">Sign in to your rewards dashboard</h1>
        <p>We’ll email you a one-time secure link. No password is required.</p>

        <form onSubmit={sendMagicLink}>
          <label htmlFor="rewards-email">Email address</label>
          <input
            id="rewards-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            required
          />
          <button className="auth-submit" type="submit" disabled={sending}>
            {sending ? <LoaderCircle className="auth-spinner" size={18} /> : null}
            {sending ? "Sending link…" : "Email my sign-in link"}
            {!sending ? <ArrowRight size={17} /> : null}
          </button>
        </form>

        {message ? <div className="auth-message auth-success"><CheckCircle2 size={18} /> {message}</div> : null}
        {error ? <div className="auth-message auth-error" role="alert">{error}</div> : null}
        <small>Only verified Onward customer accounts can access rewards data.</small>
      </section>
    </main>
  );
}
