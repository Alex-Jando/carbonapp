import { ReactNode } from "react";

type StatCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  children?: ReactNode;
};

export function StatCard({ title, value, subtitle, children }: StatCardProps) {
  return (
    <div className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
          {title}
        </p>
        <div className="mt-2 text-3xl font-semibold text-white">{value}</div>
        {subtitle ? <p className="mt-1 text-xs text-zinc-400">{subtitle}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}
