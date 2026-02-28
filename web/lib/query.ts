import { query } from "./db";
import { scoreJob } from "./scoring";
import type {
  Job,
  JobWithScore,
  JobFilters,
  JobRow,
  PaginatedResult,
} from "./types";

const LIST_COLUMNS = `
  id, job_id, company, title, location, team, department,
  employment_type, remote, description, apply_url, job_url,
  published_at, scraped_at, compensation_summary, content_hash,
  is_active, created_at, updated_at
`;

// --- In-memory cache ---

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && hit.expiresAt > Date.now()) return Promise.resolve(hit.data);

  return fn().then((data) => {
    cache.set(key, { data, expiresAt: Date.now() + ttlMs });
    return data;
  });
}

// --- Row mapping ---

function rowToJob(row: JobRow): Job {
  return {
    id: row.id,
    jobId: row.job_id,
    company: row.company,
    title: row.title,
    location: row.location,
    team: row.team,
    department: row.department,
    employmentType: row.employment_type,
    remote: Boolean(row.remote),
    description: row.description ?? "",
    descriptionHtml: row.description_html ?? "",
    applyUrl: row.apply_url,
    jobUrl: row.job_url,
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : "",
    scrapedAt: row.scraped_at ? new Date(row.scraped_at).toISOString() : "",
    compensationSummary: row.compensation_summary,
    contentHash: row.content_hash,
    isActive: Boolean(row.is_active),
    status: "new",
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : "",
  };
}

function stripForList(job: JobWithScore): JobWithScore {
  return { ...job, description: "", descriptionHtml: "" };
}

// --- All scored jobs (cached) ---

async function getAllScoredJobs(): Promise<JobWithScore[]> {
  return cached("all_scored_jobs", 60_000, async () => {
    const { rows } = await query<JobRow>(
      `SELECT ${LIST_COLUMNS} FROM jobs WHERE is_active = TRUE ORDER BY published_at DESC`
    );
    return rows.map((r) => scoreJob(rowToJob(r)));
  });
}

// --- Public API ---

export async function getJobs(
  filters: JobFilters = {}
): Promise<PaginatedResult<JobWithScore>> {
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 40, 100);

  let scored: JobWithScore[];

  const hasDbFilters =
    filters.company || filters.remote !== undefined || filters.employmentType || filters.search;

  if (hasDbFilters) {
    const wheres: string[] = ["is_active = TRUE"];
    const params: (string | number | boolean)[] = [];
    let idx = 1;

    if (filters.company) {
      wheres.push(`company = $${idx++}`);
      params.push(filters.company);
    }
    if (filters.remote !== undefined) {
      wheres.push(`remote = $${idx++}`);
      params.push(filters.remote);
    }
    if (filters.employmentType) {
      wheres.push(`employment_type = $${idx++}`);
      params.push(filters.employmentType);
    }
    if (filters.search) {
      wheres.push(`(title ILIKE $${idx} OR company ILIKE $${idx + 1})`);
      const term = `%${filters.search}%`;
      params.push(term, term);
      idx += 2;
    }

    const where = `WHERE ${wheres.join(" AND ")}`;
    const { rows } = await query<JobRow>(
      `SELECT ${LIST_COLUMNS} FROM jobs ${where} ORDER BY published_at DESC`,
      params
    );
    scored = rows.map((r) => scoreJob(rowToJob(r)));
  } else {
    scored = await getAllScoredJobs();
  }

  if (filters.minScore !== undefined) {
    scored = scored.filter((j) => j.score >= filters.minScore!);
  }

  scored.sort((a, b) => b.score - a.score);

  const total = scored.length;
  const offset = (page - 1) * limit;
  const paginated = scored.slice(offset, offset + limit).map(stripForList);

  return { data: paginated, total, page, totalPages: Math.ceil(total / limit) };
}

export async function getJobById(jobId: string): Promise<JobWithScore | null> {
  const { rows } = await query<JobRow>(
    "SELECT * FROM jobs WHERE job_id = $1",
    [jobId]
  );
  if (rows.length === 0) return null;
  return scoreJob(rowToJob(rows[0]));
}

export async function getJobsByIds(jobIds: string[]): Promise<JobWithScore[]> {
  if (jobIds.length === 0) return [];
  const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
  const { rows } = await query<JobRow>(
    `SELECT ${LIST_COLUMNS} FROM jobs WHERE job_id IN (${placeholders}) AND is_active = TRUE`,
    jobIds
  );
  return rows.map((r) => scoreJob(rowToJob(r))).map(stripForList);
}

export async function getCompanies(): Promise<string[]> {
  return cached("companies_list", 120_000, async () => {
    const { rows } = await query<{ company: string }>(
      "SELECT DISTINCT company FROM jobs WHERE is_active = TRUE ORDER BY company"
    );
    return rows.map((r) => r.company);
  });
}

export async function getStats(): Promise<{ total: number; companies: number }> {
  return cached("stats", 120_000, async () => {
    const { rows } = await query(
      `SELECT COUNT(*)::int as total, COUNT(DISTINCT company)::int as companies
       FROM jobs WHERE is_active = TRUE`
    );
    return rows[0] as { total: number; companies: number };
  });
}
