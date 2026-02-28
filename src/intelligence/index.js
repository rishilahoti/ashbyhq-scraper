const config = require('../config');
const { logger } = require('../utils');

function scoreJob(job) {
  const rules = config.intelligence.rules;
  let score = 0;
  const signals = [];

  score += scoreKeywords(job, rules, signals);
  score += scoreLocation(job, rules, signals);
  score += scoreRemote(job, rules, signals);
  score += scoreDepartment(job, rules, signals);
  score += scoreFreshness(job, rules, signals);

  return { score, signals };
}

function scoreKeywords(job, rules, signals) {
  if (!rules.keywords) return 0;

  let total = 0;
  const searchText = `${job.title} ${job.description}`.toLowerCase();

  for (const [keyword, weight] of Object.entries(rules.keywords)) {
    if (searchText.includes(keyword.toLowerCase())) {
      total += weight;
      signals.push(`keyword:"${keyword}" (${weight > 0 ? '+' : ''}${weight})`);
    }
  }

  return total;
}

function scoreLocation(job, rules, signals) {
  if (!rules.locations || !rules.locations.length) return 0;

  const jobLocation = (job.location || '').toLowerCase();
  for (const loc of rules.locations) {
    if (jobLocation.includes(loc.toLowerCase())) {
      signals.push(`location:"${loc}" (+${rules.locationBoost})`);
      return rules.locationBoost || 5;
    }
  }
  return 0;
}

function scoreRemote(job, rules, signals) {
  if (!rules.remoteBoost) return 0;
  if (job.remote) {
    signals.push(`remote (+${rules.remoteBoost})`);
    return rules.remoteBoost;
  }
  return 0;
}

function scoreDepartment(job, rules, signals) {
  if (!rules.departments || !rules.departments.length) return 0;

  const dept = (job.department || '').toLowerCase();
  for (const d of rules.departments) {
    if (dept.includes(d.toLowerCase())) {
      signals.push(`department:"${d}" (+${rules.departmentBoost})`);
      return rules.departmentBoost || 3;
    }
  }
  return 0;
}

function scoreFreshness(job, rules, signals) {
  if (!rules.freshnessBoostHours || !rules.freshnessBoost) return 0;

  const published = new Date(job.publishedAt || job.published_at);
  const hoursAgo = (Date.now() - published.getTime()) / (1000 * 60 * 60);

  if (hoursAgo <= rules.freshnessBoostHours) {
    signals.push(`fresh:${Math.round(hoursAgo)}h (+${rules.freshnessBoost})`);
    return rules.freshnessBoost;
  }
  return 0;
}

function filterAndRank(jobs) {
  const minScore = config.intelligence.minScore;

  const scored = jobs.map(job => {
    const { score, signals } = scoreJob(job);
    return { ...job, relevanceScore: score, signals };
  });

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const aboveThreshold = scored.filter(j => j.relevanceScore >= minScore);

  logger.info(
    `Intelligence: ${aboveThreshold.length}/${scored.length} jobs above threshold (min: ${minScore})`
  );

  return { all: scored, filtered: aboveThreshold };
}

module.exports = { scoreJob, filterAndRank };
