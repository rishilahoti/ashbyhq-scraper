const { getPool } = require('./db');

async function upsertCompany(name, ashbySlug) {
  const pool = getPool();
  const slug = typeof ashbySlug === 'string' ? ashbySlug.toLowerCase() : ashbySlug;
  await pool.query(
    `INSERT INTO companies (name, ashby_slug)
     VALUES ($1, $2)
     ON CONFLICT (ashby_slug) DO UPDATE SET name = EXCLUDED.name`,
    [name, slug]
  );
}

async function updateLastScraped(ashbySlug) {
  const pool = getPool();
  const slug = typeof ashbySlug === 'string' ? ashbySlug.toLowerCase() : ashbySlug;
  await pool.query(
    `UPDATE companies SET last_scraped_at = NOW() WHERE LOWER(ashby_slug) = LOWER($1)`,
    [slug]
  );
}

async function getCompany(ashbySlug) {
  const pool = getPool();
  const slug = typeof ashbySlug === 'string' ? ashbySlug.toLowerCase() : ashbySlug;
  const { rows } = await pool.query(
    'SELECT * FROM companies WHERE LOWER(ashby_slug) = LOWER($1)',
    [slug]
  );
  return rows[0] || null;
}

async function getAllCompaniesLastScraped() {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT ashby_slug, last_scraped_at FROM companies'
  );
  const map = {};
  for (const row of rows) {
    const key = row.ashby_slug.toLowerCase();
    if (!(key in map) || row.last_scraped_at) {
      map[key] = row.last_scraped_at
        ? row.last_scraped_at.toISOString()
        : null;
    }
  }
  return map;
}

module.exports = { upsertCompany, updateLastScraped, getCompany, getAllCompaniesLastScraped };
