"use client";

import { demoSignInAction, emailAuthAction, type ActionState } from "@/lib/actions";
import { useActionState } from "react";

type Account = { email: string; display_name: string; role: string };
type OAuthFlags = { google: boolean; apple: boolean; microsoft: boolean };

export function AuthForm({
  mode,
  next,
  accounts,
  oauth,
  error,
}: {
  mode: "login" | "signup";
  next: string;
  accounts: Account[];
  oauth: OAuthFlags;
  error?: string;
}) {
  const [state, action, pending] = useActionState(emailAuthAction, null as ActionState);
  return (
    <div className="grid gap-6">
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      <form action={action} className="grid gap-3">
        <input type="hidden" name="mode" value={mode} />
        <input type="hidden" name="next" value={next} />
        {mode === "signup" ? (
          <>
            <label className="label">
              Display name
              <input className="field mt-1" name="display_name" required minLength={2} maxLength={40} />
            </label>
            <label className="label">
              Username
              <input className="field mt-1" name="username" required pattern="[a-z0-9_]{3,20}" />
            </label>
          </>
        ) : null}
        <label className="label">
          Email
          <input className="field mt-1" name="email" type="email" required autoComplete="email" />
        </label>
        <label className="label">
          Password
          <input className="field mt-1" name="password" type="password" required minLength={4} autoComplete="current-password" />
        </label>
        <p className="text-xs text-white/50">Demo mode accepts any password for an existing email. Passwords are not stored.</p>
        {state && state.ok === false ? <p className="text-sm text-rose-200">{state.error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <div className="grid gap-2">
        <OAuthButton provider="google" configured={oauth.google} next={next} label="Google · demo as Alex (creator)" />
        <OAuthButton provider="apple" configured={oauth.apple} next={next} label="Apple · demo as Sam (viewer)" />
        <OAuthButton provider="microsoft" configured={oauth.microsoft} next={next} label="Microsoft · demo as Morgan (moderator)" />
      </div>
      {mode === "login" ? (
        <div className="grid gap-2">
          <p className="kicker">Demo accounts</p>
          {accounts.map((account) => (
            <form key={account.email} action={demoSignInAction}>
              <input type="hidden" name="email" value={account.email} />
              <input type="hidden" name="next" value={next} />
              <button className="btn w-full justify-between" type="submit">
                <span>{account.display_name}</span>
                <span className="text-xs uppercase text-white/50">{account.role}</span>
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OAuthButton({
  provider,
  configured,
  next,
  label,
}: {
  provider: string;
  configured: boolean;
  next: string;
  label: string;
}) {
  if (configured) {
    return (
      <a className="btn w-full" href={`/api/auth/${provider}?next=${encodeURIComponent(next)}`}>
        Continue with {provider}
      </a>
    );
  }
  return (
    <form action={demoSignInAction}>
      <input type="hidden" name="email" value={provider === "google" ? "alex@seemee.demo" : provider === "apple" ? "sam@seemee.demo" : "morgan@seemee.demo"} />
      <input type="hidden" name="next" value={next} />
      <button className="btn w-full" type="submit">
        {label}
      </button>
    </form>
  );
}
