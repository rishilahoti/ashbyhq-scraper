"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function Filters({ companies }: { companies: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const current = {
    search: searchParams.get("search") || "",
    company: searchParams.get("company") || "",
    remote: searchParams.get("remote") || "",
    minScore: searchParams.get("minScore") || "",
    employmentType: searchParams.get("employmentType") || "",
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-4 border-b border-edge">
      {/* Search */}
      <input
        type="text"
        placeholder="Search titles, companies..."
        defaultValue={current.search}
        onKeyDown={(e) => {
          if (e.key === "Enter") setParam("search", e.currentTarget.value);
        }}
        className="h-8 px-3 text-sm bg-surface border border-edge rounded-md
                   placeholder:text-ink-muted focus:outline-none focus:border-edge-strong
                   focus:ring-1 focus:ring-edge-strong w-56 font-body"
      />

      {/* Company */}
      <select
        value={current.company}
        onChange={(e) => setParam("company", e.target.value)}
        className="h-8 px-2 text-sm bg-surface border border-edge rounded-md
                   text-ink-secondary focus:outline-none focus:border-edge-strong cursor-pointer"
      >
        <option value="">All companies</option>
        {companies.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Remote Toggle */}
      <button
        onClick={() => setParam("remote", current.remote === "true" ? "" : "true")}
        className={`h-8 px-3 text-xs font-mono rounded-md border transition-colors cursor-pointer
          ${
            current.remote === "true"
              ? "bg-ink text-paper border-ink"
              : "bg-surface border-edge text-ink-secondary hover:border-edge-strong"
          }`}
      >
        REMOTE
      </button>

      {/* Employment Type */}
      <select
        value={current.employmentType}
        onChange={(e) => setParam("employmentType", e.target.value)}
        className="h-8 px-2 text-sm bg-surface border border-edge rounded-md
                   text-ink-secondary focus:outline-none focus:border-edge-strong cursor-pointer"
      >
        <option value="">All types</option>
        <option value="FullTime">Full Time</option>
        <option value="Intern">Intern</option>
        <option value="Contract">Contract</option>
        <option value="PartTime">Part Time</option>
      </select>

      {/* Min Score */}
      <select
        value={current.minScore}
        onChange={(e) => setParam("minScore", e.target.value)}
        className="h-8 px-2 text-sm bg-surface border border-edge rounded-md
                   text-ink-secondary focus:outline-none focus:border-edge-strong cursor-pointer font-mono"
      >
        <option value="">Any score</option>
        <option value="10">&ge; 10</option>
        <option value="25">&ge; 25</option>
        <option value="50">&ge; 50</option>
        <option value="75">&ge; 75</option>
      </select>

      {/* Clear */}
      {Object.values(current).some(Boolean) && (
        <button
          onClick={() => router.push("?")}
          className="h-8 px-3 text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
