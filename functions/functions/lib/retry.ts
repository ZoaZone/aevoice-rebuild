export async function withRetry(fn, options = {}) {
  const {
    retries = 3,
    minDelayMs = 200,
    factor = 2,
    onRetry = () => {},
  } = options;

  let attempt = 0;
  let delay = minDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt > retries) throw error;
      await onRetry(error, attempt);
      await new Promise((r) => setTimeout(r, delay));
      delay *= factor;
    }
  }
}
