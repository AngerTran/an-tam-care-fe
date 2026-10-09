// In-memory mock database persisted to localStorage so demo actions survive a reload.
// Replace src/api/* implementations with real HTTP calls once the backend exists.
import { seed, type DB } from "./seed";

const KEY = "atc-db-v8";

function load(): DB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DB;
  } catch {
    /* storage unavailable: fall back to seed */
  }
  return structuredClone(seed);
}

let state: DB = load();

export const db = () => state;

export function commit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

export function resetDb() {
  state = structuredClone(seed);
  commit();
}

export const nextId = (rows: { id: number }[]) => rows.reduce((m, r) => Math.max(m, r.id), 0) + 1;

export const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));

export function nowIso() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}
