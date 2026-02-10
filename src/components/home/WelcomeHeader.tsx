import { AppLogo } from "@/src/components/brand/AppLogo";

type WelcomeHeaderProps = {
  username: string;
  todayLabel: string;
};

export function WelcomeHeader({ username, todayLabel }: WelcomeHeaderProps) {
  return (
    <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-white/5 to-transparent p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3">
        <AppLogo size={28} />
        <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/70">
          Daily Dashboard
        </p>
      </div>
      <h1 className="text-3xl font-semibold text-white">
        Welcome, {username}
      </h1>
      <p className="text-sm text-zinc-300">Here are your tasks for {todayLabel}.</p>
    </div>
  );
}
