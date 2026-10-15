/**
 * Fetch wrapper dengan timeout (AbortController) dan 1x retry otomatis
 * untuk kegagalan jaringan atau respons status 5xx.
 * Pemilik: Person 2 (Backend Services)
 */

export interface FetchWithTimeoutOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
}

export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeoutMs = 6000, retries = 1, ...fetchOptions } = options;

  let attempt = 0;
  while (attempt <= retries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Jika respons 5xx dan masih ada jatah retry, coba lagi
      if (response.status >= 500 && attempt < retries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      return response;
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      if (attempt < retries) {
        attempt++;
        await new Promise((resolve) => setTimeout(resolve, 300));
        continue;
      }

      throw err;
    }
  }

  throw new Error(`fetchWithTimeout failed after ${retries + 1} attempts for ${url}`);
}
