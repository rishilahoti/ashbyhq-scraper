const { getPool, initDb, closeDb } = require('./db');
const companies = require('./companies');
const jobs = require('./jobs');

module.exports = {
  getPool,
  initDb,
  closeDb,
  ...companies,
  ...jobs,
};
