const chalk = require('chalk');
const { EVENT_TYPES } = require('../diff');

function printRunSummary(allChanges, scoredJobs) {
  console.log('\n' + chalk.bold('═══════════════════════════════════════════'));
  console.log(chalk.bold('  AshbyHQ Job Scraper — Run Summary'));
  console.log(chalk.bold('═══════════════════════════════════════════') + '\n');

  if (allChanges.length === 0) {
    console.log(chalk.gray('  No changes detected.\n'));
    return;
  }

  const byCompany = groupBy(allChanges, c => c.job.company);

  for (const [company, changes] of Object.entries(byCompany)) {
    const newCount = changes.filter(c => c.type === EVENT_TYPES.JOB_NEW).length;
    const updatedCount = changes.filter(c => c.type === EVENT_TYPES.JOB_UPDATED).length;
    const removedCount = changes.filter(c => c.type === EVENT_TYPES.JOB_REMOVED).length;

    console.log(chalk.bold.cyan(`  ${company}`));
    console.log(chalk.gray(`  ${newCount} new · ${updatedCount} updated · ${removedCount} removed`));
    console.log();

    const newJobs = changes.filter(c => c.type === EVENT_TYPES.JOB_NEW);
    for (const { job } of newJobs) {
      const scored = scoredJobs?.find(s => s.jobId === job.jobId && s.company === job.company);
      const scoreTag = scored ? chalk.yellow(` [score: ${scored.relevanceScore}]`) : '';
      console.log(`    ${chalk.green('+')} ${job.title}${scoreTag}`);
      console.log(`      ${chalk.gray(formatMeta(job))}`);
      if (job.compensationSummary) {
        console.log(`      ${chalk.green(job.compensationSummary)}`);
      }
      console.log(`      ${chalk.blue(job.applyUrl)}`);
      console.log();
    }

    const updatedJobs = changes.filter(c => c.type === EVENT_TYPES.JOB_UPDATED);
    for (const { job } of updatedJobs) {
      console.log(`    ${chalk.yellow('~')} ${job.title}`);
      console.log(`      ${chalk.gray(formatMeta(job))}`);
      console.log();
    }

    const removedJobs = changes.filter(c => c.type === EVENT_TYPES.JOB_REMOVED);
    for (const { job } of removedJobs) {
      console.log(`    ${chalk.red('-')} ${chalk.strikethrough(job.title)}`);
      console.log(`      ${chalk.gray(formatMeta(job))}`);
      console.log();
    }
  }

  if (scoredJobs && scoredJobs.length > 0) {
    console.log(chalk.bold('───────────────────────────────────────────'));
    console.log(chalk.bold(`  Top Opportunities (${scoredJobs.length} above threshold)`));
    console.log(chalk.bold('───────────────────────────────────────────\n'));

    const top = scoredJobs.slice(0, 10);
    for (const job of top) {
      console.log(`  ${chalk.bold.white(job.title)} ${chalk.gray('at')} ${chalk.cyan(job.company)}`);
      console.log(`    Score: ${chalk.yellow(job.relevanceScore)} — ${chalk.gray(job.signals.join(', '))}`);
      console.log(`    ${chalk.gray(formatMeta(job))}`);
      if (job.compensationSummary) {
        console.log(`    ${chalk.green(job.compensationSummary)}`);
      }
      console.log(`    ${chalk.blue(job.applyUrl)}`);
      console.log();
    }
  }

  console.log(chalk.bold('═══════════════════════════════════════════\n'));
}

function formatMeta(job) {
  const parts = [job.location];
  if (job.remote) parts.push('Remote');
  if (job.department) parts.push(job.department);
  if (job.team) parts.push(job.team);
  if (job.employmentType || job.employment_type) {
    parts.push(job.employmentType || job.employment_type);
  }
  return parts.filter(Boolean).join(' · ');
}

function groupBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const key = keyFn(item);
    if (!map[key]) map[key] = [];
    map[key].push(item);
  }
  return map;
}

module.exports = { printRunSummary };
