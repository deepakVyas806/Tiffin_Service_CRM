import { handleDelete, handleGet, handlePatch, handlePost, handlePut } from "./supabase-api/router";

const cache = new Map();
const DEFAULT_TTL = 15000;

function cachedGet(path, ttl = DEFAULT_TTL) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && hit.expires > now) return hit.promise;

  const promise = handleGet(path)
    .then((data) => ({ data }))
    .catch((error) => {
      cache.delete(path);
      throw error;
    });

  cache.set(path, { promise, expires: now + ttl });
  return promise;
}

function clearCache() {
  cache.clear();
}

export const api = {
  async get(path) {
    return cachedGet(path);
  },
  async post(path, body) {
    const result = { data: await handlePost(path, body) };
    clearCache();
    return result;
  },
  async patch(path, body) {
    const result = { data: await handlePatch(path, body) };
    clearCache();
    return result;
  },
  async put(path, body) {
    const result = { data: await handlePut(path, body) };
    clearCache();
    return result;
  },
  async delete(path) {
    const result = { data: await handleDelete(path) };
    clearCache();
    return result;
  },
  clearCache,
};
