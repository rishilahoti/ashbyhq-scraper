import { getPool } from "./db";
import { scoreJob } from "./scoring";
import type {
  Job,
  JobWithScore,
  JobFilters,
  JobRow,
  PaginatedResult,
} from "./types";

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
    description: row.description,
    descriptionHtml: row.description_html,
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

export async function getJobs(
  filters: JobFilters = {}
): Promise<PaginatedResult<JobWithScore>> {
  const pool = getPool();
  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 40, 100);

  const wheres: string[] = ["is_active = TRUE"];
  const params: (string | number | boolean)[] = [];
  let paramIdx = 1;

  if (filters.company) {
    wheres.push(`company = $${paramIdx}`);
    params.push(filters.company);
    paramIdx++;
  }

  if (filters.remote !== undefined) {
    wheres.push(`remote = $${paramIdx}`);
    params.push(filters.remote);
    paramIdx++;
  }

  if (filters.employmentType) {
    wheres.push(`employment_type = $${paramIdx}`);
    params.push(filters.employmentType);
    paramIdx++;
  }

  if (filters.search) {
    wheres.push(
      `(title ILIKE $${paramIdx} OR description ILIKE $${paramIdx + 1} OR company ILIKE $${paramIdx + 2})`
    );
    const term = `%${filters.search}%`;
    params.push(term, term, term);
    paramIdx += 3;
  }

  const where = wheres.length ? `WHERE ${wheres.join(" AND ")}` : "";

  const { rows } = await pool.query<JobRow>(
    `SELECT * FROM jobs ${where} ORDER BY published_at DESC`,
    params
  );

  let scored = rows.map(rowToJob).map(scoreJob);

  if (filters.minScore !== undefined) {
    scored = scored.filter((j) => j.score >= filters.minScore!);
  }

  scored.sort((a, b) => b.score - a.score);

  const total = scored.length;
  const offset = (page - 1) * limit;
  const paginated = scored.slice(offset, offset + limit);

  return {
    data: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getJobById(jobId: string): Promise<JobWithScore | null> {
  const pool = getPool();
  const { rows } = await pool.query<JobRow>(
    "SELECT * FROM jobs WHERE job_id = $1",
    [jobId]
  );

  if (rows.length === 0) return null;
  return scoreJob(rowToJob(rows[0]));
}

export async function getCompanies(): Promise<string[]> {
  const pool = getPool();
  const { rows } = await pool.query<{ company: string }>(
    "SELECT DISTINCT company FROM jobs WHERE is_active = TRUE ORDER BY company"
  );
  return rows.map((r) => r.company);
}

export async function getStats(): Promise<{
  total: number;
  companies: number;
}> {
  const pool = getPool();
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)::int as total,
      COUNT(DISTINCT company)::int as companies
    FROM jobs WHERE is_active = TRUE
  `);
  return rows[0];
}
