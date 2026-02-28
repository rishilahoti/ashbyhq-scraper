const { getPool } = require('./db');

async function upsertCompany(name, ashbySlug) {
  const pool = getPool();
  await pool.query(
    `INSERT INTO companies (name, ashby_slug)
     VALUES ($1, $2)
     ON CONFLICT (ashby_slug) DO UPDATE SET name = EXCLUDED.name`,
    [name, ashbySlug]
  );
}

async function updateLastScraped(ashbySlug) {
  const pool = getPool();
  await pool.query(
    `UPDATE companies SET last_scraped_at = NOW() WHERE ashby_slug = $1`,
    [ashbySlug]
  );
}

async function getCompany(ashbySlug) {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT * FROM companies WHERE ashby_slug = $1',
    [ashbySlug]
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
    map[row.ashby_slug] = row.last_scraped_at
      ? row.last_scraped_at.toISOString()
      : null;
  }
  return map;
}

module.exports = { upsertCompany, updateLastScraped, getCompany, getAllCompaniesLastScraped };
