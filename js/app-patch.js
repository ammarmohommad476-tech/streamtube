/* ============================================================
   app-patch.js — repairs app.js from the outside.
   Loaded immediately AFTER app.js, BEFORE pages.js and
   streamtube.js. Kept separate so the large, already-published
   app.js does not have to be rewritten to fix three defects:

     1. app.js's Home view is a stub (category chips wired to a
        grid it never fills) and it keeps viewHome / viewShorts /
        viewWatch inside its own closure, so no other file can
        reach them. This file supplies a real Home page and
        publishes all three views on the bridge.

     2. app.js's document-level click delegation calls
        location.hash for any [data-video] element. Because like /
        save / share / subscribe buttons live INSIDE video cards,
        clicking them navigated to the video instead of running
        the button's own handler. This is the main reason the
        buttons felt dead. Fixed in the capture phase below.

     3. app.js's short-feed handler reads the like counter with
        btn.querySelector("[data-count]"), but the Shorts markup
        never sets that attribute, so the number never moved.
   ============================================================ */

(function () {
  "use strict";

  const A = window.__ST;
  if (!A) {
    console.error("StreamTube: app.js did not expose its bridge; the patch layer cannot run.");
    return;
  }

  /* ------------------------------------------------------------
     FIX 1 — a real Home view.

     The boot router resolves views by name, so replacing
     window.viewHome here takes effect; app.js's internal router
     keeps using its own stub, but the boot router always paints
     after it and wins.
     ------------------------------------------------------------ */
  window.viewHome = function () {
    const main = A.main;
    const T = A.T;

    main.className = "main";
    if (!T.chip) T.chip = "All";

    main.innerHTML =
      '<div class="chips" id="homeChips">' +
        ST.categories.map(function (c) {
          return '<button class="chip' + (T.chip === c ? " is-active" : "") +
            '" data-chip="' + c + '">' + c + "</button>";
        }).join("") +
      "</div>" +
      '<div class="grid" id="feedGrid"></div>';

    renderFeed();

    document.getElementById("homeChips").addEventListener("click", function (e) {
      const chip = e.target.closest("[data-chip]");
      if (!chip) return;
      T.chip = chip.dataset.chip;
      this.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-active", c === chip);
      });
      renderFeed();
    });

    function renderFeed() {
      let list = A.videoPool();
      if (T.chip !== "All") {
        list = list.filter(function (v) { return v.cat === T.chip; });
      }
      const grid = document.getElementById("feedGrid");
      if (!grid) return;
      if (!list.length) {
        grid.innerHTML = '<div class="empty">' +
          "<h3>Nothing in " + UI.escapeHtml(T.chip) + " yet</h3>" +
          "<p>Try another category, or upload something to fill it in.</p></div>";
        return;
      }
      grid.innerHTML = list.map(UI.videoCard).join("");
      UI.paintAll(grid);
    }
  };

  /* Publish the bridge's view registry so the boot router can reach the
     three views app.js defined privately. viewHome is read from the
     global we just set; Shorts and Watch come from app.js. */
  A.views = A.views || {};
  A.views.home = window.viewHome;
  if (typeof A.views.shorts !== "function" && typeof window.viewShorts === "function") {
    A.views.shorts = window.viewShorts;
  }
  if (typeof A.views.watch !== "function" && typeof window.viewWatch === "function") {
    A.views.watch = window.viewWatch;
  }

  /* ------------------------------------------------------------
     FIX 2 — stop card clicks swallowing button clicks.

     A capture-phase listener runs BEFORE app.js's bubble-phase
     delegation. When the click lands on anything interactive, flag
     the event. app.js's handler returns early on the flag, and
     streamtube.js's fallback navigation ignores it too — so the
     button's own listener is the one that acts.
     ------------------------------------------------------------ */
  const INTERACTIVE = [
    "button", "a", "input", "textarea", "select", "label",
    ".scrub", ".player__bar", ".short__actions", ".short__top",
    ".msg__hover", ".dm__input-row", ".short__bottom",
    "[data-sub]", "[data-menu]", "[data-speed]", "[data-short-like]",
    "[data-short-save]", "[data-short-share]", "[data-short-comment]",
    "[data-short-remix]", "[data-msg-react]", "[data-msg-reply]",
    "[data-msg-edit]", "[data-msg-unsend]", "[data-lib]", "[data-tab]",
    "[data-chip]", "[data-tag]", "[data-thread]", "[data-notif]",
    "[data-like-comment]", "[data-reply-comment]", "[data-delete-comment]",
    "[data-publish]", "[data-del-upload]"
  ].join(",");

  document.addEventListener("click", function (e) {
    if (e.target.closest(INTERACTIVE)) {
      e.__stHandled = true;
      if (A.markHandled) A.markHandled(e);
    }
  }, true);

  /* ------------------------------------------------------------
     FIX 3 — the Short like counter.
     The count is the last <span> in the button, not [data-count].
     ------------------------------------------------------------ */
  window.syncShortLikeButton = function (section, id) {
    if (!section) return;
    const btn = section.querySelector("[data-short-like]");
    if (!btn) return;

    const short = ST.shorts.find(function (x) { return x.id === id; });
    const on = Store.isIn("likedShorts", id);

    btn.classList.toggle("is-on", on);

    const ico = btn.querySelector(".short-act__ico");
    if (ico) ico.innerHTML = on ? UI.ICONS.likeFill : UI.ICONS.like;

    let counter = btn.querySelector("[data-count]");
    if (!counter) {
      const spans = btn.querySelectorAll("span");
      counter = spans[spans.length - 1];
    }
    if (counter && short) {
      counter.textContent = UI.compact(short.likes + (on ? 1 : 0));
    }
  };

  console.log("StreamTube: patch layer applied (home feed, click routing, short likes).");
})();
