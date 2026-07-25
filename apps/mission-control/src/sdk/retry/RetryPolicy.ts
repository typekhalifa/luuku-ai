export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      await new Promise((resolve) =>
        setTimeout(resolve, 1000),
      );
    }
  }

  throw lastError;
}