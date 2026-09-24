import axios from 'axios';

const BASE_URL = 'https://pokeapi.co/api/v2';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

const client = axios.create({ baseURL: BASE_URL });

// PokeAPI resources are immutable, so successful responses can be cached
// indefinitely in memory. Caching the in-flight promise (not just the
// resolved value) also dedupes concurrent requests for the same URL.
const cache = new Map();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWithRetry(url, config, attempt = 0) {
  try {
    return await client.get(url, config);
  } catch (error) {
    if (attempt >= MAX_RETRIES) throw error;
    await sleep(RETRY_DELAY_MS * (attempt + 1));
    return getWithRetry(url, config, attempt + 1);
  }
}

// Accepts either a path relative to the PokeAPI base URL (e.g. '/pokemon?limit=30')
// or a full URL (as returned in other PokeAPI responses' `url` fields).
function get(url, config) {
  const cacheKey = config ? `${url}::${JSON.stringify(config)}` : url;
  if (!cache.has(cacheKey)) {
    const request = getWithRetry(url, config).catch((error) => {
      cache.delete(cacheKey);
      throw error;
    });
    cache.set(cacheKey, request);
  }
  return cache.get(cacheKey);
}

const pokeapi = { get, BASE_URL };

export default pokeapi;
