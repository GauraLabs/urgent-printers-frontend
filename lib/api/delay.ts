/** Simulates network latency in mock mode. Remove/replace when using a real API. */
export function delay(ms = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
