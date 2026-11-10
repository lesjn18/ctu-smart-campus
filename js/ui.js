// =====================================================================
// ui.js  -  CLIENT / USER INTERFACE LAYER
// ---------------------------------------------------------------------
// Handles everything the user sees and clicks: the form, the list,
// messages and the online/offline badge. It never validates data or
// touches saved data itself - it only calls the service's functions
// (submitRequest, loadRequests, filterRequests, changeStatus, ...).
// =====================================================================

export function createUI(service) {
  const $ = (selector) => document.querySelector(selector);
  const els = {
    form: $("#request-form"),
    name: $("#studentName"),
    type: $("#concernType"),
    description: $("#description"),
    date: $("#dateOfRequest"),
    descCount: $("#desc-count"),
    submit: $("#submit-btn"),
    message: $("#message-area"),
    idBox: $("#new-id-box"),
    idValue: $("#new-id-value"),
    copyId: $("#copy-id-btn"),
    list: $("#request-list"),
    count: $("#result-count"),
    search: $("#search-input"),
    statusFilter: $("#status-filter"),
    clear: $("#clear-filters"),
    badge: $("#connection-badge"),
    offlineNotice: $("#offline-notice"),
    cacheNotice: $("#cache-notice"),
    serverDown: $("#server-down-toggle"),
    reset: $("#reset-btn"),
    defaultStatus: $("#default-status-label"),
  };
  const fields = ["studentName", "concernType", "description"];
  let lastLoad = { requests: [], source: "server" };

  // ---------- tiny helper to build elements safely (no innerHTML) ----------
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (key === "text") el.textContent = value;
      else if (key === "class") el.className = value;
      else el.setAttribute(key, value);
    }
    for (const child of children) el.append(child);
    return el;
  }

  // ---------- messages (Part I requirement 7) ----------
  function showMessage(type, text) {
    els.message.replaceChildren(h("div", { class: `message ${type}`, role: type === "error" ? "alert" : "status", text }));
  }
  function clearMessage() {
    els.message.replaceChildren();
  }

  // ---------- field errors ----------
  function clearFieldErrors() {
    for (const f of fields) {
      $(`#${f}-error`).textContent = "";
      $(`#${f}`).closest(".field").classList.remove("invalid");
      $(`#${f}`).removeAttribute("aria-invalid");
    }
  }
  function showFieldErrors(errors) {
    clearFieldErrors();
    let firstInvalid = null;
    for (const f of fields) {
      if (errors[f]) {
        $(`#${f}-error`).textContent = errors[f];
        $(`#${f}`).closest(".field").classList.add("invalid");
        $(`#${f}`).setAttribute("aria-invalid", "true");
        if (!firstInvalid) firstInvalid = $(`#${f}`);
      }
    }
    if (firstInvalid) firstInvalid.focus();
  }

  // ---------- connection status ----------
  function updateConnectionStatus() {
    const online = navigator.onLine;
    els.badge.textContent = online ? "Online" : "Offline";
    els.badge.classList.toggle("online", online);
    els.badge.classList.toggle("offline", !online);
    els.offlineNotice.hidden = online;
  }

  // ---------- rendering the list ----------
  function renderRequests() {
    const filtered = service.filterRequests(lastLoad.requests, {
      query: els.search.value,
      statusKey: els.statusFilter.value,
    });
    const total = lastLoad.requests.length;
    els.count.textContent = total === 0 ? "" : `Showing ${filtered.length} of ${total} request${total === 1 ? "" : "s"}.`;

    if (filtered.length === 0) {
      els.list.replaceChildren(h("li", { class: "empty", text: total === 0 ? "No service requests yet. Submit one using the form." : "No requests match your search or filter." }));
      return;
    }

    const { statuses } = service.getFormOptions();
    els.list.replaceChildren(
      ...filtered.map((r) => {
        const select = h("select", { class: "status-select", "data-id": r.id, id: `status-${r.id}` });
        for (const s of statuses) {
          const option = h("option", { value: s.key, text: s.label });
          if (s.key === r.status) option.selected = true;
          select.append(option);
        }
        return h("li", { class: "request" },
          h("div", { class: "request-head" },
            h("span", { class: "request-id", text: r.id }),
            h("span", { class: "badge", "data-status": r.status, text: service.getStatusLabel(r.status) })),
          h("dl", {},
            h("dt", { text: "Student" }), h("dd", { text: r.studentName }),
            h("dt", { text: "Concern" }), h("dd", { text: r.concernType }),
            h("dt", { text: "Date" }), h("dd", { text: r.dateOfRequest }),
            h("dt", { text: "Description" }), h("dd", { text: r.description })),
          h("div", { class: "request-foot" },
            h("label", { for: `status-${r.id}`, text: "Change status:" }), select));
      })
    );
  }

  async function refreshList() {
    const result = await service.loadRequests();
    if (!result.ok) {
      lastLoad = { requests: [], source: "none" };
      els.cacheNotice.hidden = false;
      els.cacheNotice.textContent = result.error.message;
      renderRequests();
      return;
    }
    lastLoad = result;
    if (result.source === "cache") {
      els.cacheNotice.hidden = false;
      els.cacheNotice.textContent =
        result.reason === "OFFLINE"
          ? "Offline: showing the last saved copy of the requests. It may be out of date."
          : "The data service is not responding: showing the last saved copy of the requests. It may be out of date.";
    } else {
      els.cacheNotice.hidden = true;
    }
    renderRequests();
  }

  // ---------- event handlers ----------
  async function handleSubmit(event) {
    event.preventDefault();
    clearMessage();
    clearFieldErrors();
    els.idBox.hidden = true;

    els.submit.disabled = true;
    els.submit.textContent = "Submitting...";
    const result = await service.submitRequest({
      studentName: els.name.value,
      concernType: els.type.value,
      description: els.description.value,
    });
    els.submit.disabled = false;
    els.submit.textContent = "Submit Request";

    if (result.ok) {
      showMessage("success", `Success! Your request was submitted. Request ID: ${result.request.id}`);
      els.idValue.textContent = result.request.id;
      els.idBox.hidden = false;
      els.form.reset();
      els.date.value = service.getToday();
      updateDescriptionCount();
      await refreshList();
    } else if (result.errors) {
      showFieldErrors(result.errors);
      showMessage("error", "Your request was not submitted. Please fix the highlighted fields.");
    } else {
      showMessage("error", result.error.message); // honest failure message (offline / server down)
    }
  }

  async function handleStatusChange(event) {
    const select = event.target.closest(".status-select");
    if (!select) return;
    const id = select.dataset.id;
    select.disabled = true;
    const result = await service.changeStatus(id, select.value);
    if (result.ok) {
      showMessage("success", `Status of ${id} changed to "${service.getStatusLabel(select.value)}".`);
    } else {
      showMessage("error", result.error.message);
    }
    await refreshList(); // re-draw so the list always shows the real saved status
  }

  function updateDescriptionCount() {
    const limits = service.getValidationLimits();
    els.descCount.textContent = `${els.description.value.length}/${limits.descriptionMax}`;
  }

  async function handleCopyId() {
    const id = els.idValue.textContent;
    try {
      await navigator.clipboard.writeText(id);
      showMessage("info", `Request ID ${id} copied.`);
    } catch {
      showMessage("info", `Select and copy this Request ID: ${id}`);
    }
  }

  async function handleServerToggle() {
    service.setDemoServerDown(els.serverDown.checked);
    showMessage("info", els.serverDown.checked
      ? "Demo: data-service failure is ON. Server operations will fail."
      : "Demo: data service is back to normal.");
    await refreshList();
  }

  async function handleReset() {
    if (!window.confirm("Delete all saved demo requests on this device?")) return;
    service.resetDemoData();
    els.idBox.hidden = true;
    showMessage("info", "Demo data cleared.");
    await refreshList();
  }

  // ---------- start-up ----------
  function populateOptions() {
    const { concernTypes, statuses } = service.getFormOptions();
    for (const type of concernTypes) els.type.append(h("option", { value: type, text: type }));
    for (const s of statuses) els.statusFilter.append(h("option", { value: s.key, text: s.label }));
    els.defaultStatus.textContent = service.getDefaultStatusLabel();
  }

  async function init() {
    populateOptions();
    els.date.value = service.getToday();
    els.serverDown.checked = service.isDemoServerDown();
    updateConnectionStatus();
    updateDescriptionCount();

    els.form.addEventListener("submit", handleSubmit);
    els.description.addEventListener("input", updateDescriptionCount);
    for (const f of fields) $(`#${f}`).addEventListener("input", () => {
      $(`#${f}-error`).textContent = "";
      $(`#${f}`).closest(".field").classList.remove("invalid");
    });
    els.search.addEventListener("input", renderRequests);
    els.statusFilter.addEventListener("change", renderRequests);
    els.clear.addEventListener("click", () => { els.search.value = ""; els.statusFilter.value = "ALL"; renderRequests(); });
    els.list.addEventListener("change", handleStatusChange);
    els.copyId.addEventListener("click", handleCopyId);
    els.serverDown.addEventListener("change", handleServerToggle);
    els.reset.addEventListener("click", handleReset);

    window.addEventListener("offline", () => { updateConnectionStatus(); refreshList(); });
    window.addEventListener("online", () => { updateConnectionStatus(); showMessage("info", "You are back online."); refreshList(); });

    await refreshList();
  }

  return { init };
}
