// =====================================================================
// dataStore.js  -  DATA MANAGEMENT LAYER
// ---------------------------------------------------------------------
// The only module that reads or writes saved data.
// In this prototype, localStorage plays two roles:
//   1. the SIMULATED SERVER DATABASE  (needs the "service" to be online)
//   2. a LOCAL CACHE copy for viewing requests when the service is not reachable
// The rest of the app never touches localStorage directly.
// =====================================================================

import { APP_CONFIG } from "./config.js";

export class OfflineError extends Error {
  constructor(message = "The device is offline.") {
    super(message);
    this.name = "OfflineError";
    this.code = "OFFLINE";
  }
}

export class DataServiceError extends Error {
  constructor(message = "The data service is not responding.") {
    super(message);
    this.name = "DataServiceError";
    this.code = "SERVER_DOWN";
  }
}

export function createDataStore({
  storage = globalThis.localStorage,
  isOnline = () => globalThis.navigator.onLine,
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const keys = APP_CONFIG.storageKeys;

  // ---- small helpers for saved data ---------------------------------
  function read(key, fallback) {
    try {
      const raw = storage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  function write(key, value) {
    storage.setItem(key, JSON.stringify(value));
  }

  // ---- demo switch used for Challenge A (server failure) -------------
  function isServerDown() {
    return storage.getItem(keys.serverDown) === "true";
  }
  function setServerDown(flag) {
    storage.setItem(keys.serverDown, flag ? "true" : "false");
  }

  // ---- every "server" operation must pass through here ---------------
  async function connect() {
    await wait(APP_CONFIG.simulatedLatencyMs);
    if (!isOnline()) throw new OfflineError("You are offline.");
    if (isServerDown()) throw new DataServiceError("The data service is not responding.");
  }

  // ---- public operations -----------------------------------------------
  async function nextSequence() {
    await connect();
    const next = read(keys.counter, 0) + 1;
    write(keys.counter, next);
    return next;
  }

  async function saveRequest(request) {
    await connect();
    const all = read(keys.serverDb, []);
    if (all.some((r) => r.id === request.id)) {
      throw new Error("Duplicate request ID. The request was not saved.");
    }
    all.push(request);
    write(keys.serverDb, all);
    write(keys.localCache, all); // keep the local copy up to date
    return request;
  }

  // Returns { requests, source }. source is "server" or "cache".
  async function getAllRequests() {
    try {
      await connect();
      const all = read(keys.serverDb, []);
      write(keys.localCache, all);
      return { requests: all, source: "server" };
    } catch (error) {
      const cached = read(keys.localCache, null);
      if (cached !== null) {
        return { requests: cached, source: "cache", reason: error.code || "ERROR" };
      }
      throw error; // nothing saved on this device yet
    }
  }

  async function updateStatus(id, statusKey) {
    await connect();
    const all = read(keys.serverDb, []);
    const found = all.find((r) => r.id === id);
    if (!found) throw new Error("Request not found.");
    found.status = statusKey;
    found.updatedAt = new Date().toISOString();
    write(keys.serverDb, all);
    write(keys.localCache, all);
    return found;
  }

  function clearAllData() {
    storage.removeItem(keys.serverDb);
    storage.removeItem(keys.localCache);
    storage.removeItem(keys.counter);
  }

  return { nextSequence, saveRequest, getAllRequests, updateStatus, clearAllData, isServerDown, setServerDown };
}
