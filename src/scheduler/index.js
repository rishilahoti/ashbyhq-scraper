const cron = require('node-cron');
const config = require('../config');
const { logger, jitteredDelay } = require('../utils');
const { runPipeline } = require('./pipeline');

function startScheduler() {
  const cronExpr = config.schedule.cron;
  logger.info(`Scheduler starting with cron: "${cronExpr}"`);

  const task = cron.schedule(cronExpr, async () => {
    const jitterMs = Math.random() * config.schedule.jitterMaxMinutes * 60 * 1000;
    logger.info(`Scheduled run triggered. Jitter delay: ${Math.round(jitterMs / 1000)}s`);

    await jitteredDelay(0, jitterMs);
    await runPipeline();
  });

  logger.info('Scheduler is running. Press Ctrl+C to stop.');
  return task;
}

module.exports = { startScheduler, runPipeline };
