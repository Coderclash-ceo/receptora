// Simple leveled logger with consistent [timestamp] [tag] formatting.
// Intentionally minimal — no external library needed for this project's scope.

function timestamp() {
  return new Date().toISOString();
}

function createLogger(tag) {
  return {
    info: (...args) => console.log(`[${timestamp()}] [${tag}]`, ...args),
    warn: (...args) => console.warn(`[${timestamp()}] [${tag}] WARN:`, ...args),
    error: (...args) => console.error(`[${timestamp()}] [${tag}] ERROR:`, ...args),
  };
}

module.exports = { createLogger };