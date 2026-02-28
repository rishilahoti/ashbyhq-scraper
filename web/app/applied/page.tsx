"use client";

import { useEffect, useState } from "react";
import { useStatuses } from "@/components/StatusProvider";
import JobList from "@/components/JobList";
import type { JobWithScore } from "@/lib/types";

export default function AppliedPage() {
  const { statuses } = useStatuses();
  const [allJobs, setAllJobs] = useState<JobWithScore[]>([]);
  const [loading, setLoading] = useState(true);

  const appliedIds = new Set(
    Object.entries(statuses)
      .filter(([, s]) => s === "applied")
      .map(([id]) => id)
  );

  useEffect(() => {
    if (appliedIds.size === 0) {
      setAllJobs([]);
      setLoading(false);
      return;
    }

    fetch("/api/jobs?limit=100")
      .then((r) => r.json())
      .then((res) => {
        setAllJobs(res.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [appliedIds.size]);

  const filtered = allJobs.filter((j) => appliedIds.has(j.jobId));

  return (
    <div>
      <div className="flex items-baseline gap-3 mb-4">
        <h1 className="font-display text-xl font-bold tracking-tight">Applied</h1>
        <span className="font-mono text-sm text-ink-muted">{filtered.length}</span>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <p className="text-sm text-ink-muted">Loading...</p>
        </div>
      ) : (
        <JobList jobs={filtered} emptyMessage="No jobs marked as applied yet." />
      )}
    </div>
  );
}
