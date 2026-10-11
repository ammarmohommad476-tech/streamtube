/* ============================================================
   streamtube.js — boot phase + authoritative router.
   Loaded LAST, after data.js, store.js, ui.js, app.js,
   app-patch.js, pages.js and messages.js.

   WHY THIS FILE OWNS ROUTING
   --------------------------
   app.js declares its route table with named function references
   (viewHome, viewMessages, ...) that live inside its own closure.
   At the moment app.js boots, only viewHome / viewShorts /
   viewWatch exist — the other seven pages arrive later, from
   pages.js and messages.js. So app.js's table is a snapshot of a
   half-built app, and its own hashchange listener keeps firing and
   painting its "page did not register" fallback over the real
   pages.

   This file therefore replaces the route table with one that
   resolves each view by name at call time, and re-renders on
   navigation. app.js's router pass still runs first on a hash
   change, but its result is immediately overwritten below. The
   last writer wins, and it is us.
   ============================================================ */

(function () {
  "use strict";

  const boot = window.__ST;
  if (!boot) {
    console.error("StreamTube: app.js did not initialise. Check the script order in index.html.");
    return;
  }

  /* Home / Shorts / Watch are defined inside app.js (closure) and
     re-exported through the bridge by app-patch.js. The rest are globals
     set by pages.js and messages.js. Resolve at call time, so the order
     in which the scripts loaded cannot matter. */
  function resolve(name) {
    const local = boot.views && boot.views[name];
    if (typeof local === "function") return local;

    const cap = name.charAt(0).toUpperCase() + name.slice(1);
    const fn = window["view" + cap];
    if (typeof fn === "function") return fn;
    return null;
  }

  /* Routes that should render the Watch page but whose first path
     segment is not "watch" (e.g. #/v/v1) can be added here. */
  const ALIASES = {};

  function fallback(name) {
    boot.main.className = "main";
    boot.main.innerHTML =
      '<div class="empty">' + UI.ICONS.sparkle +
        "<h3>This page could not load</h3>" +
        "<p>The view for <b>" + UI.escapeHtml(name) + "</b> is missing. " +
        "Check that every script in index.html loaded, then hard-refresh " +
        "(Ctrl/Cmd + Shift + R).</p>" +
        '<p style="margin-top:16px"><a class="btn btn--primary" href="#/">Back to home</a></p>' +
      "</div>";
  }

  /* ---- Parse "#/watch/v1?x=1" into a route object ---- */
  function parse() {
    const raw = location.hash.replace(/^#\/?/, "");
    const qi = raw.indexOf("?");
    const path = qi === -1 ? raw : raw.slice(0, qi);
    const query = qi === -1 ? "" : raw.slice(qi + 1);
    const parts = path.split("/").filter(Boolean);
    return {
      name: (parts[0] || "home").toLowerCase(),
      param: parts[1] ? decodeURIComponent(parts[1]) : null,
      params: new URLSearchParams(query)
    };
  }

  /* ---- The single render entry point for the whole app ---- */
  function render() {
    const route = parse();
    const mapped = ALIASES[route.name];
    if (mapped) route.name = mapped;

    const fn = resolve(route.name);

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

    if (!fn) {
      console.warn("StreamTube: no view registered for route '" + route.name + "'.");
      fallback(route.name);
      return;
    }

    try {
      fn(route);
    } catch (err) {
      console.error("StreamTube: view '" + route.name + "' threw.", err);
      fallback(route.name);
      return;
    }

    UI.paintAll(boot.main);
    boot.syncBadges();
  }

  /* Navigation funnel — everything routes through here. */
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  /* ---- Stand down the competing router ----
     app.js installed a document-level click listener that calls
     location.hash on any [data-video] element. Buttons inside video
     cards (like / save / share / comment) never got to run because of
     it. app-patch.js marks those clicks in the capture phase; the
     fallback below honours the mark.

     This handler runs in the bubble phase, so every button's own
     listener has already fired by the time we see the event. */
  document.addEventListener("click", function (e) {
    if (e.__stHandled) return;
    const link = e.target.closest('[data-video], a[href^="#/"], [data-channel]');
    if (!link) return;
    if (link.dataset.video) { go("#/watch/" + link.dataset.video); return; }
    if (link.dataset.channel) { go("#/profile/" + link.dataset.channel); return; }
    /* Plain <a href="#/..."> — let the browser change the hash; our
       hashchange listener re-renders. */
  }, false);

  /* Run our render right after app.js's router on every hash change.
     app.js paints first, we paint second — a deterministic override. */
  window.addEventListener("hashchange", function () {
    setTimeout(render, 0);
  });

  /* Bridge for the page modules. */
  boot.repaint = render;
  boot.rerender = render;
  boot.go = go;
  boot.render = render;

  /* First paint. app.js already ran a half-built pass at the end of its
     IIFE; this replaces it now that every view exists. */
  render();

  console.log("StreamTube ready — " + ST.videos.length + " videos, " +
    ST.shorts.length + " Shorts, " + Store.state.threads.length + " conversations.");
})();
