function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function jitteredDelay(minMs, maxMs) {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return delay(ms);
}

module.exports = { delay, jitteredDelay };
