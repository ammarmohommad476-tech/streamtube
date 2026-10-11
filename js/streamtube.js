/* ============================================================
   streamtube.js — boot phase.
   Loaded LAST, after data.js, store.js, ui.js, app.js,
   pages.js and messages.js.

   app.js declares the route table with named function references
   (viewHome, viewMessages, ...). Those names live inside app.js's
   own closure, so the page modules can't rebind them after the
   fact. This file therefore swaps in a resolver-based route table
   and re-runs the router once every view is registered.
   ============================================================ */

(function () {
  "use strict";

  const boot = window.__ST;
  if (!boot) {
    console.error("StreamTube: app.js did not initialise. Check the script order in index.html.");
    return;
  }

  /* ---- Re-resolve every route against the global view functions ---- */
  function view(name) {
    const fn = window["view" + name];
    if (typeof fn === "function") return fn;
    return function (r) { fallback(name, r); };
  }

  function fallback(name, r) {
    const main = boot.main;
    main.className = "main";
    main.innerHTML =
      '<div class="empty">' +
        UI.ICONS.sparkle +
        "<h3>This page could not load</h3>" +
        "<p>The view for <b>" + UI.escapeHtml(name) + "</b> did not register. " +
        "Check that every script in index.html loaded, then hard-refresh the page.</p>" +
        '<p style="margin-top:16px"><a class="btn btn--primary" href="#/">Back to home</a></p>' +
      "</div>";
  }

  /* Route table rebuilt so every entry resolves the *global* view.
     app.js only had the Watch page + the empty Home placeholder at
     boot time; the rest arrive from pages.js and messages.js. */
  boot.routes = {
    "": view("Home"),
    home: view("Home"),
    shorts: view("Shorts"),
    subscriptions: view("Subscriptions"),
    explore: view("Explore"),
    library: view("Library"),
    messages: view("Messages"),
    profile: view("Profile"),
    upload: view("Upload"),
    studio: view("Studio"),
    search: view("Search"),
    watch: view("Watch"),
    settings: view("Settings")
  };

  /* ---- Nav highlight + render, mirroring app.js's router ---- */
  function render() {
    const raw = location.hash.replace(/^#\/?/, "");
    const qi = raw.indexOf("?");
    const path = qi === -1 ? raw : raw.slice(0, qi);
    const query = qi === -1 ? "" : raw.slice(qi + 1);
    const parts = path.split("/").filter(Boolean);
    const route = {
      name: parts[0] || "home",
      param: parts[1] ? decodeURIComponent(parts[1]) : null,
      params: new URLSearchParams(query)
    };

    const fn = boot.routes[route.name] || boot.routes.home;

    document.querySelectorAll(".side-link[data-route]").forEach(function (a) {
      const active =
        a.dataset.route === route.name ||
        (route.name === "watch" && a.dataset.route === "home") ||
        (route.name === "search" && a.dataset.route === "explore") ||
        (route.name === "settings" && a.dataset.route === "profile");
      a.classList.toggle("is-active", active);
    });

    boot.main.className = "main";
    boot.main.innerHTML = "";
    window.scrollTo(0, 0);

    try {
      fn(route);
    } catch (err) {
      console.error("StreamTube: view '" + route.name + "' threw.", err);
      fallback(route.name, route);
    }

    UI.paintAll(boot.main);
    boot.syncBadges();
  }

  /* app.js already ran one router pass at the end of its IIFE, before the
     page modules registered their views. Re-render now that everything
     is in place. */
  render();
  boot.repaint = render;

  /* Re-render on navigation, after the browser applies the new hash. */
  let queued = false;
  window.addEventListener("hashchange", function () {
    if (queued) return;
    queued = true;
    setTimeout(function () {
      queued = false;
      render();
    }, 0);
  });

  console.log("StreamTube ready — " + ST.videos.length + " videos, " +
    ST.shorts.length + " Shorts, " + Store.state.threads.length + " conversations.");
})();
