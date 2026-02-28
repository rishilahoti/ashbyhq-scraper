const crypto = require('crypto');

function contentHash(...fields) {
  const payload = fields.map(f => (f ?? '')).join('|');
  return crypto.createHash('md5').update(payload).digest('hex');
}

module.exports = { contentHash };
