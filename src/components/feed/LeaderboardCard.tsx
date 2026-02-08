type LeaderboardEntry = {
  rank: number;
  uid: string;
  username: string;
  city?: string;
  carbonOffsetKgTotal: number;
  tasksCompletedCount: number;
};

type LeaderboardCardProps = {
  entries: LeaderboardEntry[];
  loading?: boolean;
  selectedLimit: 5 | 10 | 50 | 100;
  onSelectLimit: (limit: 5 | 10 | 50 | 100) => void;
};

function medalForRank(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `#${rank}`;
}

export function LeaderboardCard({
  entries,
  loading = false,
  selectedLimit,
  onSelectLimit,
}: LeaderboardCardProps) {
  const options: Array<5 | 10 | 50 | 100> = [5, 10, 50, 100];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Global Leaderboard</h2>
        <span className="text-xs text-zinc-400">By total offset</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400">Show:</span>
        {options.map((limit) => {
          const active = selectedLimit === limit;
          return (
            <button
              key={limit}
              type="button"
              onClick={() => onSelectLimit(limit)}
              className={`rounded-full px-3 py-1 text-xs transition ${
                active
                  ? "bg-emerald-400 text-white"
                  : "border border-white/10 text-zinc-300 hover:border-emerald-400/40"
              }`}
            >
              Top {limit}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-zinc-400">Loading leaderboard...</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">No leaderboard entries yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.uid}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="w-10 text-sm font-semibold text-emerald-200">
                  {medalForRank(entry.rank)}
                </span>
                <div>
                  <p className="text-sm font-medium text-white">
                    {entry.username}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {entry.city ? `${entry.city} - ` : ""}
                    {entry.tasksCompletedCount} tasks completed
                  </p>
                </div>
              </div>
              <p className="text-sm font-semibold text-emerald-200">
                {entry.carbonOffsetKgTotal.toFixed(1)} kg
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
