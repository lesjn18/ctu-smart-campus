// =====================================================================
// app.js  -  Starts the application
// ---------------------------------------------------------------------
// Connects the three layers together and registers the service worker.
//   UI (ui.js)  ->  Service layer (requestService.js)  ->  Data layer (dataStore.js)
// Each layer only knows about the layer directly below it.
// =====================================================================

import { createDataStore } from "./dataStore.js";
import { createRequestService } from "./requestService.js";
import { createUI } from "./ui.js";

const store = createDataStore();
const service = createRequestService(store);
const ui = createUI(service);

ui.init();
   
// Demo controls are shown only when the address ends with ?demo=1
if (!location.search.includes("demo=1")) {
  document.querySelector(".demo-controls").hidden = true;
}

// ---- Progressive Web App: register the service worker ----
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then((registration) => console.log("Service worker registered. Scope:", registration.scope))
      .catch((error) => console.error("Service worker registration failed:", error));
  });
}
