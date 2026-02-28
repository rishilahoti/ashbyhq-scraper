"use client";

import { useStatuses } from "./StatusProvider";

export default function StatusButton({
  jobId,
  targetStatus,
  label,
  compact = false,
}: {
  jobId: string;
  targetStatus: "applied" | "ignored";
  label: string;
  compact?: boolean;
}) {
  const { getJobStatus, toggleStatus } = useStatuses();
  const currentStatus = getJobStatus(jobId);
  const isActive = currentStatus === targetStatus;

  const colorStyles =
    targetStatus === "applied"
      ? isActive
        ? "bg-positive text-white"
        : "border border-edge text-ink-secondary hover:border-positive hover:text-positive"
      : isActive
        ? "bg-ink-muted text-white"
        : "border border-edge text-ink-secondary hover:border-ink-muted hover:text-ink";

  const sizeStyles = compact
    ? "px-2.5 py-1 rounded text-xs"
    : "h-9 px-5 rounded-md text-sm";

  return (
    <button
      onClick={() => toggleStatus(jobId, targetStatus)}
      className={`inline-flex items-center justify-center font-medium transition-colors
                  cursor-pointer ${sizeStyles} ${colorStyles}`}
    >
      {label}
    </button>
  );
}
