type ChartPoint = { label: string; value: number };

export function Sparkline({
  points,
  height = 80,
  color = "#34d399"
}: {
  points: ChartPoint[];
  height?: number;
  color?: string;
}) {
  if (points.length === 0) {
    return <div className="text-xs text-zinc-500">No activity yet.</div>;
  }

  const width = 260;
  const max = Math.max(...points.map((p) => p.value), 1);
  const min = Math.min(...points.map((p) => p.value), 0);
  const range = Math.max(max - min, 1);

  const path = points
    .map((point, index) => {
      const x = (index / (points.length - 1 || 1)) * (width - 10) + 5;
      const y = height - ((point.value - min) / range) * (height - 10) - 5;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" />
      {points.map((point, index) => {
        const x = (index / (points.length - 1 || 1)) * (width - 10) + 5;
        const y = height - ((point.value - min) / range) * (height - 10) - 5;
        return (
          <circle key={point.label} cx={x} cy={y} r={2.6} fill={color} />
        );
      })}
    </svg>
  );
}

export function MiniBars({
  points,
  height = 80,
  color = "#a7f3d0"
}: {
  points: ChartPoint[];
  height?: number;
  color?: string;
}) {
  if (points.length === 0) {
    return <div className="text-xs text-zinc-500">No activity yet.</div>;
  }

  const width = 260;
  const max = Math.max(...points.map((p) => p.value), 1);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      {points.map((point, index) => {
        const barWidth = width / points.length - 4;
        const x = index * (width / points.length) + 2;
        const barHeight = (point.value / max) * (height - 10);
        const y = height - barHeight - 5;
        return (
          <rect
            key={point.label}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx="4"
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

