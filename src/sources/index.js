const fs = require('fs');
const path = require('path');
const { logger } = require('../utils');

const REGISTRY_PATH = path.resolve(__dirname, 'registry.json');

function loadRegistry() {
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  return JSON.parse(raw);
}

function getEnabledCompanies() {
  const all = loadRegistry();
  const enabled = all.filter(c => c.enabled);
  logger.debug(`Loaded ${enabled.length}/${all.length} enabled companies`);
  return enabled;
}

async function getEnabledCompaniesWithDb(pool) {
  const allRegistry = loadRegistry();
  const enabled = allRegistry.filter(c => c.enabled);

  const enabledSlugs = new Set(enabled.map(c => c.ashbySlug.toLowerCase()));
  const disabledSlugs = new Set(
    allRegistry.filter(c => !c.enabled).map(c => c.ashbySlug.toLowerCase())
  );

  try {
    const { rows } = await pool.query(
      'SELECT name, ashby_slug FROM companies'
    );

    let dbOnlyCount = 0;
    for (const row of rows) {
      const slug = row.ashby_slug.toLowerCase();
      if (!enabledSlugs.has(slug) && !disabledSlugs.has(slug)) {
        enabled.push({
          company: row.name,
          ashbySlug: row.ashby_slug,
          enabled: true,
          frequencyHours: 12,
        });
        enabledSlugs.add(slug);
        dbOnlyCount++;
      }
    }

    if (dbOnlyCount > 0) {
      logger.info(`Discovered ${dbOnlyCount} companies from DB not in registry`);
    }
  } catch (err) {
    logger.warn(`Could not read companies from DB, using registry only: ${err.message}`);
  }

  return enabled;
}

function addCompany(slug, name) {
  const registry = loadRegistry();
  const exists = registry.find(c => c.ashbySlug.toLowerCase() === slug.toLowerCase());
  if (exists) {
    logger.warn(`Company with slug "${slug}" already exists`);
    return false;
  }

  registry.push({
    company: name || slug,
    ashbySlug: slug,
    enabled: true,
    frequencyHours: 12,
  });

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2) + '\n', 'utf-8');
  logger.info(`Added company "${name || slug}" (${slug}) to registry`);
  return true;
}

function getDueCompanies(companiesLastScraped, allCompanies) {
  const enabled = allCompanies || getEnabledCompanies();
  const now = Date.now();

  return enabled.filter(company => {
    const lastScraped = companiesLastScraped[company.ashbySlug];
    if (!lastScraped) return true;
    const elapsed = (now - new Date(lastScraped).getTime()) / (1000 * 60 * 60);
    return elapsed >= company.frequencyHours;
  });
}

module.exports = { loadRegistry, getEnabledCompanies, getEnabledCompaniesWithDb, addCompany, getDueCompanies };
