# CRAVE CLUB

A simple, customizable cafe/shop app built with plain HTML, CSS and JavaScript.

## Files
- `index.html` — screens and forms
- `style.css` — maroon, cream and butter-yellow cartoon-inspired design
- `app.js` — menu, orders, tables, money tracker, storage and contacts
- `manifest.json` — installable web app details
- `service-worker.js` — basic offline caching
- `images/logo.svg` — starter CRAVE CLUB logo (replace it with your own if you like)

## Run in VS Code
1. Open this folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` and choose **Open with Live Server**.

For phone installation, the app generally needs to be hosted on HTTPS. `localhost` is suitable for development on the same computer, but opening the HTML file directly with `file://` will not enable service-worker/offline features.

## Important data note
This starter app stores its data in the browser's `localStorage` on the device where it is used. It does not automatically sync between your computer and phone. Clearing browser data can remove saved records, so keep backups if the records matter.
