/* ============================================================
   app.js — router, page views and all interaction handlers.

   Pages: home · shorts · watch · subscriptions · explore ·
          library · messages · profile · upload · studio ·
          search · settings
   ============================================================ */

(function () {
  "use strict";

  const main       = document.getElementById("main");
  const sidebar    = document.getElementById("sidebar");
  const scrim      = document.getElementById("scrim");
  const notifPanel = document.getElementById("notifPanel");
  const shareModal = document.getElementById("shareModal");
  const toasts     = document.getElementById("toasts");
  const searchInput = document.getElementById("searchInput");

  /* ---------- transient UI state (never persisted) ---------- */
  const T = {
    chip: "All",
    tab: "videos",
    pageCleanup: null,
    shareTarget: null,
    replyTo: null,
    editingId: null,
    recording: false,
    recordTimer: null,
    recordSeconds: 0,
    callTimer: null
  };

  /* ============================================================
     Toast
     ============================================================ */
  function toast(msg) {
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = '<span class="toast__dot"></span><span>' + UI.escapeHtml(msg) + "</span>";
    toasts.appendChild(el);
    setTimeout(function () {
      el.classList.add("is-out");
      setTimeout(function () { el.remove(); }, 280);
    }, 2100);
  }

  /* ============================================================
     Theme
     ============================================================ */
  function applyTheme() {
    document.documentElement.dataset.theme = Store.state.theme;
  }

  document.getElementById("themeToggle").addEventListener("click", function () {
    Store.update(function (s) { s.theme = s.theme === "dark" ? "light" : "dark"; });
    applyTheme();
    repaint();
    toast(Store.state.theme === "dark" ? "Dark mode on" : "Light mode on");
  });

  /* ============================================================
     Sidebar + notification panel
     ============================================================ */
  document.getElementById("menuToggle").addEventListener("click", function () {
    if (window.innerWidth <= 760) sidebar.classList.toggle("is-open");
    else sidebar.classList.toggle("is-rail");
  });

  document.getElementById("notifBtn").addEventListener("click", function () {
    const open = notifPanel.classList.toggle("is-open");
    scrim.classList.toggle("is-on", open);
  });

  document.getElementById("clearNotifs").addEventListener("click", function () {
    Store.update(function (s) {
      s.notifications.forEach(function (n) { n.unread = false; });
    });
    renderNotifications();
    syncBadges();
    toast("All notifications marked as read");
  });

  function closeOverlays() {
    notifPanel.classList.remove("is-open");
    scrim.classList.remove("is-on");
    if (window.innerWidth <= 760) sidebar.classList.remove("is-open");
  }
  scrim.addEventListener("click", closeOverlays);

  /* ============================================================
     Share modal
     ============================================================ */
  function openShare(id) {
    T.shareTarget = id;
    const url = location.origin + location.pathname + "#/watch/" + id;
    document.getElementById("shareLinkInput").value = url;
    shareModal.classList.add("is-open");
  }
  function closeShare() { shareModal.classList.remove("is-open"); }

  shareModal.addEventListener("click", function (e) {
    if (e.target === shareModal || e.target.closest("[data-close-modal]")) { closeShare(); return; }
    const opt = e.target.closest(".share-opt");
    if (!opt) return;
    const kind = opt.dataset.share;
    const link = document.getElementById("shareLinkInput").value;

    if (kind === "copy") {
      copyText(link);
      toast("Link copied to clipboard");
    } else if (kind === "embed") {
      copyText('<iframe src="' + link + '" allowfullscreen></iframe>');
      toast("Embed code copied");
    } else if (kind === "dm") {
      closeShare();
      location.hash = "#/messages";
      toast("Pick a conversation to share it into");
    } else if (kind === "report") {
      closeShare();
      toast("Thanks — this content has been sent for review");
    }
  });

  document.getElementById("shareCopyBtn").addEventListener("click", function () {
    copyText(document.getElementById("shareLinkInput").value);
    toast("Link copied to clipboard");
  });

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) { /* ignore */ }
    ta.remove();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeShare(); closeOverlays(); stopRecording(); }
  });

  /* ============================================================
     Search
     ============================================================ */
  document.getElementById("searchForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) { toast("Type something to search for"); return; }
    location.hash = "#/search?q=" + encodeURIComponent(q);
  });

  /* ============================================================
     Badges + sidebar subscriptions
     ============================================================ */
  function syncBadges() {
    const nb = document.getElementById("notifBadge");
    const count = Store.unreadNotifications();
    nb.textContent = count > 99 ? "99+" : String(count);
    nb.dataset.count = String(count);

    const pill = document.getElementById("dmPill");
    const dms = Store.unreadMessages();
    pill.textContent = String(dms);
    pill.dataset.count = String(dms);

    document.getElementById("navAvatar").textContent = UI.initials(Store.state.myProfile.name);
  }

  function renderSideSubs() {
    const host = document.getElementById("sideSubs");
    const subs = Store.state.subscribed;
    if (!subs.length) {
      host.innerHTML = '<p style="padding:4px 12px;font-size:.8rem;color:var(--text-faint)">No subscriptions yet</p>';
      return;
    }
    host.innerHTML = subs.slice(0, 8).map(function (id) {
      const c = ST.creatorById(id);
      return '<a class="side-link" href="#/profile/' + id + '">' +
        UI.avatar(id, "sm") + "<span>" + UI.escapeHtml(c.name) + "</span></a>";
    }).join("");
  }

  /* ============================================================
     Notifications panel
     ============================================================ */
  function renderNotifications() {
    const list = document.getElementById("notifList");
    const items = Store.state.notifications;
    if (!items.length) {
      list.innerHTML = '<div class="empty"><h3>Nothing here yet</h3><p>New activity will show up here.</p></div>';
      return;
    }
    list.innerHTML = items.map(function (n) {
      const thumb = n.video
        ? '<div class="notif__thumb">' + UI.thumbCanvas(n.video) + "</div>"
        : UI.avatar(n.user);
      return '<div class="notif' + (n.unread ? " is-unread" : "") + '" data-notif="' + n.id + '">' +
        thumb +
        '<div class="notif__info">' +
          '<div class="notif__text"><b>' + UI.escapeHtml(ST.creatorById(n.user).name) + "</b> " + n.text + "</div>" +
          '<div class="notif__time">' + UI.timeAgo(n.hours) + "</div>" +
        "</div>" +
      "</div>";
    }).join("");
    UI.paintAll(list);
  }

  document.getElementById("notifList").addEventListener("click", function (e) {
    const item = e.target.closest("[data-notif]");
    if (!item) return;
    const n = Store.state.notifications.find(function (x) { return x.id === item.dataset.notif; });
    if (!n) return;
    Store.update(function (s) {
      s.notifications.forEach(function (x) { if (x.id === n.id) x.unread = false; });
    });
    syncBadges();
    renderNotifications();
    if (n.video) { closeOverlays(); location.hash = "#/watch/" + n.video; }
    else if (n.type === "follow") { closeOverlays(); location.hash = "#/profile/" + n.user; }
  });

  /* ============================================================
     Data helpers
     ============================================================ */
  function allVideos() {
    // User uploads appear first, then the seeded catalogue.
    return Store.state.uploads.concat(ST.videos);
  }

  function videoPool() {
    return Store.state.uploads.concat(ST.videos);
  }

  function findVideo(id) {
    return videoPool().find(function (v) { return v.id === id; }) || null;
  }

  function recommendedFor(v, n) {
    const pool = videoPool().filter(function (x) { return x.id !== v.id; });
    const sameCat = pool.filter(function (x) { return x.cat === v.cat; });
    const rest = pool.filter(function (x) { return x.cat !== v.cat; });
    return sameCat.concat(rest).slice(0, n || 8);
  }

  /* ============================================================
     ROUTER
     ============================================================ */
  const routes = {
    "": viewHome,
    home: viewHome,
    shorts: viewShorts,
    subscriptions: viewSubscriptions,
    explore: viewExplore,
    library: viewLibrary,
    messages: viewMessages,
    profile: viewProfile,
    upload: viewUpload,
    studio: viewStudio,
    search: viewSearch,
    watch: viewWatch,
    settings: viewSettings
  };

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "");
    const qi = raw.indexOf("?");
    const path = qi === -1 ? raw : raw.slice(0, qi);
    const query = qi === -1 ? "" : raw.slice(qi + 1);
    const parts = path.split("/").filter(Boolean);
    return {
      name: parts[0] || "home",
      param: parts[1] ? decodeURIComponent(parts[1]) : null,
      params: new URLSearchParams(query)
    };
  }

  function router() {
    if (T.pageCleanup) { T.pageCleanup(); T.pageCleanup = null; }

    const r = parseHash();
    const view = routes[r.name] || viewHome;

    document.querySelectorAll(".side-link[data-route]").forEach(function (a) {
      const active =
        a.dataset.route === r.name ||
        (r.name === "watch" && a.dataset.route === "home") ||
        (r.name === "search" && a.dataset.route === "explore") ||
        ((r.name === "settings") && a.dataset.route === "profile");
      a.classList.toggle("is-active", active);
    });

    main.className = "main";
    main.innerHTML = "";
    window.scrollTo(0, 0);
    view(r);
    UI.paintAll(main);
    syncBadges();
    renderSideSubs();
  }

  /** Re-render the current route (used after state mutations). */
  function repaint() { router(); }

  window.addEventListener("hashchange", router);

  /* ============================================================
     VIEW — HOME
     ============================================================ */
  function viewHome() {
    main.className = "main";

    const chips = ST.categories.map(function (c) {
      return '<button class="chip' + (T.chip === c ? " is-active" : "") + '" data-chip="' + c + '">' + c + "</button>";
    }).join("");

    main.innerHTML =
      '<div class="chips">' + chips + "</div>" +
      '<div class="grid" id="feedGrid"></div>';

    renderFeed();

    main.querySelector(".chips").addEventListener("click", function (e) {
      const chip = e.target.closest("[data-chip]");
      if (!chip) return;
      T.chip = chip.dataset.chip;
      main.querySelectorAll(".chip").forEach(function (c) {
        c.classList.toggle("is-active", c === chip);
      });
      renderFeed();
    });
  }

  function renderFeed() {
    let list = videoPool();
    if (T.chip !== "All") {
      list = list.filter(function (v) { return v.cat === T.chip; });
    }
    const grid = document.getElementById("feedGrid");
    if (!list.length) {
      grid.innerHTML = '<div class="empty"><h3>Nothing in ' + UI.escapeHtml(T.chip) + ' yet</h3>' +
        '<p>Try another category, or upload something to fill it in.</p></div>';
      return;
    }
    grid.innerHTML = list.map(UI.videoCard).join("");
    UI.paintAll(grid);
  }

  /* ============================================================
     VIEW — SHORTS  (vertical, swipe to advance, like/save/share)
     ============================================================ */
  function viewShorts() {
    main.className = "main main--flush";

    const items = ST.shorts.map(function (s) {
      const o = ST.creatorById(s.owner);
      const liked = Store.isIn("likedShorts", s.id);
      const saved = Store.isIn("savedShorts", s.id);
      return (
        '<section class="short" data-short="' + s.id + '">' +
          '<canvas data-seed="short-' + s.id + '" data-paint="0"></canvas>' +
          '<div class="short__shade"></div>' +
          '<div class="short__rings"><span></span></div>' +

          '<div class="short__top">' +
            '<span class="tag-pill" style="background:rgba(255,255,255,.16);color:#fff;border-color:transparent">Shorts</span>' +
            '<span class="tag-pill" style="background:rgba(255,255,255,.16);color:#fff;border-color:transparent">' + UI.compact(s.views) + ' views</span>' +
          '</div>' +

          '<div class="short__actions">' +
            '<button class="short-act' + (liked ? " is-on" : "") + '" data-short-like="' + s.id + '">' +
              '<span class="short-act__ico">' + (liked ? UI.ICONS.likeFill : UI.ICONS.like) + '</span>' +
              '<span data-count>' + UI.compact(s.likes + (liked ? 1 : 0)) + '</span>' +
            '</button>' +
            '<button class="short-act" data-short-comment="' + s.id + '">' +
              '<span class="short-act__ico">' + UI.ICONS.comment + '</span>' +
              '<span>' + UI.compact(s.comments) + '</span>' +
            '</button>' +
            '<button class="short-act" data-short-share="' + s.id + '">' +
              '<span class="short-act__ico">' + UI.ICONS.share + '</span>' +
              '<span>' + UI.compact(s.shares) + '</span>' +
            '</button>' +
            '<button class="short-act' + (saved ? " is-on" : "") + '" data-short-save="' + s.id + '">' +
              '<span class="short-act__ico">' + (saved ? UI.ICONS.saveFill : UI.ICONS.save) + '</span>' +
              '<span>' + UI.compact(s.saves) + '</span>' +
            '</button>' +
            '<button class="short-act" data-short-remix="' + s.id + '">' +
              '<span class="short-act__ico">' + UI.ICONS.scissors + '</span>' +
              '<span>Remix</span>' +
            '</button>' +
          '</div>' +

          '<div class="short__bottom">' +
            '<div class="short__owner">' + UI.avatar(o.id, "sm") +
              '<strong>' + UI.escapeHtml(o.name) + '</strong>' +
              (o.verified ? '<span style="color:#fff">' + UI.ICONS.verified + "</span>" : "") +
              UI.subButton(o.id, "sm") +
            '</div>' +
            '<p class="short__caption">' + UI.escapeHtml(s.caption) + '</p>' +
            '<span class="short__music">' + UI.ICONS.music +
              '<span class="marquee">' + UI.escapeHtml(s.music) + "</span></span>" +
          '</div>' +

          '<div class="swipe-hint">' + UI.ICONS.arrowUp + '<span>swipe up</span></div>' +
          '<div class="short__progress"><i></i></div>' +
        '</section>'
      );
    }).join("");

    main.innerHTML = '<div class="shorts-view"><div class="shorts-feed" id="shortsFeed">' + items + "</div></div>";
    UI.paintAll(main);

    const feed = document.getElementById("shortsFeed");
    const sections = Array.from(feed.querySelectorAll(".short"));

    /* Playback ticks only for the short in view. */
    findVideo_byShort = null;
    let activeIndex = 0;
    let elapsed = 0;
    let duration = 14; // seconds per short
    let playing = true;
    let raf = null;
    let last = performance.now();

    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        elapsed += dt;
        if (elapsed >= duration) {
          // auto-advance to the next short
          const next = sections[activeIndex + 1];
          if (next) { next.scrollIntoView({ behavior: "smooth" }); }
          else { elapsed = 0; }
        }
        const bar = sections[activeIndex].querySelector(".short__progress i");
        if (bar) bar.style.width = Math.min(100, (elapsed / duration) * 100) + "%";
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    /* Only the visible short is "playing". */
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        const all = sections.indexOf(en.target);
        if (all === -1) return;
        sections.forEach(function (s, i) {
          s.querySelectorAll("canvas").forEach(function (c) { c.style.filter = i === all ? "none" : "brightness(.55)"; });
        });
        activeIndex = all;
        elapsed = 0;
        playing = true;
        last = performance.now();
      });
    }, { root: feed, threshold: 0.6 });
    sections.forEach(function (s) { io.observe(s); });

    /* Pause when the tab is hidden. */
    function onVis() { playing = !document.hidden; last = performance.now(); }
    document.addEventListener("visibilitychange", onVis);

    /* Double-tap / double-click to like with a heart burst. */
    function onFeedDblClick(e) {
      const section = e.target.closest(".short");
      if (!section) return;
      const id = section.dataset.short;
      if (!Store.isIn("likedShorts", id)) {
        Store.toggleInList("likedShorts", id);
        syncShortLikeButton(section, id);
      }
      const rings = section.querySelector(".short__rings");
      rings.classList.remove("go");
      void rings.offsetWidth;
      rings.classList.add("go");
    }
    feed.addEventListener("dblclick", onFeedDblClick);

    /* Actions */
    function onFeedClick(e) {
      const likeBtn = e.target.closest("[data-short-like]");
      if (likeBtn) {
        const id = likeBtn.dataset.shortLike;
        Store.toggleInList("likedShorts", id);
        syncShortLikeButton(likeBtn.closest(".short"), id);
        return;
      }
      const saveBtn = e.target.closest("[data-short-save]");
      if (saveBtn) {
        const id = saveBtn.dataset.shortSave;
        const added = Store.toggleInList("savedShorts", id);
        toast(added ? "Saved to your collection" : "Removed from saved");
        repaint();
        return;
      }
      const shareBtn = e.target.closest("[data-short-share]");
      if (shareBtn) { openShare("short-" + shareBtn.dataset.shortShare); return; }
      const commentBtn = e.target.closest("[data-short-comment]");
      if (commentBtn) {
        const s = ST.shorts.find(function (x) { return x.id === commentBtn.dataset.shortComment; });
        toast(UI.exact(s.comments) + " comments — open a video to read the full thread");
        return;
      }
      const remixBtn = e.target.closest("[data-short-remix]");
      if (remixBtn) {
        toast("Remix mode — your clip will be cut alongside the original");
        return;
      }
      const act = e.target.closest("[data-sub]");
      if (act) { /* handled by the global subscribe handler */ return; }

      // Tap the background toggles play/pause
      if (e.target.closest(".short") && !e.target.closest("button")) {
        playing = !playing;
        last = performance.now();
      }
    }
    feed.addEventListener("click", onFeedClick);

    /* Keyboard: arrows move between shorts. */
    function onKey(e) {
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        const n = sections[activeIndex + 1];
        if (n) { e.preventDefault(); n.scrollIntoView({ behavior: "smooth" }); }
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        const p = sections[activeIndex - 1];
        if (p) { e.preventDefault(); p.scrollIntoView({ behavior: "smooth" }); }
      }
    }
    document.addEventListener("keydown", onKey);

    T.pageCleanup = function () {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVis);
    };
  }

  function syncShortLikeButton(section, id) {
    if (!section) return;
    const btn = section.querySelector("[data-short-like]");
    if (!btn) return;
    const s = ST.shorts.find(function (x) { return x.id === id; });
    const on = Store.isIn("likedShorts", id);
    btn.classList.toggle("is-on", on);
    btn.querySelector(".short-act__ico").innerHTML = on ? UI.ICONS.likeFill : UI.ICONS.like;
    const counter = btn.querySelector("[data-count]");
    if (counter && s) counter.textContent = UI.compact(s.likes + (on ? 1 : 0));
  }

  /* ============================================================
     VIEW — WATCH
     ============================================================ */
  function viewWatch(r) {
    const v = findVideo(r.param);
    if (!v) {
      main.className = "main";
      main.innerHTML = '<div class="empty"><h3>Video not found</h3><p>That link does not match anything in the catalogue.</p>' +
        '<p style="margin-top:14px"><a class="btn btn--primary" href="#/">Back to home</a></p></div>';
      return;
    }

    // Record history
    Store.update(function (s) {
      s.watchHistory = s.watchHistory.filter(function (x) { return x !== v.id; });
      s.watchHistory.unshift(v.id);
      s.watchHistory = s.watchHistory.slice(0, 60);
    });

    const o = ST.creatorById(v.owner);
    const liked = Store.isIn("likedVideos", v.id);
    const disliked = Store.isIn("dislikedVideos", v.id);
    const saved = Store.isIn("savedVideos", v.id);
    const subs = Store.isIn("subscribed", o.id);
    const likes = v.likes + (liked ? 1 : 0);
    const rail = recommendedFor(v, 10);

    main.className = "main";
    main.innerHTML =
      '<div class="watch">' +
        '<div class="watch__main">' +
          '<div class="player" id="player">' +
            '<canvas data-seed="' + v.id + '" data-paint="0"></canvas>' +
            '<div class="player__center"><button class="big-play" id="bigPlay" aria-label="Play">' + UI.ICONS.play + '</button></div>' +
            '<div class="player__flash" id="playerFlash">' + UI.ICONS.likeFill + '</div>' +
            '<div class="player__overlay">' +
              '<div class="scrub" id="scrub">' +
                '<span class="scrub__buffer" id="scrubBuffer" style="width:0"></span>' +
                '<span class="scrub__fill" id="scrubFill" style="width:0"></span>' +
                '<span class="scrub__knob" id="scrubKnob" style="left:0"></span>' +
              '</div>' +
              '<div class="player__bar">' +
                '<button class="icon-btn" id="playBtn" aria-label="Play/pause">' + UI.ICONS.play + '</button>' +
                '<button class="icon-btn" id="muteBtn" aria-label="Mute">' + UI.ICONS.volOn + '</button>' +
                '<span class="player__time" id="timeLabel">0:00 / ' + UI.clock(v.duration) + '</span>' +
                '<span class="player__spacer"></span>' +
                '<button class="icon-btn" id="captionsBtn" title="Captions" aria-label="Captions">CC</button>' +
                '<button class="icon-btn" id="speedBtn" title="Playback speed" aria-label="Playback speed">' + UI.ICONS.speed + '</button>' +
                '<button class="icon-btn" id="fullBtn" title="Fullscreen" aria-label="Fullscreen">' + UI.ICONS.full + '</button>' +
              '</div>' +
            '</div>' +
            '<div class="speed-menu" id="speedMenu">' +
              ST.speeds.map(function (s) {
                return '<button data-speed="' + s + '"' + (s === 1 ? ' class="is-on"' : "") + ">" +
                  (s === 1 ? "Normal" : s + "×") + "</button>";
              }).join("") +
            '</div>' +
          '</div>' +

          '<h1 class="watch__title">' + UI.escapeHtml(v.title) + "</h1>" +
          '<div class="watch__meta">' + UI.exact(v.views) + " views • " + UI.daysAgo(v.days) +
            (v.live ? ' • <span style="color:var(--accent);font-weight:700">LIVE NOW</span>' : "") + "</div>" +

          '<div class="owner-row">' +
            '<a href="#/profile/' + o.id + '">' + UI.avatar(o.id) + "</a>" +
            '<div class="owner-row__info">' +
              '<a href="#/profile/' + o.id + '" class="owner-row__name">' + UI.escapeHtml(o.name) +
                (o.verified ? '<span class="card__verify">' + UI.ICONS.verified + "</span>" : "") + "</a>" +
              '<div class="owner-row__sub">' + UI.compact(o.subs) + " subscribers</div>" +
            "</div>" +
            UI.subButton(o.id) +
          "</div>" +

          '<div class="actions">' +
            '<div class="action-group">' +
              '<button class="btn' + (liked ? " is-on" : "") + '" id="likeBtn">' + (liked ? UI.ICONS.likeFill : UI.ICONS.like) +
                " <span id="likeCount">" + UI.compact(likes) + "</span></button>" +
              '<button class="btn' + (disliked ? " is-on" : "") + '" id="dislikeBtn">' + UI.ICONS.dislike + "</button>" +
            "</div>" +
            '<button class="btn" id="shareBtn">' + UI.ICONS.share + " Share</button>" +
            '<button class="btn' + (saved ? " is-on" : "") + '" id="saveBtn">' + (saved ? UI.ICONS.saveFill : UI.ICONS.save) + " Save</button>" +
            '<button class="btn" id="speedQuick">' + UI.ICONS.speed + ' <span id="speedLabel">Speed</span></button>' +
            '<button class="btn" id="editBtn"' + (v.id.indexOf("up") === 0 ? "" : " disabled title=\"Available on your own uploads\"") + ">" +
              UI.ICONS.scissors + " Edit &amp; trim</button>" +
          "</div>" +

          '<div class="desc-box is-clamped" id="descBox" style="margin-top:16px">' +
            UI.escapeHtml(v.desc) +
            '<div class="desc-box__tags">' + (v.tags || []).map(function (t) { return "<span>#" + UI.escapeHtml(t) + "</span>"; }).join("") + "</div>" +
          "</div>" +

          '<div class="comments">' +
            '<div class="comments__head">' +
              '<h3 id="commentCount"></h3>' +
              '<button class="btn btn--sm btn--ghost" id="sortComments">Sort by top</button>' +
            "</div>" +
            '<div class="comment-form" id="commentForm">' +
              UI.avatar("you") +
              '<div class="comment-form__fields">' +
                '<textarea class="comment-input" id="commentInput" rows="1" placeholder="Add a comment…"></textarea>' +
                '<div class="comment-form__actions">' +
                  '<button class="btn btn--sm btn--ghost" id="commentCancel">Cancel</button>' +
                  '<button class="btn btn--sm btn--primary" id="commentSubmit">Comment</button>' +
                "</div>" +
              "</div>" +
            "</div>" +
            '<div id="commentList"></div>' +
          "</div>" +
        "</div>" +

        '<aside class="rail">' +
          '<h4 class="rail__title">Up next</h4>' +
          rail.map(UI.railCard).join("") +
        "</aside>" +
      "</div>";

    UI.paintAll(main);
    setupPlayer(v);
    renderComments(v.id);
    wireWatchActions(v);
  }

  /* ---------- comments ---------- */
  function renderComments(videoId) {
    const host = document.getElementById("commentList");
    if (!host) return;
    const list = Store.state.comments[videoId] || [];
    const total = list.reduce(function (n, c) { return n + 1 + ((c.replies && c.replies.length) || 0); }, 0);

    const head = document.getElementById("commentCount");
    if (head) head.textContent = UI.exact(total) + (total === 1 ? " comment" : " comments");

    if (!list.length) {
      host.innerHTML = '<p class="muted" style="padding:18px 0;font-size:.9rem">No comments yet. Be the first to say something.</p>';
      return;
    }

    host.innerHTML = list.map(function (c) {
      const u = ST.creatorById(c.user);
      const replies = (c.replies || []).map(function (r) {
        const ru = ST.creatorById(r.user);
        return '<div class="comment">' + UI.avatar(ru.id, "sm") +
          '<div class="comment__body">' +
            '<div class="comment__top"><span class="comment__name">' + UI.escapeHtml(ru.name) + "</span>" +
              '<span class="comment__time">' + UI.timeAgo(r.hours) + "</span></div>" +
            '<p class="comment__text">' + UI.escapeHtml(r.text) + "</p>" +
          "</div></div>";
      }).join("");

      return '<div class="comment" data-comment="' + c.id + '">' + UI.avatar(u.id) +
        '<div class="comment__body">' +
          '<div class="comment__top"><span class="comment__name">' + UI.escapeHtml(u.name) + "</span>" +
            '<span class="comment__time">' + UI.timeAgo(c.hours) + "</span></div>" +
          '<p class="comment__text">' + UI.escapeHtml(c.text) + "</p>" +
          '<div class="comment__acts">' +
            '<button data-like-comment="' + c.id + '">' + UI.ICONS.like +
              '<span>' + UI.compact(c.likes) + "</span></button>" +
            '<button data-reply-comment="' + c.id + '">Reply</button>' +
            (c.user === "you" ? '<button data-delete-comment="' + c.id + '">' + UI.ICONS.trash + "</button>" : "") +
          "</div>" +
          (replies ? '<div class="comment__replies">' + replies + "</div>" : "") +
        "</div></div>";
    }).join("");
  }

  function wireCommentBox(videoId) {
    const form = document.getElementById("commentForm");
    const input = document.getElementById("commentInput");
    if (!form || !input) return;

    input.addEventListener("focus", function () { form.classList.add("is-open"); });
    input.addEventListener("input", function () {
      input.style.height = "auto";
      input.style.height = Math.min(160, input.scrollHeight) + "px";
    });

    document.getElementById("commentCancel").addEventListener("click", function () {
      input.value = "";
      input.style.height = "auto";
      form.classList.remove("is-open");
      T.replyTo = null;
    });

    document.getElementById("commentSubmit").addEventListener("click", postComment);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) postComment();
    });

    function postComment() {
      const text = input.value.trim();
      if (!text) { toast("Write something first"); return; }
      const newComment = {
        id: "c-" + Date.now(),
        user: "you",
        text: text,
        likes: 0,
        hours: 0,
        replies: []
      };
      Store.update(function (s) {
        if (!s.comments[videoId]) s.comments[videoId] = [];
        if (T.replyTo) {
          const parent = s.comments[videoId].find(function (c) { return c.id === T.replyTo; });
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push({ id: newComment.id, user: "you", text: text, likes: 0, hours: 0 });
          } else {
            s.comments[videoId].unshift(newComment);
          }
        } else {
          s.comments[videoId].unshift(newComment);
        }
      });
      input.value = "";
      input.style.height = "auto";
      form.classList.remove("is-open");
      T.replyTo = null;
      renderComments(videoId);
      toast("Comment posted");
    }
  }

  function wireCommentActions(videoId) {
    const list = document.getElementById("commentList");
    if (!list) return;
    list.addEventListener("click", function (e) {
      const like = e.target.closest("[data-like-comment]");
      if (like) {
        const id = like.dataset.likeComment;
        Store.update(function (s) {
          const arr = s.comments[videoId] || [];
          const c = arr.find(function (x) { return x.id === id; });
          if (c) c.likes = (c.likes || 0) + (c.likesGiven ? -1 : 1), c.likesGiven = !c.likesGiven;
        });
        renderComments(videoId);
        return;
      }
      const del = e.target.closest("[data-delete-comment]");
      if (del) {
        const id = del.dataset.deleteComment;
        Store.update(function (s) {
          const arr = s.comments[videoId] || [];
          for (let i = 0; i < arr.length; i++) {
            if (arr[i].id === id) { arr.splice(i, 1); return; }
            const rep = (arr[i].replies || []).findIndex(function (x) { return x.id === id; });
            if (rep !== -1) { arr[i].replies.splice(rep, 1); return; }
          }
        });
        renderComments(videoId);
        toast("Comment deleted");
        return;
      }
      const rep = e.target.closest("[data-reply-comment]");
      if (rep) {
        T.replyTo = rep.dataset.replyComment;
        const form = document.getElementById("commentForm");
        const input = document.getElementById("commentInput");
        form.classList.add("is-open");
        input.focus();
        toast("Replying to that comment");
      }
    });
  }

  /* ---------- simulated media player ---------- */
  function setupPlayer(v) {
    const player = document.getElementById("player");
    const fill = document.getElementById("scrubFill");
    const buffer = document.getElementById("scrubBuffer");
    const knob = document.getElementById("scrubKnob");
    const timeLabel = document.getElementById("timeLabel");
    const playBtn = document.getElementById("playBtn");
    const muteBtn = document.getElementById("muteBtn");
    const speedMenu = document.getElementById("speedMenu");
    const flash = document.getElementById("playerFlash");

    let t = Math.min(Store.state.progress[v.id] || 0, Math.max(0, v.duration - 1));
    let playing = false;
    let muted = false;
    let rate = 1;
    let raf = null;
    let last = performance.now();
    let idleTimer = null;

    function paint() {
      const pct = v.duration ? (t / v.duration) * 100 : 0;
      fill.style.width = pct + "%";
      buffer.style.width = Math.min(100, pct + 12) + "%";
      knob.style.left = pct + "%";
      timeLabel.textContent = UI.clock(t) + " / " + UI.clock(v.duration);
    }

    function loop(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (playing) {
        t += dt * rate;
        if (t >= v.duration) { t = v.duration; playing = false; playBtn.innerHTML = UI.ICONS.play; player.classList.remove("is-playing"); Store.update(function (s) { s.progress[v.id] = 0; }); }
        else { Store.update(function (s) { s.progress[v.id] = Math.floor(t); }); }
      }
      paint();
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    function toggle() {
      playing = !playing;
      last = performance.now();
      player.classList.toggle("is-playing", playing);
      playBtn.innerHTML = playing ? UI.ICONS.pause : UI.ICONS.play;
      if (playing) toast("Playing " + v.title.slice(0, 34) + (v.title.length > 34 ? "…" : ""));
    }

    playBtn.addEventListener("click", toggle);
    document.getElementById("bigPlay").addEventListener("click", toggle);

    player.addEventListener("dblclick", function (e) {
      if (e.target.closest("button") || e.target.closest(".scrub")) return;
      if (!Store.isIn("likedVideos", v.id)) {
        Store.toggleInList("likedVideos", v.id);
        syncLikeUI(true);
      }
      flash.classList.remove("go");
      void flash.offsetWidth;
      flash.classList.add("go");
      toggle();
    });

    muteBtn.addEventListener("click", function () {
      muted = !muted;
      muteBtn.innerHTML = muted ? UI.ICONS.volOff : UI.ICONS.volOn;
      toast(muted ? "Muted" : "Sound on");
    });

    document.getElementById("fullBtn").addEventListener("click", function () {
      if (player.requestFullscreen) player.requestFullscreen().catch(function () { toast("Fullscreen was blocked by the browser"); });
      else toast("Fullscreen is not available here");
    });

    document.getElementById("captionsBtn").addEventListener("click", function () {
      Store.update(function (s) { s.settings.captionsOn = !s.settings.captionsOn; });
      toast(Store.state.settings.captionsOn ? "Captions on" : "Captions off");
    });

    document.getElementById("scrub").addEventListener("click", function (e) {
      const rect = this.getBoundingClientRect();
      t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * v.duration;
      last = performance.now();
      paint();
    });

    /* speed menu */
    function openSpeed() { speedMenu.classList.toggle("is-open"); }
    document.getElementById("speedBtn").addEventListener("click", function (e) { e.stopPropagation(); openSpeed(); });
    document.getElementById("speedQuick").addEventListener("click", function (e) { e.stopPropagation(); openSpeed(); });

    speedMenu.addEventListener("click", function (e) {
      const b = e.target.closest("[data-speed]");
      if (!b) return;
      rate = Number(b.dataset.speed);
      speedMenu.querySelectorAll("button").forEach(function (x) { x.classList.toggle("is-on", x === b); });
      document.getElementById("speedLabel").textContent = rate === 1 ? "Speed" : rate + "×";
      speedMenu.classList.remove("is-open");
      toast(rate === 1 ? "Normal speed" : "Playback at " + rate + "×");
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest("#speedMenu") && !e.target.closest("#speedBtn") && !e.target.closest("#speedQuick")) {
        speedMenu.classList.remove("is-open");
      }
    });

    /* idle → hide controls */
    function wake() {
      player.classList.remove("is-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(function () {
        if (playing) player.classList.add("is-idle");
      }, 2600);
    }
    player.addEventListener("mousemove", wake);
    player.addEventListener("mouseleave", function () { if (playing) player.classList.add("is-idle"); });
    wake();
    paint();

    /* Keyboard shortcuts: space / arrows / m */
    function onKey(e) {
      if (e.target.matches("input, textarea")) return;
      if (e.code === "Space") { e.preventDefault(); toggle(); }
      if (e.key === "ArrowRight") { t = Math.min(v.duration, t + 5); paint(); }
      if (e.key === "ArrowLeft") { t = Math.max(0, t - 5); paint(); }
      if (e.key.toLowerCase() === "m") muteBtn.click();
    }
    document.addEventListener("keydown", onKey);

    T.pageCleanup = function () {
      cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      document.removeEventListener("keydown", onKey);
    };
  }

  /* ---------- watch page buttons ---------- */
  function syncLikeUI(forceOn) {
    const btn = document.getElementById("likeBtn");
    const count = document.getElementById("likeCount");
    if (!btn) return;
    const on = forceOn === undefined ? !btn.classList.contains("is-on") : forceOn;
    btn.classList.toggle("is-on", on);
    btn.innerHTML = (on ? UI.ICONS.likeFill : UI.ICONS.like) + ' <span id="likeCount"></span>';
    const v = findVideo(parseHash().param) || currentVideo;
    const base = v ? v.likes : 0;
    document.getElementById("likeCount").textContent = UI.compact(base + (on ? 1 : 0));
  }

  let currentVideo = null;

  function wireWatchActions(v) {
    currentVideo = v;

    document.getElementById("likeBtn").addEventListener("click", function () {
      const added = Store.toggleInList("likedVideos", v.id);
      if (added) Store.update(function (s) {
        s.dislikedVideos = s.dislikedVideos.filter(function (x) { return x !== v.id; });
      });
      syncLikeUI(added);
      document.getElementById("dislikeBtn").classList.remove("is-on");
      toast(added ? "Added to your liked videos" : "Like removed");
    });

    document.getElementById("dislikeBtn").addEventListener("click", function () {
      const added = Store.toggleInList("dislikedVideos", v.id);
      if (added) {
        Store.update(function (s) {
          s.likedVideos = s.likedVideos.filter(function (x) { return x !== v.id; });
        });
        syncLikeUI(false);
      }
      this.classList.toggle("is-on", added);
      toast(added ? "Feedback recorded" : "Feedback removed");
    });

    document.getElementById("shareBtn").addEventListener("click", function () { openShare(v.id); });

    document.getElementById("saveBtn").addEventListener("click", function () {
      const added = Store.toggleInList("savedVideos", v.id);
      this.classList.toggle("is-on", added);
      this.innerHTML = (added ? UI.ICONS.saveFill : UI.ICONS.save) + " Save";
      toast(added ? "Saved to Watch later" : "Removed from Watch later");
    });

    document.getElementById("descBox").addEventListener("click", function () {
      this.classList.toggle("is-clamped");
    });

    document.getElementById("sortComments").addEventListener("click", function () {
      this.dataset.top = this.dataset.top === "1" ? "0" : "1";
      this.textContent = this.dataset.top === "1" ? "Sort by newest" : "Sort by top";
      Store.update(function (s) {
        const arr = s.comments[v.id];
        if (!arr) return;
        if (this.dataset.top === "1") arr.sort(function (a, b) { return b.likes - a.likes; });
        else arr.sort(function (a, b) { return a.hours - b.hours; });
      }.bind(this));
      renderComments(v.id);
      toast("Comments re-sorted");
    });

    document.getElementById("editBtn").addEventListener("click", function () {
      openTrimTool(v);
    });

    wireCommentBox(v.id);
    wireCommentActions(v.id);
  }

  /* ---------- top-level API used by the remaining pages ---------- */
  window.__ST = {
    toast: toast,
    repaint: repaint,
    syncBadges: syncBadges,
    openShare: openShare,
    findVideo: findVideo,
    videoPool: videoPool,
    T: T,
    sidebar: sidebar,
    main: main
  };

  /* Boot */
  applyTheme();
  router();
})();
