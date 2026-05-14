import { handleDelete, handleGet, handlePatch, handlePost, handlePut } from "./supabase-api/router";

export const api = {
  async get(path) {
    return { data: await handleGet(path) };
  },
  async post(path, body) {
    return { data: await handlePost(path, body) };
  },
  async patch(path, body) {
    return { data: await handlePatch(path, body) };
  },
  async put(path, body) {
    return { data: await handlePut(path, body) };
  },
  async delete(path) {
    return { data: await handleDelete(path) };
  },
};
