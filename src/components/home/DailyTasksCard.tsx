type TaskItem = {
  id: string;
  title: string;
  carbonOffsetKg: number;
  difficulty?: string;
  reason?: string;
};

type DailyTasksCardProps = {
  tasks: TaskItem[];
  loading: boolean;
  error?: string | null;
  onComplete: (taskId: string) => void;
  onFileChange: (taskId: string, file: File | null) => void;
  previewUrls: Record<string, string | undefined>;
};

export function DailyTasksCard({
  tasks,
  loading,
  error,
  onComplete,
  onFileChange,
  previewUrls
}: DailyTasksCardProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Daily Tasks</h2>
          <p className="text-sm text-zinc-400">Complete any task to keep your streak alive.</p>
        </div>
        <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-100">
          {tasks.length} left
        </span>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-20 animate-pulse rounded-2xl bg-white/5"
            />
          ))}
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}

      {!loading && tasks.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">No tasks available yet.</p>
      ) : null}

      <div className="mt-6 space-y-4">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-semibold text-white">{task.title}</h3>
                <p className="text-xs text-zinc-400">
                  Offset {task.carbonOffsetKg.toFixed(1)} kg • {task.difficulty ?? "easy"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onComplete(task.id)}
                className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-zinc-900 hover:brightness-105"
              >
                Complete
              </button>
            </div>
            {task.reason ? (
              <p className="mt-2 text-xs text-zinc-400">{task.reason}</p>
            ) : null}
            <div className="mt-3">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 hover:border-emerald-400/40">
                <span>Proof photo (optional)</span>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] text-zinc-200">
                  Add photo
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    onFileChange(task.id, event.target.files?.[0] ?? null)
                  }
                />
              </label>
            </div>
            {previewUrls[task.id] ? (
              <div className="mt-3">
                <img
                  src={previewUrls[task.id]}
                  alt="Proof preview"
                  className="h-20 w-20 rounded-xl border border-white/10 object-cover"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
