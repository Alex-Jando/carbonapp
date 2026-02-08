import { MiniBars, Sparkline } from "../home/ChartHelpers";

type DailyStat = {
  dateKey: string;
  tasksCompleted: number;
  carbonOffsetKg: number;
};

type GlobalStatsProps = {
  totals: {
    tasksCompleted: number;
    carbonOffsetKg: number;
  };
  dailyStats: DailyStat[];
};

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${month}/${day}`;
}

export function GlobalStats({ totals, dailyStats }: GlobalStatsProps) {
  const recentStats = dailyStats.slice(-14);
  const tasksPoints = recentStats.map((stat) => ({
    label: formatDateLabel(stat.dateKey),
    value: stat.tasksCompleted
  }));
  const carbonPoints = recentStats.map((stat) => ({
    label: formatDateLabel(stat.dateKey),
    value: stat.carbonOffsetKg
  }));

  return (
    <section className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
          Total Tasks
        </p>
        <p className="mt-2 text-3xl font-semibold text-white">
          {totals.tasksCompleted}
        </p>
        <MiniBars points={tasksPoints} />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
          Total Offset
        </p>
        <p className="mt-2 text-3xl font-semibold text-white">
          {totals.carbonOffsetKg.toFixed(1)} kg
        </p>
        <Sparkline points={carbonPoints} />
      </div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/70">
          Recent Activity
        </p>
        <p className="mt-2 text-sm text-zinc-400">
          Last {recentStats.length} days
        </p>
        <Sparkline points={tasksPoints} color="#86efac" />
      </div>
    </section>
  );
}

