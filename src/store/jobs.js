const { getPool } = require('./db');
const { logger } = require('../utils');

async function getActiveJobsForCompany(company) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE company = $1 AND is_active = TRUE',
    [company]
  );
  return rows;
}

async function getJobByCompanyAndId(company, jobId) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE company = $1 AND job_id = $2',
    [company, jobId]
  );
  return rows[0] || null;
}

async function upsertJob(job) {
  const pool = getPool();

  const existing = await getJobByCompanyAndId(job.company, job.jobId);

  if (!existing) {
    await pool.query(
      `INSERT INTO jobs (
        job_id, company, title, location, team, department,
        employment_type, remote, description, description_html,
        apply_url, job_url, published_at, scraped_at,
        compensation_summary, content_hash, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13, $14,
        $15, $16, TRUE
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
        scraped_at = EXCLUDED.scraped_at,
        compensation_summary = EXCLUDED.compensation_summary,
        content_hash = EXCLUDED.content_hash,
        is_active = TRUE,
        updated_at = NOW()`,
      [
        job.jobId, job.company, job.title, job.location, job.team, job.department,
        job.employmentType, !!job.remote, job.description, job.descriptionHtml,
        job.applyUrl, job.jobUrl, job.publishedAt, job.scrapedAt,
        job.compensationSummary, job.contentHash,
      ]
    );
    return 'inserted';
  }

  if (existing.content_hash !== job.contentHash) {
    await pool.query(
      `UPDATE jobs SET
        title = $1, location = $2, team = $3, department = $4,
        employment_type = $5, remote = $6, description = $7,
        description_html = $8, apply_url = $9, job_url = $10,
        published_at = $11, scraped_at = $12, compensation_summary = $13,
        content_hash = $14, is_active = TRUE, updated_at = NOW()
      WHERE company = $15 AND job_id = $16`,
      [
        job.title, job.location, job.team, job.department,
        job.employmentType, !!job.remote, job.description,
        job.descriptionHtml, job.applyUrl, job.jobUrl,
        job.publishedAt, job.scrapedAt, job.compensationSummary,
        job.contentHash, job.company, job.jobId,
      ]
    );
    return 'updated';
  }

  await pool.query(
    `UPDATE jobs SET scraped_at = $1, is_active = TRUE, updated_at = NOW()
     WHERE company = $2 AND job_id = $3`,
    [job.scrapedAt, job.company, job.jobId]
  );
  return 'unchanged';
}

async function markRemovedJobs(company, activeJobIds) {
  const pool = getPool();
  const currentActive = await getActiveJobsForCompany(company);
  const activeSet = new Set(activeJobIds);
  const removed = [];

  for (const job of currentActive) {
    if (!activeSet.has(job.job_id)) {
      await pool.query(
        `UPDATE jobs SET is_active = FALSE, updated_at = NOW()
         WHERE company = $1 AND job_id = $2`,
        [company, job.job_id]
      );
      removed.push(job);
    }
  }

  if (removed.length > 0) {
    logger.debug(`Marked ${removed.length} jobs as removed for ${company}`);
  }
  return removed;
}

async function saveSnapshot(job) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO job_snapshots (job_id, company, content_hash, snapshot_data)
     VALUES ($1, $2, $3, $4)`,
    [job.jobId, job.company, job.contentHash, JSON.stringify(job)]
  );
}

async function getAllActiveJobs() {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE is_active = TRUE ORDER BY company, published_at DESC'
  );
  return rows;
}

async function getJobsByCompany(company) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM jobs WHERE company = $1 ORDER BY published_at DESC',
    [company]
  );
  return rows;
}

module.exports = {
  getActiveJobsForCompany,
  getJobByCompanyAndId,
  upsertJob,
  markRemovedJobs,
  saveSnapshot,
  getAllActiveJobs,
  getJobsByCompany,
};
