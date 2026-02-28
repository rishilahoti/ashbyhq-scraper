import { Suspense } from "react";
import { getJobs, getCompanies, getStats } from "@/lib/query";
import type { JobFilters } from "@/lib/types";
import JobList from "@/components/JobList";
import Filters from "@/components/Filters";
import Pagination from "@/components/Pagination";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const companies = await getCompanies();
  const stats = await getStats();

  const filters: JobFilters = {};
  if (sp.search) filters.search = sp.search;
  if (sp.company) filters.company = sp.company;
  if (sp.remote === "true") filters.remote = true;
  if (sp.minScore) filters.minScore = parseInt(sp.minScore, 10);
  if (sp.employmentType) filters.employmentType = sp.employmentType;
  if (sp.page) filters.page = parseInt(sp.page, 10);

  const result = await getJobs(filters);

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-baseline gap-6 mb-1">
        <h1 className="font-display text-xl font-bold tracking-tight">Job Feed</h1>
        <div className="flex gap-4">
          <Stat label="Jobs" value={stats.total} />
          <Stat label="Companies" value={stats.companies} />
        </div>
      </div>

      <Suspense fallback={null}>
        <Filters companies={companies} />
      </Suspense>

      <div className="mt-2">
        <JobList jobs={result.data} />
      </div>

      <Suspense fallback={null}>
        <Pagination page={result.page} totalPages={result.totalPages} total={result.total} />
      </Suspense>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm font-medium tabular-nums text-ink">
        {value}
      </span>
      <span className="text-xs text-ink-muted">{label}</span>
    </div>
  );
}
