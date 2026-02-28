export default function ScoreBadge({ score }: { score: number }) {
  const tier =
    score >= 50
      ? "bg-signal text-white"
      : score >= 25
        ? "bg-signal-soft text-signal"
        : score >= 5
          ? "bg-surface text-ink-secondary"
          : "bg-surface text-ink-muted";

  return (
    <span
      className={`inline-flex items-center justify-center font-mono text-xs font-medium
                   px-2 py-0.5 rounded ${tier} tabular-nums min-w-10 text-center`}
    >
      {score}
    </span>
  );
}
