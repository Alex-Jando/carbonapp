type CompletedTask = {
  id: string;
  title: string;
  carbonOffsetKg: number;
  completedAt?: string;
  username?: string;
  userEmail?: string | null;
  imageUrl?: string | null;
};

export function CompletedTaskCard({ task }: { task: CompletedTask }) {
  const completedLabel = task.completedAt
    ? new Date(task.completedAt).toLocaleString("en-CA", {
        timeZone: "America/Toronto",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      })
    : "Recently";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">{task.title}</p>
          <p className="text-xs text-zinc-400">
            {task.username || task.userEmail || "Anonymous"} • {completedLabel}
          </p>
        </div>
        <span className="rounded-full bg-emerald-400/20 px-2 py-1 text-xs text-emerald-100">
          {task.carbonOffsetKg.toFixed(1)} kg
        </span>
      </div>
      {task.imageUrl ? (
        <img
          src={task.imageUrl}
          alt="Task proof"
          className="h-40 w-full rounded-xl object-cover"
        />
      ) : null}
    </div>
  );
}

