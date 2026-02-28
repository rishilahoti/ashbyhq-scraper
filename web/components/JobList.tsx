import type { JobWithScore } from "@/lib/types";
import JobRow from "./JobRow";

export default function JobList({
  jobs,
  emptyMessage = "No jobs match your filters.",
}: {
  jobs: JobWithScore[];
  emptyMessage?: string;
}) {
  if (jobs.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-muted">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-edge">
      {jobs.map((job, i) => (
        <JobRow key={`${job.company}-${job.jobId}`} job={job} index={i} />
      ))}
    </div>
  );
}
