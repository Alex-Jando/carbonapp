import { CompletedTaskCard } from "./CompletedTaskCard";

type CompletedTask = {
  id: string;
  title: string;
  carbonOffsetKg: number;
  completedAt?: string;
  username?: string;
  userEmail?: string | null;
  imageUrl?: string | null;
};

export function CompletedTaskList({
  tasks,
  emptyLabel
}: {
  tasks: CompletedTask[];
  emptyLabel: string;
}) {
  if (tasks.length === 0) {
    return <p className="text-sm text-zinc-400">{emptyLabel}</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {tasks.map((task) => (
        <CompletedTaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

