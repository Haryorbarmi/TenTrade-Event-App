/* eslint-disable @next/next/no-img-element -- decorative SVG from Figma */
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { getCurrentProfile } from "@/lib/auth";
import { canUseApp } from "@/lib/roles";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · TenTrade Lagos Seminar 2026" };

// Figma: Login (4010:135)
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const profile = await getCurrentProfile();
  if (canUseApp(profile)) redirect("/dashboard");

  const { disabled } = await searchParams;
  const notice = disabled || profile ? "This account is disabled. Ask a Super Admin." : null;

  return (
    <main className="flex min-h-screen w-full bg-white">
      <section className="relative hidden w-1/2 flex-col items-start justify-between overflow-clip bg-ink p-[64px] lg:flex">
        <div className="pointer-events-none absolute left-[-120px] top-[700px] h-[420px] w-[520px]" aria-hidden>
          <div className="absolute inset-[-35.71%_-28.85%]">
            <img alt="" className="block size-full max-w-none" src="/brand/login-glow.svg" />
          </div>
        </div>
        <div className="relative">
          <Logo size="lg" />
        </div>
        <div className="relative flex flex-col items-start gap-[20px]">
          <p className="font-heading text-[88px] leading-[normal] text-white">
            LAGOS
            <br />
            SEMINAR
            <br />
            2026
          </p>
          <p className="text-[20px] font-light text-white/60">Event check-in and giveaway console</p>
        </div>
        <p className="relative text-[14px] font-light text-white/45">TenTrade · One community, one future</p>
      </section>

      <section className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="mb-10 lg:hidden">
          <div className="rounded-[8px] bg-ink px-4 py-3">
            <Logo size="sm" />
          </div>
        </div>
        <LoginForm notice={notice} />
      </section>
    </main>
  );
}
