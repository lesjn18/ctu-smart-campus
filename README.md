# CTU Smart Campus Service Request System (prototype)

A web application that lets students report campus concerns (classroom equipment, laboratory, facility maintenance, others),
get a unique Request ID, and track the status of each request. Built with plain HTML, CSS and JavaScript (ES modules) as a
Progressive Web App (PWA).

## How to run

The app uses JavaScript modules and a service worker, so it must be opened from a local web server (not by double-clicking the file).

**Option 1 - VS Code Live Server (easiest)**
1. Open the `ctu-smart-campus` folder in VS Code.
2. Install the "Live Server" extension.
3. Right-click `index.html` and choose **Open with Live Server**.

**Option 2 - Python**
1. Open a terminal inside the `ctu-smart-campus` folder.
2. Run `python -m http.server 5500`.
3. Open http://localhost:5500 in Chrome or Edge.

## Folder structure

```
ctu-smart-campus/
  index.html            page structure (form, list, demo controls)
  manifest.json         PWA manifest (name, icons, colors, start page)
  service-worker.js     PWA offline caching
  css/styles.css        responsive styling (mobile and desktop)
  js/
    app.js              starts the app and connects the layers
    ui.js               USER INTERFACE layer (what the user sees and clicks)
    requestService.js   SERVICE layer (validation, unique IDs, status rules, search/filter)
    dataStore.js        DATA layer (saving and loading; simulated server + local cache)
    config.js           settings (status names, concern types, validation limits)
  icons/                app icons (192 and 512 px)
  docs/                 architecture diagram and usability testing record
  README.md
```

## Features (mapped to the examination parts)

**Part I - Functionality**
- Responsive request form: Student Name, Type of Concern, Description, Date of Request (automatic).
- Input validation on all required fields, with clear messages under each field.
- Submit and display requests; every request gets a **unique Request ID** such as `SR-20261109-0001`.
- Status management: Pending, In Progress, Resolved (changed with the "Change status" menu on each request).
- Search by Request ID or keyword, and filter by status.
- Success and error messages for every operation.
- Two requests with identical descriptions are saved separately with different IDs (the ID comes from a counter, not from the text).

**Part II - Architecture and loose coupling**
- Three layers: UI (`ui.js`) -> Service (`requestService.js`) -> Data (`dataStore.js`). Each layer calls only the layer below it through defined functions.
- The UI never touches saved data; the data layer knows nothing about forms or validation.
- Status keys (`NEW`, `IN_PROGRESS`, `DONE`) are stored in the data; the labels shown to users live in `config.js`.
  **To change statuses to Submitted / Under Review / Completed, edit only the three `label` values in `js/config.js`.**
- Architecture diagram: `docs/architecture_diagram.png`.

**Part III - PWA**
- `manifest.json` with name, icons, theme color and start page.
- `service-worker.js` caches the app files (HTML, CSS, JavaScript, icons, manifest) and serves them when offline.
- Offline behavior:
  - Works offline: opening the app, viewing the last saved copy of the requests, searching and filtering them.
  - Needs the online service: submitting a request and changing a status. When offline, the app shows an error saying the action was NOT completed, and it never shows a success message.
- Responsive layout for phones and desktops.

## How to demonstrate each technical challenge

**Challenge A - Server failure**
1. Show a normal submission working (Success message with a Request ID).
2. Open **Demo controls** at the bottom and tick **Simulate data-service failure**. A notice says the service is not responding and shows the last saved copy.
3. Fill in the form and submit. The app shows "The data service is not responding. Your action was NOT completed." No success message, no new request in the list, and what you typed stays in the form.
4. Untick the box, submit again, and it succeeds.

**Challenge B - Input validation**
1. Click **Submit Request** with the form empty: every required field shows a message.
2. Enter a name with digits (for example `J0hn 99`) and a description shorter than 10 characters: specific messages appear.
3. Correct the fields and submit: the request is accepted and a Request ID is shown.

**Challenge C - Component modification and loose coupling** (pick one)
- *Option 1 (service layer only):* in `js/requestService.js`, function `buildRequestId`, change the return line to:

  ```js
  return `CTU-${String(sequence).padStart(4, "0")}-${datePart}`;
  ```

  Save and refresh. New requests get IDs like `CTU-0003-20261109`. The form, list, search, status change and data layer all keep working without any edits.
- *Option 2 (UI layer only):* in `js/ui.js`, change the text `"Submit Request"` (two places in `handleSubmit`) and the button text in `index.html`.
  Only the screen changes; validation, IDs and saving are untouched.
- *Option 3 (configuration only):* in `js/config.js`, change the status labels to Submitted / Under Review / Completed. Badges, the filter menu and the status menus update automatically.

## Testing the PWA offline

1. Open the app with Live Server (or `python -m http.server`) while online and reload once so the files are cached.
2. In Chrome DevTools: **Application -> Service Workers** (should show "activated") and **Application -> Cache Storage** (should list `ctu-service-requests-v1`).
3. Tick **Offline** in **Network** (or in the Service Workers panel) and reload: the app still opens, shows the Offline badge and notice, and displays the saved requests. Try submitting: it is refused with a clear message.
4. Untick Offline: the badge returns to Online and normal operations work.

## Notes
- localStorage stands in for the server database in this prototype. `dataStore.js` is the only file that uses it, so it could be replaced by real API calls without changing the other layers.
- After changing code, if the browser shows old files, refresh with Ctrl+F5, or use **Application -> Service Workers -> Update / Unregister**. You can also raise the version number in `CACHE_NAME` inside `service-worker.js`.
- **Reset demo data** (in Demo controls) clears all saved requests and restarts the ID counter, which is useful before recording the demonstration.
