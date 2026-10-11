/* ============================================================
   ui.js — rendering helpers shared by every page.
   ============================================================ */

const UI = (function () {

  /* ---------- number / time formatting ---------- */
  function compact(n) {
    n = Number(n) || 0;
    if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, "") + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(n >= 1e4 ? 0 : 1).replace(/\.0$/, "") + "K";
    return String(n);
  }

  function exact(n) { return (Number(n) || 0).toLocaleString("en-GB"); }

  function clock(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = h ? String(m).padStart(2, "0") : String(m);
    return (h ? h + ":" : "") + mm + ":" + String(s).padStart(2, "0");
  }

  function timeAgo(hours) {
    if (hours < 1) return "just now";
    if (hours < 24) return Math.floor(hours) + "h ago";
    const d = Math.floor(hours / 24);
    if (d < 7) return d + "d ago";
    if (d < 30) return Math.floor(d / 7) + "w ago";
    if (d < 365) return Math.floor(d / 30) + "mo ago";
    return Math.floor(d / 365) + "y ago";
  }

  function minsAgo(mins) {
    mins = Number(mins) || 0;
    if (mins < 1) return "now";
    if (mins < 60) return Math.floor(mins) + "m";
    const h = Math.floor(mins / 60);
    if (h < 24) return h + "h";
    return Math.floor(h / 24) + "d";
  }

  function daysAgo(days) {
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return days + " days ago";
    if (days < 30) return Math.floor(days / 7) + " weeks ago";
    if (days < 365) return Math.floor(days / 30) + " months ago";
    return Math.floor(days / 365) + " years ago";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function initials(name) {
    return String(name || "?").trim().replace(/^@/, "").slice(0, 1).toUpperCase();
  }

  /* ---------- avatar ---------- */
  function avatar(creatorId, size) {
    const c = ST.creatorById(creatorId);
    const cls = "avatar" + (size ? " avatar--" + size : "");
    const seed = ST.hashOf(c.id);
    const pal = ST.palettes[seed % ST.palettes.length];
    return (
      '<span class="' + cls + '" style="background:linear-gradient(135deg,' +
      pal[0] + "," + pal[1] + ')" title="' + escapeHtml(c.name) + '">' +
      escapeHtml(initials(c.name)) + "</span>"
    );
  }

  /* ---------- icon set ---------- */
  const ICONS = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14" stroke-width="3"/></svg>',
    like: '<svg viewBox="0 0 24 24"><path d="M7 22V10l5-8 1.2.6a3 3 0 011.6 3.3L14 10h5a2 2 0 012 2.4l-1.4 7A2 2 0 0117.6 21H7z"/><path d="M7 10H3v12h4z"/></svg>',
    likeFill: '<svg viewBox="0 0 24 24"><path d="M7 22V10l5-8 1.2.6a3 3 0 011.6 3.3L14 10h5a2 2 0 012 2.4l-1.4 7A2 2 0 0117.6 21H7z" fill="currentColor"/><path d="M7 10H3v12h4z" fill="currentColor"/></svg>',
    dislike: '<svg viewBox="0 0 24 24"><path d="M17 2v12l-5 8-1.2-.6a3 3 0 01-1.6-3.3L10 14H5a2 2 0 01-2-2.4l1.4-7A2 2 0 016.4 3H17z"/><path d="M17 14h4V2h-4z"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"/><path d="M12 16V3M8 7l4-4 4 4"/></svg>',
    save: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>',
    saveFill: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4.5L6 21z" fill="currentColor"/></svg>',
    comment: '<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 01-8 8H7l-4 3 1-5a8 8 0 0117-6z"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none"/></svg>',
    volOn: '<svg viewBox="0 0 24 24"><path d="M4 9v6h3l5 4V5L7 9z"/><path d="M16 8.5a4.5 4.5 0 010 7"/><path d="M18.6 6a8 8 0 010 12"/></svg>',
    volOff: '<svg viewBox="0 0 24 24"><path d="M4 9v6h3l5 4V5L7 9z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
    speed: '<svg viewBox="0 0 24 24"><path d="M12 13l4-4"/><circle cx="12" cy="13" r="8"/><path d="M12 4V2M20 13h2M2 13h2"/></svg>',
    full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>',
    verified: '<svg viewBox="0 0 24 24"><path d="M12 2l2.4 1.8 3-.3 1 2.8 2.6 1.5-.7 2.9.7 2.9-2.6 1.5-1 2.8-3-.3L12 22l-2.4-1.8-3 .3-1-2.8L3 16.2l.7-2.9L3 10.4l2.6-1.5 1-2.8 3 .3z" fill="currentColor" stroke="none"/><path d="M8.5 12l2.5 2.5L16 9.5" stroke="#fff" stroke-width="2.2"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>',
    mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    image: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-6 6"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-3-6z"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="M5 3h4l2 5-2.5 1.5a12 12 0 005 5L15 12l5 2v4a2 2 0 01-2 2A16 16 0 013 5a2 2 0 012-2z"/></svg>',
    video: '<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24"><path d="M12 20V5M6 11l6-6 6 6"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L20 8l-4-4L4 16z"/><path d="M14 6l4 4"/></svg>',
    bell: '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 006 8c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    scissors: '<svg viewBox="0 0 24 24"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4L8.5 15.5M20 20L8.5 8.5"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18 16l.9 2.1L21 19l-2.1.9L18 22l-.9-2.1L15 19l2.1-.9z"/></svg>'
  };

  /* ---------- canvas thumbnails ---------- */
  function paintAll(root) {
    (root || document).querySelectorAll("canvas[data-seed]").forEach(function (cv) {
      if (cv.dataset.painted === "1") return;
      ST.paintArt(cv, cv.dataset.seed, { mono: cv.dataset.mono === "1" });
      cv.dataset.painted = "1";
    });
  }

  function thumbCanvas(seed, mono) {
    return '<canvas data-seed="' + escapeHtml(seed) + '"' + (mono ? ' data-mono="1"' : "") + '></canvas>';
  }

  /* ---------- video card ---------- */
  function videoCard(v) {
    const o = ST.creatorById(v.owner);
    const watched = Store.state.progress[v.id] || 0;
    const pct = v.duration ? Math.min(100, (watched / v.duration) * 100) : 0;
    const badge = v.live ? '<span class="card__flag">Live</span>' : "";
    return (
      '<article class="card" data-video="' + v.id + '" tabindex="0">' +
        '<div class="card__thumb">' + thumbCanvas(v.id) + badge +
          '<span class="card__duration">' + (v.live ? "LIVE" : clock(v.duration)) + "</span>" +
          (pct > 1 ? '<span class="card__progress"><i style="width:' + pct + '%"></i></span>' : "") +
        "</div>" +
        '<div class="card__body">' + avatar(o.id) +
          '<div class="card__meta">' +
            '<h3 class="card__title">' + escapeHtml(v.title) + "</h3>" +
            '<div class="card__sub">' + escapeHtml(o.name) +
              (o.verified ? '<span class="card__verify">' + ICONS.verified + "</span>" : "") +
              '<span class="dot">•</span>' + compact(v.views) + " views" +
              '<span class="dot">•</span>' + daysAgo(v.days) +
            "</div>" +
          "</div>" +
          '<button class="card__more" data-menu="' + v.id + '" aria-label="More">' + ICONS.more + "</button>" +
        "</div>" +
      "</article>"
    );
  }

  function videoRow(v) {
    const o = ST.creatorById(v.owner);
    return (
      '<article class="row-card" data-video="' + v.id + '" tabindex="0">' +
        '<div class="row-card__thumb">' + thumbCanvas(v.id) +
          '<span class="card__duration">' + clock(v.duration) + "</span>" +
        "</div>" +
        '<div class="row-card__info">' +
          '<h3 class="row-card__title">' + escapeHtml(v.title) + "</h3>" +
          '<div class="row-card__stats">' + compact(v.views) + " views • " + daysAgo(v.days) + "</div>" +
          '<div class="row-card__owner">' + avatar(o.id, "sm") + escapeHtml(o.name) +
            (o.verified ? '<span class="card__verify">' + ICONS.verified + "</span>" : "") +
          "</div>" +
          '<p class="row-card__desc">' + escapeHtml(v.desc.split("\n")[0]) + "</p>" +
        "</div>" +
      "</article>"
    );
  }

  function railCard(v) {
    const o = ST.creatorById(v.owner);
    return (
      '<article class="rail-card" data-video="' + v.id + '">' +
        '<div class="rail-card__thumb">' + thumbCanvas(v.id) + "</div>" +
        '<div class="rail-card__info">' +
          '<h4 class="rail-card__title">' + escapeHtml(v.title) + "</h4>" +
          '<div class="rail-card__sub">' + escapeHtml(o.name) + "</div>" +
          '<div class="rail-card__sub">' + compact(v.views) + " views • " + daysAgo(v.days) + "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /* ---------- subscribe button ---------- */
  function subButton(creatorId, size) {
    const on = Store.isIn("subscribed", creatorId);
    return (
      '<button class="btn ' + (on ? "btn--ghost" : "btn--solid") +
      (size === "sm" ? " btn--sm" : "") + '" data-sub="' + creatorId + '">' +
      (on ? "Subscribed" : "Subscribe") + "</button>"
    );
  }

  return {
    compact: compact, exact: exact, clock: clock, timeAgo: timeAgo, minsAgo: minsAgo,
    daysAgo: daysAgo, escapeHtml: escapeHtml, initials: initials,
    avatar: avatar, ICONS: ICONS, paintAll: paintAll, thumbCanvas: thumbCanvas,
    videoCard: videoCard, videoRow: videoRow, railCard: railCard, subButton: subButton
  };
})();
