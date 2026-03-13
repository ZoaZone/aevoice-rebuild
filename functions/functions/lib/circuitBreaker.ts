// Simple in-memory circuit breaker per key
const breakerState = {};

export function createCircuitBreaker(name, options = {}) {
  const failureThreshold = options.failureThreshold ?? 5;
  const cooldownMs = options.cooldownMs ?? 60_000;

  if (!breakerState[name]) {
    breakerState[name] = {
      failures: 0,
      lastFailureTime: 0,
      openUntil: 0,
    };
  }

  const state = breakerState[name];

  const isOpen = () => Date.now() < state.openUntil;

  const recordSuccess = () => {
    state.failures = 0;
    state.openUntil = 0;
  };

  const recordFailure = () => {
    state.failures += 1;
    state.lastFailureTime = Date.now();
    if (state.failures >= failureThreshold) {
      state.openUntil = Date.now() + cooldownMs;
      console.warn(
        `[CircuitBreaker:${name}] Opened for ${cooldownMs}ms after ${state.failures} failures`,
      );
    }
  };

  return {
    isOpen,
    recordSuccess,
    recordFailure,
  };
}
