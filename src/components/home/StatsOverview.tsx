import { MiniBars, Sparkline } from "./ChartHelpers";
import { StatCard } from "./StatCard";

type DailyStat = {
  dateKey: string;
  tasksCompleted: number;
  carbonOffsetKg: number;
};

type StatsOverviewProps = {
  streakCurrent: number;
  streakBest: number;
  tasksCompletedCount: number;
  carbonOffsetKgTotal: number;
  dailyStats: DailyStat[];
};

function formatDateLabel(dateKey: string) {
  const [year, month, day] = dateKey.split("-");
  return `${month}/${day}`;
}

export function StatsOverview({
  streakCurrent,
  streakBest,
  tasksCompletedCount,
  carbonOffsetKgTotal,
  dailyStats
}: StatsOverviewProps) {
  const recentStats = dailyStats.slice(-14);
  const streakPoints = recentStats.map((stat) => ({
    label: stat.dateKey,
    value: stat.tasksCompleted > 0 ? 1 : 0
  }));
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
      <StatCard
        title="Streak"
        value={`${streakCurrent} days`}
        subtitle={`Best streak: ${streakBest} days`}
      >
        <Sparkline points={streakPoints} color="#a7f3d0" />
        <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
          {recentStats.length > 0 ? (
            <>
              <span>{formatDateLabel(recentStats[0].dateKey)}</span>
              <span>{formatDateLabel(recentStats[recentStats.length - 1].dateKey)}</span>
            </>
          ) : (
            <span>No activity yet</span>
          )}
        </div>
      </StatCard>

      <StatCard
        title="Tasks Completed"
        value={String(tasksCompletedCount)}
        subtitle="Total tasks completed"
      >
        <MiniBars points={tasksPoints} color="#86efac" />
        <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
          {recentStats.length > 0 ? (
            <>
              <span>{formatDateLabel(recentStats[0].dateKey)}</span>
              <span>{formatDateLabel(recentStats[recentStats.length - 1].dateKey)}</span>
            </>
          ) : (
            <span>No activity yet</span>
          )}
        </div>
      </StatCard>

      <StatCard
        title="Carbon Offset"
        value={`${carbonOffsetKgTotal.toFixed(1)} kg`}
        subtitle="Total carbon offset"
      >
        <Sparkline points={carbonPoints} color="#34d399" />
        <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
          {recentStats.length > 0 ? (
            <>
              <span>{formatDateLabel(recentStats[0].dateKey)}</span>
              <span>{formatDateLabel(recentStats[recentStats.length - 1].dateKey)}</span>
            </>
          ) : (
            <span>No activity yet</span>
          )}
        </div>
      </StatCard>
    </section>
  );
}

