// =====================================================================
// requestService.js  -  APPLICATION / SERVICE LAYER
// ---------------------------------------------------------------------
// Request-processing logic: validation, unique ID creation, status rules,
// searching and filtering. It never touches the screen (UI) and never
// touches localStorage (data store). It talks to the data layer ONLY
// through the store's functions.
// =====================================================================

import {
  APP_CONFIG,
  CONCERN_TYPES,
  STATUSES,
  DEFAULT_STATUS_KEY,
  VALIDATION,
} from "./config.js";

export function createRequestService(store) {
  // ---------- small helpers ----------
  function getToday() {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  }

  function buildRequestId(sequence, dateISO) {
    const datePart = dateISO.replaceAll("-", "");
    return `${APP_CONFIG.idPrefix}-${datePart}-${String(sequence).padStart(4, "0")}`;
  }

  // Turns technical errors into messages that do NOT mislead the user.
  function describeError(error) {
    if (error && error.code === "OFFLINE") {
      return {
        code: "OFFLINE",
        message: "You are offline. This action needs the online service, so it was NOT completed. Please reconnect and try again.",
      };
    }
    if (error && error.code === "SERVER_DOWN") {
      return {
        code: "SERVER_DOWN",
        message: "The data service is not responding. Your action was NOT completed. Please try again later.",
      };
    }
    return {
      code: "ERROR",
      message: `Something went wrong: ${error && error.message ? error.message : "unknown error"} Your action was NOT completed.`,
    };
  }

  // ---------- validation (Part I requirement 2) ----------
  function validate(input) {
    const errors = {};
    const studentName = String(input.studentName ?? "").trim();
    const concernType = String(input.concernType ?? "").trim();
    const description = String(input.description ?? "").trim();

    if (!studentName) {
      errors.studentName = "Student name is required.";
    } else if (studentName.length < VALIDATION.nameMin) {
      errors.studentName = `Name must be at least ${VALIDATION.nameMin} characters.`;
    } else if (studentName.length > VALIDATION.nameMax) {
      errors.studentName = `Name must be ${VALIDATION.nameMax} characters or fewer.`;
    } else if (!/^[\p{L}][\p{L}\p{M}.'\- ]*$/u.test(studentName)) {
      errors.studentName = "Name may contain only letters, spaces, periods, apostrophes and hyphens (no numbers).";
    }

    if (!concernType) {
      errors.concernType = "Please choose a type of concern.";
    } else if (!CONCERN_TYPES.includes(concernType)) {
      errors.concernType = "Please choose one of the listed types of concern.";
    }

    if (!description) {
      errors.description = "Please describe the concern.";
    } else if (description.length < VALIDATION.descriptionMin) {
      errors.description = `Please give more detail (at least ${VALIDATION.descriptionMin} characters; you typed ${description.length}).`;
    } else if (description.length > VALIDATION.descriptionMax) {
      errors.description = `Description must be ${VALIDATION.descriptionMax} characters or fewer.`;
    }

    return { valid: Object.keys(errors).length === 0, errors, cleaned: { studentName, concernType, description } };
  }

  // ---------- submit a request (Part I requirements 3 and 4) ----------
  async function submitRequest(input) {
    const result = validate(input);
    if (!result.valid) return { ok: false, errors: result.errors };

    try {
      const sequence = await store.nextSequence();      // unique number from the data layer
      const dateOfRequest = getToday();
      const request = {
        id: buildRequestId(sequence, dateOfRequest),     // different for every request,
        studentName: result.cleaned.studentName,         // even when descriptions are identical
        concernType: result.cleaned.concernType,
        description: result.cleaned.description,
        dateOfRequest,
        status: DEFAULT_STATUS_KEY,
        createdAt: new Date().toISOString(),
      };
      await store.saveRequest(request);
      return { ok: true, request };
    } catch (error) {
      return { ok: false, error: describeError(error) };
    }
  }

  // ---------- load, filter, status ----------
  async function loadRequests() {
    try {
      const { requests, source, reason } = await store.getAllRequests();
      const sorted = [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { ok: true, requests: sorted, source, reason };
    } catch (error) {
      return { ok: false, requests: [], error: describeError(error) };
    }
  }

  // Pure function: filters a list that is already in memory (Part I requirement 6)
  function filterRequests(requests, { query = "", statusKey = "ALL" } = {}) {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      const statusOk = statusKey === "ALL" || r.status === statusKey;
      const textOk =
        q === "" ||
        [r.id, r.studentName, r.concernType, r.description].some((v) => String(v).toLowerCase().includes(q));
      return statusOk && textOk;
    });
  }

  async function changeStatus(id, statusKey) {
    if (!STATUSES.some((s) => s.key === statusKey)) {
      return { ok: false, error: { code: "INVALID", message: "That status is not valid." } };
    }
    try {
      const request = await store.updateStatus(id, statusKey);
      return { ok: true, request };
    } catch (error) {
      return { ok: false, error: describeError(error) };
    }
  }

  // ---------- information the UI needs (so the UI never imports config) ----------
  function getFormOptions() {
    return { concernTypes: [...CONCERN_TYPES], statuses: STATUSES.map((s) => ({ ...s })) };
  }
  function getStatusLabel(key) {
    const found = STATUSES.find((s) => s.key === key);
    return found ? found.label : key;
  }
  function getDefaultStatusLabel() {
    return getStatusLabel(DEFAULT_STATUS_KEY);
  }
  function getValidationLimits() {
    return { ...VALIDATION };
  }

  // ---------- demo helpers (Challenge A and test resets) ----------
  function setDemoServerDown(flag) { store.setServerDown(flag); }
  function isDemoServerDown() { return store.isServerDown(); }
  function resetDemoData() { store.clearAllData(); }

  return {
    validate, submitRequest, loadRequests, filterRequests, changeStatus,
    getToday, getFormOptions, getStatusLabel, getDefaultStatusLabel, getValidationLimits,
    setDemoServerDown, isDemoServerDown, resetDemoData,
  };
}
