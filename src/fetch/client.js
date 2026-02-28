const axios = require('axios');
const config = require('../config');
const { logger, delay } = require('../utils');

const httpClient = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': config.fetch.userAgent,
    'Accept': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
  },
});

class FetchError extends Error {
  constructor(message, slug, statusCode, retryable) {
    super(message);
    this.name = 'FetchError';
    this.slug = slug;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

async function fetchJobBoard(slug) {
  const url = `${config.fetch.baseUrl}/${slug}`;
  const params = config.fetch.includeCompensation ? { includeCompensation: true } : {};

  let lastError;

  for (let attempt = 1; attempt <= config.fetch.maxRetries; attempt++) {
    try {
      logger.debug(`Fetching ${slug} (attempt ${attempt}/${config.fetch.maxRetries})`);
      const response = await httpClient.get(url, { params });

      if (!response.data || !Array.isArray(response.data.jobs)) {
        throw new FetchError(
          `Invalid response structure for ${slug}`,
          slug, response.status, false
        );
      }

      logger.info(`Fetched ${response.data.jobs.length} jobs from ${slug}`);
      return response.data;
    } catch (err) {
      if (err instanceof FetchError && !err.retryable) throw err;

      const status = err.response?.status;
      const retryable = !status || status >= 500 || status === 429;

      lastError = new FetchError(
        `Fetch failed for ${slug}: ${err.message}`,
        slug, status, retryable
      );

      if (!retryable) {
        logger.error(`Non-retryable error for ${slug} (HTTP ${status})`);
        throw lastError;
      }

      if (attempt < config.fetch.maxRetries) {
        const backoff = config.fetch.retryBaseMs * Math.pow(2, attempt - 1);
        const jitter = Math.random() * backoff * 0.5;
        const waitMs = backoff + jitter;
        logger.warn(`Retrying ${slug} in ${Math.round(waitMs)}ms (attempt ${attempt}/${config.fetch.maxRetries})`);
        await delay(waitMs);
      }
    }
  }

  throw lastError;
}

module.exports = { fetchJobBoard, FetchError };
