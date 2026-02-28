import type { Job, JobWithScore } from "./types";

interface Rules {
  keywords: Record<string, number>;
  locations: string[];
  departments: string[];
  remoteBoost: number;
  locationBoost: number;
  departmentBoost: number;
  freshnessBoostHours: number;
  freshnessBoost: number;
}

const rules: Rules = {
  keywords: {
    frontend: 10, backend: 8, fullstack: 10, "full stack": 10,
    "new grad": 15, "entry level": 12, junior: 10, intern: 8,
    react: 7, node: 6, typescript: 6, javascript: 5, python: 5,
    "software engineer": 10, senior: -5, staff: -8, principal: -10,
    director: -10, manager: -3,
  },
  locations: ["San Francisco", "New York", "Remote", "Seattle", "Austin"],
  departments: ["Engineering", "Product", "Design"],
  remoteBoost: 10,
  locationBoost: 5,
  departmentBoost: 3,
  freshnessBoostHours: 48,
  freshnessBoost: 8,
};

export function scoreJob(job: Job): JobWithScore {
  let score = 0;
  const matchedKeywords: string[] = [];
  const text = `${job.title} ${job.description}`.toLowerCase();

  for (const [kw, weight] of Object.entries(rules.keywords)) {
    if (text.includes(kw.toLowerCase())) {
      score += weight;
      if (weight > 0) matchedKeywords.push(kw);
    }
  }

  const loc = (job.location || "").toLowerCase();
  for (const l of rules.locations) {
    if (loc.includes(l.toLowerCase())) { score += rules.locationBoost; break; }
  }

  if (job.remote) score += rules.remoteBoost;

  const dept = (job.department || "").toLowerCase();
  for (const d of rules.departments) {
    if (dept.includes(d.toLowerCase())) { score += rules.departmentBoost; break; }
  }

  const hrs = (Date.now() - new Date(job.publishedAt).getTime()) / 3.6e6;
  if (hrs <= rules.freshnessBoostHours) score += rules.freshnessBoost;

  return { ...job, score, matchedKeywords };
}
