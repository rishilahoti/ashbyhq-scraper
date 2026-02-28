import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import crypto from "crypto";

const ASHBY_BASE = "https://api.ashbyhq.com/posting-api/job-board";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractSlug(input: string): string | null {
  const trimmed = input.trim();

  const urlMatch = trimmed.match(
    /(?:https?:\/\/)?jobs\.ashbyhq\.com\/([a-zA-Z0-9_-]+)/
  );
  if (urlMatch) return urlMatch[1].toLowerCase();

  if (/^[a-zA-Z0-9_-]+$/.test(trimmed)) return trimmed.toLowerCase();

  return null;
}

function contentHash(...fields: (string | null | undefined)[]): string {
  const payload = fields.map((f) => f ?? "").join("|");
  return crypto.createHash("md5").update(payload).digest("hex");
}

function sanitizePlain(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractJobId(jobUrl: string | null): string | null {
  if (!jobUrl) return null;
  try {
    const url = new URL(jobUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || null;
  } catch {
    return jobUrl;
  }
}

interface AshbyJob {
  title?: string;
  location?: string;
  team?: string;
  department?: string;
  employmentType?: string;
  isRemote?: boolean;
  isListed?: boolean;
  descriptionPlain?: string;
  descriptionHtml?: string;
  applyUrl?: string;
  jobUrl?: string;
  publishedAt?: string;
  compensation?: {
    compensationTierSummary?: string;
    scrapeableCompensationSalarySummary?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawInput: string = body.url || body.slug || "";

    const slug = extractSlug(rawInput);
    if (!slug) {
      return NextResponse.json(
        {
          error:
            "Invalid input. Provide an Ashby job board URL (e.g. https://jobs.ashbyhq.com/company) or a slug.",
        },
        { status: 400 }
      );
    }

    const pool = getPool();

    // Case-insensitive: find existing company by slug so we reuse its name and avoid duplicates
    const existingBySlug = await pool.query(
      "SELECT id, name, ashby_slug FROM companies WHERE LOWER(ashby_slug) = LOWER($1)",
      [slug]
    );
    const existingRow = existingBySlug.rows[0];
    const alreadyExists = !!existingRow;

    const ashbyRes = await fetch(
      `${ASHBY_BASE}/${slug}?includeCompensation=true`,
      { headers: HEADERS, signal: AbortSignal.timeout(15000) }
    );

    if (!ashbyRes.ok) {
      if (ashbyRes.status === 404) {
        return NextResponse.json(
          {
            error: `No Ashby job board found for "${slug}". Double-check the URL at https://jobs.ashbyhq.com/${slug}`,
          },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Ashby API returned ${ashbyRes.status}` },
        { status: 502 }
      );
    }

    const data = await ashbyRes.json();
    if (!data || !Array.isArray(data.jobs)) {
      return NextResponse.json(
        { error: "Unexpected response format from Ashby API" },
        { status: 502 }
      );
    }

    const companyName =
      data.jobBoard?.title || slug.charAt(0).toUpperCase() + slug.slice(1);

    // Use existing company name if we already have this slug (keeps "OpenAI" instead of creating "Openai")
    const canonicalName = existingRow?.name ?? companyName;

    if (existingRow) {
      await pool.query(
        "UPDATE companies SET last_scraped_at = NOW() WHERE id = $1",
        [existingRow.id]
      );
    } else {
      await pool.query(
        `INSERT INTO companies (name, ashby_slug, last_scraped_at)
         VALUES ($1, $2, NOW())`,
        [canonicalName, slug]
      );
    }

    // Use the canonical name for all job operations (existing row's name or the one we just set)
    const companyNameForJobs = existingRow?.name ?? canonicalName;

    const listedJobs: AshbyJob[] = data.jobs.filter(
      (j: AshbyJob) => j.isListed !== false
    );

    let inserted = 0;
    let updated = 0;
    let unchanged = 0;

    for (const raw of listedJobs) {
      const jobId = extractJobId(raw.jobUrl ?? null);
      if (!jobId) continue;

      const description =
        raw.descriptionPlain || sanitizePlain(raw.descriptionHtml ?? null);
      const hash = contentHash(
        raw.title,
        raw.location,
        description,
        raw.employmentType,
        String(raw.isRemote),
        raw.team,
        raw.department
      );

      const compensationSummary =
        raw.compensation?.compensationTierSummary ||
        raw.compensation?.scrapeableCompensationSalarySummary ||
        null;

      const existingJob = await pool.query(
        "SELECT content_hash FROM jobs WHERE company = $1 AND job_id = $2",
        [companyNameForJobs, jobId]
      );

      if (existingJob.rows.length === 0) {
        await pool.query(
          `INSERT INTO jobs (
            job_id, company, title, location, team, department,
            employment_type, remote, description, description_html,
            apply_url, job_url, published_at, scraped_at,
            compensation_summary, content_hash, is_active
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10,
            $11, $12, $13, NOW(),
            $14, $15, TRUE
          )
          ON CONFLICT (company, job_id) DO UPDATE SET
            title = EXCLUDED.title,
            location = EXCLUDED.location,
            team = EXCLUDED.team,
            department = EXCLUDED.department,
            employment_type = EXCLUDED.employment_type,
            remote = EXCLUDED.remote,
            description = EXCLUDED.description,
            description_html = EXCLUDED.description_html,
            apply_url = EXCLUDED.apply_url,
            job_url = EXCLUDED.job_url,
            published_at = EXCLUDED.published_at,
            scraped_at = NOW(),
            compensation_summary = EXCLUDED.compensation_summary,
            content_hash = EXCLUDED.content_hash,
            is_active = TRUE,
            updated_at = NOW()`,
          [
            jobId,
            companyNameForJobs,
            raw.title || "Untitled",
            raw.location || "Unknown",
            raw.team || null,
            raw.department || null,
            raw.employmentType || null,
            Boolean(raw.isRemote),
            description,
            raw.descriptionHtml || "",
            raw.applyUrl || "",
            raw.jobUrl || "",
            raw.publishedAt || new Date().toISOString(),
            compensationSummary,
            hash,
          ]
        );
        inserted++;
      } else if (existingJob.rows[0].content_hash !== hash) {
        await pool.query(
          `UPDATE jobs SET
            title = $1, location = $2, team = $3, department = $4,
            employment_type = $5, remote = $6, description = $7,
            description_html = $8, apply_url = $9, job_url = $10,
            published_at = $11, scraped_at = NOW(), compensation_summary = $12,
            content_hash = $13, is_active = TRUE, updated_at = NOW()
          WHERE company = $14 AND job_id = $15`,
          [
            raw.title || "Untitled",
            raw.location || "Unknown",
            raw.team || null,
            raw.department || null,
            raw.employmentType || null,
            Boolean(raw.isRemote),
            description,
            raw.descriptionHtml || "",
            raw.applyUrl || "",
            raw.jobUrl || "",
            raw.publishedAt || new Date().toISOString(),
            compensationSummary,
            hash,
            companyNameForJobs,
            jobId,
          ]
        );
        updated++;
      } else {
        await pool.query(
          `UPDATE jobs SET scraped_at = NOW(), is_active = TRUE, updated_at = NOW()
           WHERE company = $1 AND job_id = $2`,
          [companyNameForJobs, jobId]
        );
        unchanged++;
      }
    }

    return NextResponse.json({
      success: true,
      company: companyNameForJobs,
      slug,
      alreadyExisted: alreadyExists,
      jobs: {
        total: listedJobs.length,
        inserted,
        updated,
        unchanged,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT c.name, c.ashby_slug, c.last_scraped_at,
              COUNT(j.id)::int as job_count
       FROM companies c
       LEFT JOIN jobs j ON j.company = c.name AND j.is_active = TRUE
       GROUP BY c.id, c.name, c.ashby_slug, c.last_scraped_at
       ORDER BY c.name`
    );
    // Deduplicate by lowercase slug so "OpenAI" and "openai" show as one company (keep first by name)
    const bySlug = new Map<string, (typeof rows)[0]>();
    for (const r of rows) {
      const key = r.ashby_slug.toLowerCase();
      if (!bySlug.has(key)) bySlug.set(key, r);
      else {
        const existing = bySlug.get(key)!;
        const existingJobCount = Number(existing.job_count) || 0;
        const rJobCount = Number(r.job_count) || 0;
        if (rJobCount > existingJobCount) bySlug.set(key, r);
      }
    }
    return NextResponse.json({ companies: Array.from(bySlug.values()) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
