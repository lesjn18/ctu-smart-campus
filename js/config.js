// =====================================================================
// config.js  -  Settings that can change WITHOUT touching other modules
// ---------------------------------------------------------------------
// Statuses are stored in the data by a stable KEY (e.g. "NEW").
// The LABEL is only what the user sees. To rename the statuses
// (Part II HOTS challenge), change the labels here and nothing else.
// =====================================================================

export const APP_CONFIG = {
  appName: "CTU Smart Campus Service Request System",
  idPrefix: "SR",                  // Request IDs look like SR-20261109-0001
  simulatedLatencyMs: 400,         // pretend network delay of the "server"
  storageKeys: {
    serverDb: "ctu_server_db",     // the simulated server database
    localCache: "ctu_local_cache", // last saved copy kept on the device
    counter: "ctu_request_counter",// sequence number for unique IDs
    serverDown: "ctu_server_down", // demo switch for Challenge A
  },
};

export const CONCERN_TYPES = [
  "Classroom Equipment",
  "Laboratory",
  "Facility Maintenance",
  "Others",
];

// Original statuses: Pending -> In Progress -> Resolved
// University change (HOTS): Submitted -> Under Review -> Completed
// (only the three "label" values below need to be edited)
export const STATUSES = [
  { key: "NEW",         label: "Pending" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "DONE",        label: "Resolved" },
];

export const DEFAULT_STATUS_KEY = "NEW";

export const VALIDATION = {
  nameMin: 2,
  nameMax: 60,
  descriptionMin: 10,
  descriptionMax: 500,
};
