import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';

const BASE_URL = 'https://pokeapi.co/api/v2';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

const client = axios.create({ baseURL: BASE_URL });

// PokeAPI resources are immutable, so successful responses can be cached
// indefinitely in memory. Caching the in-flight promise (not just the
// resolved value) also dedupes concurrent requests for the same URL.
const cache = new Map<string, Promise<AxiosResponse<unknown>>>();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWithRetry<T>(
  url: string,
  config?: AxiosRequestConfig,
  attempt = 0
): Promise<AxiosResponse<T>> {
  try {
    return await client.get<T>(url, config);
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
    await sleep(RETRY_DELAY_MS * (attempt + 1));
    return getWithRetry<T>(url, config, attempt + 1);
  }
}

// Accepts either a path relative to the PokeAPI base URL (e.g. '/pokemon?limit=30')
// or a full URL (as returned in other PokeAPI responses' `url` fields).
function get<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  const cacheKey = config ? `${url}::${JSON.stringify(config)}` : url;
  let request = cache.get(cacheKey);
  if (!request) {
    request = getWithRetry<T>(url, config).catch((error: unknown) => {
      cache.delete(cacheKey);
      throw error;
    }) as Promise<AxiosResponse<unknown>>;
    cache.set(cacheKey, request);
  }
  return request as Promise<AxiosResponse<T>>;
}

const pokeapi = { get, BASE_URL };

export default pokeapi;
