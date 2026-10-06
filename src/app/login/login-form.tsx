"use client";

import { useActionState, useState } from "react";
import { signIn, type SignInState } from "./actions";

const initialState: SignInState = { error: null, email: "" };

const inputBox =
  "flex h-[52px] w-full items-center justify-between rounded-[8px] border border-line bg-white px-[16px] focus-within:border-accent";
const inputText =
  "w-full min-w-0 bg-transparent text-[14px] font-light text-ink outline-none placeholder:text-[rgba(115,115,115,0.9)]";

export function LoginForm({ notice }: { notice: string | null }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const error = state.error ?? notice;

  return (
    <form action={action} className="flex w-full max-w-[420px] flex-col items-start gap-[20px]">
      <div className="flex w-full flex-col gap-[8px]">
        <h1 className="font-heading text-[38px] leading-[normal] text-ink">Sign in</h1>
        <p className="text-[14px] font-light text-muted">Use the account the admin created for you.</p>
      </div>

      <label className="flex w-full flex-col gap-[8px]">
        <span className="text-[13px] font-semibold text-ink">Email</span>
        <span className={inputBox}>
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={state.email}
            placeholder="you@tentrade.com"
            className={inputText}
          />
        </span>
      </label>

      <label className="flex w-full flex-col gap-[8px]">
        <span className="text-[13px] font-semibold text-ink">Password</span>
        <span className={inputBox}>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            className={inputText}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="ml-3 shrink-0 text-[13px] text-accent"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </span>
      </label>

      {error && (
        <p role="alert" className="w-full rounded-[8px] border border-accent-from/40 bg-accent-from/10 px-[14px] py-[10px] text-[13px] text-ink">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-accent-gradient flex h-[52px] w-full items-center justify-center rounded-[8px] text-[15px] font-semibold text-white disabled:opacity-70"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-[13px] font-light text-muted">Forgot your password? Ask the admin to reset it.</p>

      <div className="w-full rounded-[8px] bg-surface px-[14px] py-[12px]">
        <p className="text-[13px] font-light text-muted">Every entry you make is saved with your name and the time.</p>
      </div>
    </form>
  );
}
