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

function getDueCompanies(companiesLastScraped) {
  const enabled = getEnabledCompanies();
  const now = Date.now();

  return enabled.filter(company => {
    const lastScraped = companiesLastScraped[company.ashbySlug];
    if (!lastScraped) return true;
    const elapsed = (now - new Date(lastScraped).getTime()) / (1000 * 60 * 60);
    return elapsed >= company.frequencyHours;
  });
}

module.exports = { loadRegistry, getEnabledCompanies, addCompany, getDueCompanies };
