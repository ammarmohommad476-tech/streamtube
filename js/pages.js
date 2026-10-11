/* ============================================================
   pages.js — the remaining page views.
   Loaded after app.js; registers the views app.js routes to.
   ============================================================ */

(function () {
  "use strict";

  const A = window.__ST;   // bridge from app.js
  const main = A.main;
  const T = A.T;

  /* ============================================================
     Global click delegation: subscribe buttons + card opens
     ============================================================ */
  document.addEventListener("click", function (e) {
    const sub = e.target.closest("[data-sub]");
    if (sub) {
      const id = sub.dataset.sub;
      const on = Store.toggleInList("subscribed", id);
      const c = ST.creatorById(id);
      A.toast(on ? "Subscribed to " + c.name : "Unsubscribed from " + c.name);
      A.repaint();
      return;
    }

    const card = e.target.closest("[data-video]");
    if (card && !e.target.closest("[data-menu]")) {
      location.hash = "#/watch/" + card.dataset.video;
      return;
    }

    const chan = e.target.closest("[data-channel]");
    if (chan) {
      location.hash = "#/profile/" + chan.dataset.channel;
    }
  });

  /* ============================================================
     SUBSCRIPTIONS
     ============================================================ */
  window.viewSubscriptions = function () {
    const subs = Store.state.subscribed;
    main.className = "main";

    if (!subs.length) {
      main.innerHTML =
        '<div class="page-head"><div><h1>Subscriptions</h1>' +
        "<p>Videos from the creators you follow.</p></div></div>" +
        '<div class="empty">' + UI.ICONS.bell +
          "<h3>No subscriptions yet</h3>" +
          "<p>Subscribe to a channel and their newest videos land here, newest first.</p>" +
          '<p style="margin-top:16px"><a class="btn btn--primary" href="#/explore">Find creators</a></p>' +
        "</div>";
      return;
    }

    const list = A.videoPool().filter(function (v) { return subs.indexOf(v.owner) !== -1; });

    main.innerHTML =
      '<div class="page-head"><div><h1>Subscriptions</h1>' +
      "<p>" + subs.length + " channel" + (subs.length === 1 ? "" : "s") + " • " + list.length + " videos</p></div>" +
      '<button class="btn btn--ghost" id="manageSubs">' + UI.ICONS.check + " Manage</button></div>" +
      '<div class="vstack">' + list.map(UI.videoRow).join("") + "</div>";

    UI.paintAll(main);

    document.getElementById("manageSubs").addEventListener("click", function () {
      main.innerHTML =
        '<div class="page-head"><div><h1>Manage subscriptions</h1><p>Unsubscribe from any channel below.</p></div>' +
        '<button class="btn btn--primary" id="backSubs">Done</button></div>' +
        '<div class="tiles">' + subs.map(function (id) {
          const c = ST.creatorById(id);
          return '<div class="tile">' + UI.avatar(id, "lg") +
            '<h3 style="margin-top:12px">' + UI.escapeHtml(c.name) + "</h3>" +
            "<p>" + UI.compact(c.subs) + " subscribers</p>" +
            '<button class="btn btn--ghost btn--sm" style="margin-top:12px" data-sub="' + id + '">Subscribed</button>' +
          "</div>";
        }).join("") + "</div>";

      document.getElementById("backSubs").addEventListener("click", function () {
        window.viewSubscriptions();
      });
    });
  };

  /* ============================================================
     EXPLORE
     ============================================================ */
  window.viewExplore = function () {
    main.className = "main";
    const videos = A.videoPool();

    main.innerHTML =
      '<div class="page-head"><div><h1>Explore</h1>' +
      "<p>Trending content, popular creators and tags worth watching.</p></div></div>" +

      '<h2 class="section-title">Trending now</h2>' +
      '<div class="explore-grid" id="expGrid">' +
        videos.slice(0, 12).map(function (v) {
          return '<article class="exp-card" data-video="' + v.id + '">' +
            UI.thumbCanvas(v.id) +
            '<span class="exp-card__play">' + UI.ICONS.play + "</span>" +
            '<div class="exp-card__over">' +
              '<div class="exp-card__title">' + UI.escapeHtml(v.title) + "</div>" +
              '<div class="exp-card__stats">' + UI.compact(v.views) + " views</div>" +
            "</div>" +
          "</article>";
        }).join("") +
      "</div>" +

      '<h2 class="section-title" style="margin-top:34px">Trending tags</h2>' +
      '<div class="trend-list">' +
        ST.trending.map(function (t, i) {
          return '<div class="trend-item" data-tag="' + t.tag + '">' +
            '<span class="trend-item__rank">' + (i + 1) + "</span>" +
            '<div><div class="trend-item__tag">' + UI.escapeHtml(t.tag) + "</div>" +
            '<div class="trend-item__sub">' + UI.compact(t.posts) + " posts • " + UI.escapeHtml(t.cat) + "</div></div>" +
          "</div>";
        }).join("") +
      "</div>" +

      '<h2 class="section-title" style="margin-top:34px">Creators to discover</h2>' +
      '<div class="tiles">' +
        ST.creators.filter(function (c) { return c.id !== "you"; }).map(function (c) {
          return '<div class="tile">' + UI.avatar(c.id, "lg") +
            '<h3 style="margin-top:12px">' + UI.escapeHtml(c.name) +
              (c.verified ? ' <span class="card__verify">' + UI.ICONS.verified + "</span>" : "") + "</h3>" +
            "<p>" + UI.compact(c.subs) + " subscribers</p>" +
            '<div style="margin-top:12px;display:flex;gap:8px">' +
              '<a class="btn btn--sm btn--ghost" href="#/profile/' + c.id + '">View</a>' +
              UI.subButton(c.id, "sm") +
            "</div>" +
          "</div>";
        }).join("") +
      "</div>";

    UI.paintAll(main);

    main.addEventListener("click", function (e) {
      const tag = e.target.closest("[data-tag]");
      if (tag) {
        location.hash = "#/search?q=" + encodeURIComponent(tag.dataset.tag.replace("#", ""));
      }
      const tile = e.target.closest(".tile h3");
      if (tile) {
        const name = tile.textContent.trim();
        const c = ST.creators.find(function (x) { return x.name === name; });
        if (c) location.hash = "#/profile/" + c.id;
      }
    });
  };

  /* ============================================================
     SEARCH
     ============================================================ */
  window.viewSearch = function (r) {
    const q = (r.params.get("q") || "").trim();
    main.className = "main";

    if (!q) {
      main.innerHTML = '<div class="empty"><h3>Search StreamTube</h3>' +
        "<p>Use the bar at the top to find videos, creators and tags.</p></div>";
      return;
    }

    const needle = q.toLowerCase().replace("#", "");
    const videos = A.videoPool().filter(function (v) {
      return v.title.toLowerCase().indexOf(needle) !== -1 ||
        (v.tags || []).some(function (t) { return t.indexOf(needle) !== -1; }) ||
        v.cat.toLowerCase().indexOf(needle) !== -1 ||
        ST.creatorById(v.owner).name.toLowerCase().indexOf(needle) !== -1;
    });
    const creators = ST.creators.filter(function (c) {
      return c.name.toLowerCase().indexOf(needle) !== -1 ||
        c.handle.toLowerCase().indexOf(needle) !== -1;
    });

    const filters = ["Relevance", "Upload date", "View count", "Rating", "Duration"];

    main.innerHTML =
      '<div class="page-head"><div><h1>Results for \u201c' + UI.escapeHtml(q) + '\u201d</h1>' +
      "<p>" + videos.length + " video" + (videos.length === 1 ? "" : "s") + " • " +
      creators.length + " creator" + (creators.length === 1 ? "" : "s") + "</p></div></div>" +

      '<div class="chips" id="searchFilters">' +
        filters.map(function (f, i) {
          return '<button class="chip' + (i === 0 ? " is-active" : "") + '">' + f + "</button>";
        }).join("") +
      "</div>" +

      (creators.length
        ? '<h2 class="section-title">Channels</h2><div class="tiles" style="margin-bottom:28px">' +
          creators.map(function (c) {
            return '<div class="tile">' + UI.avatar(c.id, "lg") +
              '<h3 style="margin-top:12px">' + UI.escapeHtml(c.name) + "</h3>" +
              "<p>" + UI.escapeHtml(c.handle) + " • " + UI.compact(c.subs) + " subscribers</p>" +
              '<div style="margin-top:12px;display:flex;gap:8px">' +
                '<a class="btn btn--sm btn--ghost" href="#/profile/' + c.id + '">View</a>' +
                UI.subButton(c.id, "sm") +
              "</div></div>";
          }).join("") + "</div>"
        : "") +

      (videos.length
        ? '<div class="vstack" id="searchResults">' + videos.map(UI.videoRow).join("") + "</div>"
        : '<div class="empty">' + UI.ICONS.sparkle + "<h3>No results for \u201c" + UI.escapeHtml(q) + "\u201d</h3>" +
          "<p>Check the spelling, or try a broader keyword like a category name.</p>" +
          '<p style="margin-top:16px"><a class="btn btn--primary" href="#/explore">Browse Explore</a></p></div>");

    UI.paintAll(main);

    document.getElementById("searchFilters").addEventListener("click", function (e) {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      this.querySelectorAll(".chip").forEach(function (c) { c.classList.toggle("is-active", c === chip); });
      const label = chip.textContent;
      const sorted = videos.slice();
      if (label === "Upload date") sorted.sort(function (a, b) { return a.days - b.days; });
      if (label === "View count") sorted.sort(function (a, b) { return b.views - a.views; });
      if (label === "Rating") sorted.sort(function (a, b) { return b.likes - a.likes; });
      if (label === "Duration") sorted.sort(function (a, b) { return b.duration - a.duration; });
      const host = document.getElementById("searchResults");
      if (host) { host.innerHTML = sorted.map(UI.videoRow).join(""); UI.paintAll(host); }
      A.toast("Sorted by " + label.toLowerCase());
    });
  };

  /* ============================================================
     LIBRARY
     ============================================================ */
  window.viewLibrary = function () {
    main.className = "main";
    const s = Store.state;

    const tiles = [
      { key: "history", ico: UI.ICONS.clock, title: "History", count: s.watchHistory.length, desc: "Videos you've watched recently." },
      { key: "saved", ico: UI.ICONS.save, title: "Watch later", count: s.savedVideos.length, desc: "Saved to watch when you have time." },
      { key: "liked", ico: UI.ICONS.like, title: "Liked videos", count: s.likedVideos.length, desc: "Everything you gave a thumbs up." },
      { key: "shorts", ico: UI.ICONS.play, title: "Saved Shorts", count: s.savedShorts.length, desc: "Short videos you kept." },
      { key: "uploads", ico: UI.ICONS.plus, title: "Your uploads", count: s.uploads.length, desc: "Published from this account." },
      { key: "downloads", ico: UI.ICONS.music, title: "Downloads", count: 0, desc: "Nothing downloaded on this device." }
    ];

    main.innerHTML =
      '<div class="page-head"><div><h1>Library</h1>' +
      "<p>Your history, saved videos and uploads.</p></div>" +
      '<a class="btn btn--primary" href="#/upload">' + UI.ICONS.plus + " Upload</a></div>" +
      '<div class="tiles">' +
        tiles.map(function (t) {
          return '<div class="tile" data-lib="' + t.key + '">' +
            '<div class="tile__ico">' + t.ico + "</div>" +
            '<div class="tile__count">' + t.count + "</div>" +
            "<h3>" + t.title + "</h3><p>" + t.desc + "</p></div>";
        }).join("") +
      "</div>" +
      '<div id="libDetail" style="margin-top:30px"></div>';

    main.addEventListener("click", function (e) {
      const tile = e.target.closest("[data-lib]");
      if (!tile) return;
      const key = tile.dataset.lib;
      const host = document.getElementById("libDetail");
      const st = Store.state;

      let title = "";
      let list = [];

      if (key === "history") { title = "History"; list = st.watchHistory.map(A.findVideo).filter(Boolean); }
      if (key === "saved") { title = "Watch later"; list = st.savedVideos.map(A.findVideo).filter(Boolean); }
      if (key === "liked") { title = "Liked videos"; list = st.likedVideos.map(A.findVideo).filter(Boolean); }
      if (key === "uploads") { title = "Your uploads"; list = st.uploads; }
      if (key === "shorts") {
        title = "Saved Shorts";
        list = st.savedShorts.map(function (id) {
          return ST.shorts.find(function (x) { return x.id === id; });
        }).filter(Boolean);
      }
      if (key === "downloads") { title = "Downloads"; list = []; }

      host.innerHTML = '<h2 class="section-title">' + title + " (" + list.length + ")" + "</h2>" +
        (list.length
          ? '<div class="grid">' + list.map(function (v) {
              if (v.caption) {
                return '<article class="card" data-video="' + v.id + '"><div class="card__thumb">' +
                  UI.thumbCanvas("short-" + v.id) + "</div>" +
                  '<div class="card__body"><div class="card__meta">' +
                  '<h3 class="card__title">' + UI.escapeHtml(v.caption) + "</h3>" +
                  '<div class="card__sub">' + UI.escapeHtml(ST.creatorById(v.owner).name) + "</div>" +
                  "</div></div></article>";
              }
              return UI.videoCard(v);
            }).join("") + "</div>"
          : '<div class="empty"><h3>Nothing here yet</h3><p>Items you add will show up in this list.</p></div>');

      UI.paintAll(host);
      host.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  /* ============================================================
     PROFILE
     ============================================================ */
  window.viewProfile = function (r) {
    const id = r.param || "you";
    const isMe = id === "you";
    const c = isMe ? Store.state.myProfile : ST.creatorById(id);
    const myVideos = isMe
      ? Store.state.uploads
      : A.videoPool().filter(function (v) { return v.owner === id; });

    const tabs = ["Videos", "Shorts", "Playlists", "Community", "About"];
    const active = T.tab || "Videos";

    main.className = "main";

    const actionBtns = isMe
      ? '<a class="btn btn--solid" href="#/settings">' + UI.ICONS.edit + " Edit profile</a>" +
        '<a class="btn btn--primary" href="#/upload">' + UI.ICONS.plus + " Upload</a>"
      : UI.subButton(id) +
        '<button class="btn btn--ghost" id="profileMsg">' + UI.ICONS.send + " Message</button>" +
        '<button class="btn btn--ghost" id="profileMore">' + UI.ICONS.more + "</button>";

    main.innerHTML =
      '<div class="profile-head">' +
        UI.avatar(isMe ? "you" : id, "xl") +
        '<div class="profile-head__info">' +
          '<h1 class="profile-head__name">' + UI.escapeHtml(c.name) +
            (!isMe && c.verified ? ' <span class="card__verify">' + UI.ICONS.verified + "</span>" : "") +
            ((c.private || (isMe && Store.state.myProfile.private)) ? ' <span class="tag-pill">Private</span>' : "") +
            (isMe ? ' <span class="tag-pill">' + UI.escapeHtml(Store.state.myProfile.accountType) + "</span>" : "") +
          "</h1>" +
          '<p class="muted" style="margin-top:4px;font-size:.9rem">' + UI.escapeHtml(c.handle) + " • " +
            UI.compact(c.subs) + " subscribers • " + myVideos.length + " videos</p>" +
          '<div class="profile-stats">' +
            "<div><b>" + UI.compact(c.subs) + "</b> <span>followers</span></div>" +
            "<div><b>" + (isMe ? Store.state.subscribed.length : Math.floor(c.subs / 12)) + "</b> <span>following</span></div>" +
            "<div><b>" + UI.compact(myVideos.reduce(function (n, v) { return n + v.views; }, 0)) + "</b> <span>total views</span></div>" +
          "</div>" +
          '<p class="profile-bio">' + UI.escapeHtml(c.bio) + "</p>" +
          '<div class="profile-links">' +
            (c.links || []).map(function (l) {
              return '<a href="#" data-noop="1">' + UI.escapeHtml(l) + "</a>";
            }).join("") +
          "</div>" +
          '<div class="profile-actions">' + actionBtns + "</div>" +
        "</div>" +
      "</div>" +

      '<div class="tabs" id="profileTabs">' +
        tabs.map(function (t) {
          return '<button class="tab' + (t === active ? " is-active" : "") + '" data-tab="' + t + '">' + t + "</button>";
        }).join("") +
      "</div>" +
      '<div id="profilePanel"></div>';

    renderProfileTab(active, myVideos, c, isMe);

    document.getElementById("profileTabs").addEventListener("click", function (e) {
      const tab = e.target.closest("[data-tab]");
      if (!tab) return;
      T.tab = tab.dataset.tab;
      this.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("is-active", x === tab); });
      renderProfileTab(T.tab, myVideos, c, isMe);
    });

    const msgBtn = document.getElementById("profileMsg");
    if (msgBtn) msgBtn.addEventListener("click", function () {
      location.hash = "#/messages";
      A.toast("Opening your conversations");
    });

    const moreBtn = document.getElementById("profileMore");
    if (moreBtn) moreBtn.addEventListener("click", function () {
      const blocked = this.dataset.blocked === "1";
      this.dataset.blocked = blocked ? "0" : "1";
      A.toast(blocked ? "Account unblocked" : "Account blocked — you will not see their content");
    });
  };

  function renderProfileTab(tab, myVideos, c, isMe) {
    const host = document.getElementById("profilePanel");
    if (!host) return;

    if (tab === "Videos") {
      host.innerHTML = myVideos.length
        ? '<div class="grid">' + myVideos.map(UI.videoCard).join("") + "</div>"
        : '<div class="empty">' + UI.ICONS.plus + "<h3>No videos yet</h3>" +
          "<p>" + (isMe ? "Upload your first video and it will appear here." : "This channel has not published a video.") + "</p>" +
          (isMe ? '<p style="margin-top:16px"><a class="btn btn--primary" href="#/upload">Upload now</a></p>' : "") + "</div>";
      UI.paintAll(host);
      return;
    }

    if (tab === "Shorts") {
      const shorts = ST.shorts.filter(function (s) { return s.owner === c.id; });
      const pool = shorts.length ? shorts : ST.shorts.slice(0, 4);
      host.innerHTML = '<div class="explore-grid">' + pool.map(function (s) {
        return '<article class="exp-card" data-video="' + s.id + '">' +
          UI.thumbCanvas("short-" + s.id) +
          '<span class="exp-card__play">' + UI.ICONS.play + "</span>" +
          '<div class="exp-card__over"><div class="exp-card__title">' + UI.escapeHtml(s.caption) + "</div>" +
          '<div class="exp-card__stats">' + UI.compact(s.views) + " views</div></div></article>";
      }).join("") + "</div>";
      UI.paintAll(host);
      return;
    }

    if (tab === "Playlists") {
      const made = [
        { name: "Watch later", count: Store.state.savedVideos.length, desc: "Your personal queue." },
        { name: "Liked videos", count: Store.state.likedVideos.length, desc: "Everything you liked." },
        { name: "Saved Shorts", count: Store.state.savedShorts.length, desc: "Shorts you kept." }
      ];
      host.innerHTML = '<div class="tiles">' + made.map(function (p) {
        return '<div class="tile"><div class="tile__ico">' + UI.ICONS.save + "</div>" +
          '<div class="tile__count">' + p.count + "</div>" +
          "<h3>" + p.name + "</h3><p>" + p.desc + "</p></div>";
      }).join("") + "</div>";
      return;
    }

    if (tab === "Community") {
      host.innerHTML = '<div class="panel-card"><h3>Community post</h3>' +
        '<textarea class="dm__input" id="communityInput" rows="3" placeholder="Share an update, a poll or a photo…" style="width:100%"></textarea>' +
        '<div style="display:flex;justify-content:flex-end;margin-top:12px">' +
        '<button class="btn btn--primary btn--sm" id="communityPost">Post</button></div></div>' +
        '<div id="communityFeed"><p class="muted" style="font-size:.9rem">No community posts yet.</p></div>';

      document.getElementById("communityPost").addEventListener("click", function () {
        const ta = document.getElementById("communityInput");
        const text = ta.value.trim();
        if (!text) { A.toast("Write something first"); return; }
        const feed = document.getElementById("communityFeed");
        if (feed.querySelector("p.muted")) feed.innerHTML = "";
        feed.insertAdjacentHTML("afterbegin",
          '<div class="panel-card"><div class="hstack">' + UI.avatar("you") +
          '<div><strong>' + UI.escapeHtml(Store.state.myProfile.name) + "</strong>" +
          '<div class="muted" style="font-size:.78rem">just now</div></div></div>' +
          '<p style="margin-top:12px;font-size:.9rem;line-height:1.5">' + UI.escapeHtml(text) + "</p></div>");
        ta.value = "";
        A.toast("Community post published");
      });
      return;
    }

    host.innerHTML =
      '<div class="panel-card"><h3>About</h3>' +
      '<p style="font-size:.9rem;line-height:1.6;white-space:pre-wrap">' + UI.escapeHtml(c.bio) + "</p>" +
      '<table class="data" style="margin-top:18px">' +
        "<tr><td>Handle</td><td>" + UI.escapeHtml(c.handle) + "</td></tr>" +
        "<tr><td>Subscribers</td><td>" + UI.compact(c.subs) + "</td></tr>" +
        "<tr><td>Videos</td><td>" + myVideos.length + "</td></tr>" +
        "<tr><td>Total views</td><td>" + UI.exact(myVideos.reduce(function (n, v) { return n + v.views; }, 0)) + "</td></tr>" +
        "<tr><td>Visibility</td><td>" + ((c.private || Store.state.myProfile.private) ? "Private" : "Public") + "</td></tr>" +
      "</table></div>";
  }

  /* ============================================================
     UPLOAD
     ============================================================ */
  window.viewUpload = function () {
    main.className = "main";

    main.innerHTML =
      '<div class="page-head"><div><h1>Upload</h1>' +
      "<p>Publish a video to your channel. Everything here is stored locally in your browser.</p></div></div>" +

      '<div class="form-grid">' +
        '<div style="flex:2">' +
          '<div class="upload-drop" id="dropZone">' + UI.ICONS.plus +
            "<strong>Drag and drop a video, or click to choose a file</strong>" +
            "<small>MP4, WebM or MOV — nothing is uploaded to a server</small>" +
          "</div>" +
          '<input type="file" id="fileInput" accept="video/*,image/*" class="sr-only" />' +
          '<p class="field__hint" id="fileName">No file selected — you can still fill in the details and publish a demo entry.</p>' +
        "</div>" +
      "</div>" +

      '<div class="panel-card" style="margin-top:24px"><h3>Details</h3>' +
        '<div class="field"><label for="upTitle">Title *</label>' +
          '<input type="text" id="upTitle" placeholder="Give your video a clear, descriptive title" /></div>' +
        '<div class="field"><label for="upDesc">Description</label>' +
          '<textarea id="upDesc" placeholder="Tell viewers what this video is about. Timestamps work well here."></textarea></div>' +
        '<div class="form-grid">' +
          '<div class="field"><label for="upCat">Category</label>' +
            '<select id="upCat">' + ST.categories.slice(1).map(function (c) { return "<option>" + c + "</option>"; }).join("") + "</select></div>" +
          '<div class="field"><label for="upVis">Visibility</label>' +
            '<select id="upVis"><option>Public</option><option>Unlisted</option><option>Private</option><option>Scheduled</option></select></div>' +
        "</div>" +
        '<div class="field"><label for="upTags">Tags</label>' +
          '<input type="text" id="upTags" placeholder="filmmaking, tutorial, iceland" />' +
          '<p class="field__hint">Separate tags with commas.</p></div>' +

        '<div class="panel-card" style="background:var(--bg-elev-2);margin-bottom:16px">' +
          "<h3>Editor</h3>" +
          '<div class="form-grid">' +
            '<div class="field"><label for="edFilter">Filter</label><select id="edFilter">' +
              ST.filters.map(function (f) { return "<option>" + f + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="edEffect">Effect</label><select id="edEffect">' +
              ST.effects.map(function (f) { return "<option>" + f + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="edMusic">Background music</label><select id="edMusic">' +
              '<option value="">None</option>' +
              ST.musicLibrary.map(function (m) { return '<option value="' + m.id + '">' + m.title + " — " + m.artist + "</option>"; }).join("") +
            "</select></div>" +
            '<div class="field"><label for="edSpeed">Playback speed</label><select id="edSpeed">' +
              ST.speeds.map(function (s) { return '<option value="' + s + '"' + (s === 1 ? " selected" : "") + ">" + s + "×</option>"; }).join("") +
            "</select></div>" +
          "</div>" +
          '<div class="field"><label>Trim — choose start and end</label>' +
            '<div class="hstack" style="gap:14px">' +
              '<input type="range" id="trimStart" min="0" max="100" value="0" style="flex:1" />' +
              '<input type="range" id="trimEnd" min="0" max="100" value="100" style="flex:1" />' +
            "</div>" +
            '<p class="field__hint" id="trimLabel">Keeps 0% – 100% of the clip</p>' +
          "</div>" +
          '<div class="field"><label for="edCaption">Captions / subtitles</label>' +
            '<textarea id="edCaption" placeholder="One line per caption…"></textarea></div>' +
          '<div class="switch"><input type="checkbox" id="edAlt" /><label class="switch__track" for="edAlt"></label>' +
            '<span class="switch__label">Alternative text<small>Describe the video for screen readers.</small></span></div>' +
        "</div>" +

        '<div class="hstack" style="justify-content:flex-end;gap:10px">' +
          '<button class="btn btn--ghost" id="upReset">Reset</button>' +
          '<button class="btn btn--primary" id="upPublish">' + UI.ICONS.check + " Publish</button>" +
        "</div>" +
      "</div>" +

      '<div class="panel-card"><h3>Your uploads</h3>' + uploadsTable() + "</div>";

    const fileInput = document.getElementById("fileInput");
    const drop = document.getElementById("dropZone");

    drop.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      if (this.files && this.files[0]) {
        document.getElementById("fileName").textContent = "Selected: " + this.files[0].name +
          " (" + Math.round(this.files[0].size / 1024) + " KB)";
        const t = document.getElementById("upTitle");
        if (!t.value) t.value = this.files[0].name.replace(/\.[^.]+$/, "");
      }
    });
    ["dragenter", "dragover"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.style.borderColor = "var(--accent)"; });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.style.borderColor = ""; });
    });
    drop.addEventListener("drop", function (e) {
      const f = e.dataTransfer.files[0];
      if (f) {
        document.getElementById("fileName").textContent = "Selected: " + f.name;
        const t = document.getElementById("upTitle");
        if (!t.value) t.value = f.name.replace(/\.[^.]+$/, "");
      }
    });

    function updateTrim() {
      const a = Number(document.getElementById("trimStart").value);
      const b = Number(document.getElementById("trimEnd").value);
      document.getElementById("trimLabel").textContent = "Keeps " + Math.min(a, b) + "% – " + Math.max(a, b) + "% of the clip";
    }
    document.getElementById("trimStart").addEventListener("input", updateTrim);
    document.getElementById("trimEnd").addEventListener("input", updateTrim);

    document.getElementById("upReset").addEventListener("click", function () {
      ["upTitle", "upDesc", "upTags", "edCaption"].forEach(function (id) { document.getElementById(id).value = ""; });
      document.getElementById("fileName").textContent = "No file selected — you can still fill in the details and publish a demo entry.";
      A.toast("Form cleared");
    });

    document.getElementById("upPublish").addEventListener("click", function () {
      const title = document.getElementById("upTitle").value.trim();
      if (!title) { A.toast("A title is required"); document.getElementById("upTitle").focus(); return; }

      const tags = document.getElementById("upTags").value.split(",")
        .map(function (t) { return t.trim().toLowerCase(); })
        .filter(Boolean);

      const musicId = document.getElementById("edMusic").value;
      const music = ST.musicLibrary.find(function (m) { return m.id === musicId; });

      const id = "up-" + Date.now();
      const video = {
        id: id,
        title: title,
        owner: "you",
        cat: document.getElementById("upCat").value,
        views: 0,
        duration: 300 + Math.floor(Math.random() * 900),
        days: 0,
        likes: 0,
        desc: document.getElementById("upDesc").value.trim() || "No description yet.",
        tags: tags.length ? tags : ["new"],
        visibility: document.getElementById("upVis").value,
        editor: {
          filter: document.getElementById("edFilter").value,
          effect: document.getElementById("edEffect").value,
          music: music ? music.title + " — " + music.artist : null,
          speed: Number(document.getElementById("edSpeed").value),
          caption: document.getElementById("edCaption").value.trim(),
          altText: document.getElementById("edAlt").checked
        }
      };

      Store.update(function (s) {
        s.uploads.unshift(video);
        s.notifications.unshift({
          id: "n-" + Date.now(),
          type: "upload",
          user: "you",
          video: id,
          text: "published <b>" + UI.escapeHtml(title) + "</b>",
          hours: 0,
          unread: false
        });
      });

      A.toast("Published — “" + title.slice(0, 30) + (title.length > 30 ? "…" : "") + "” is live");
      location.hash = "#/watch/" + id;
    });

    main.addEventListener("click", function (e) {
      const del = e.target.closest("[data-del-upload]");
      if (del) {
        const id = del.dataset.delUpload;
        Store.update(function (s) {
          s.uploads = s.uploads.filter(function (x) { return x.id !== id; });
        });
        A.toast("Upload deleted");
        A.repaint();
      }
    });
  };

  function uploadsTable() {
    const ups = Store.state.uploads;
    if (!ups.length) {
      return '<p class="muted" style="font-size:.9rem">You have not uploaded anything yet.</p>';
    }
    return '<div class="table-wrap"><table class="data" id="upTable"><thead><tr>' +
      "<th>Video</th><th>Visibility</th><th>Category</th><th>Views</th><th></th></tr></thead><tbody>" +
      ups.map(function (v) {
        return "<tr>" +
          '<td><a href="#/watch/' + v.id + '">' + UI.escapeHtml(v.title.slice(0, 48)) + "</a></td>" +
          "<td>" + UI.escapeHtml(v.visibility || "Public") + "</td>" +
          "<td>" + UI.escapeHtml(v.cat) + "</td>" +
          "<td>" + UI.exact(v.views) + "</td>" +
          '<td><button class="btn btn--sm btn--ghost" data-del-upload="' + v.id + '">Delete</button></td>' +
        "</tr>";
      }).join("") + "</tbody></table></div>";
  }

  /* ============================================================
     CREATOR STUDIO
     ============================================================ */
  window.viewStudio = function () {
    main.className = "main";

    const ups = Store.state.uploads.concat(ST.videos.filter(function (v) { return v.owner === "you"; }));
    const totalViews = ups.reduce(function (n, v) { return n + v.views; }, 0);

    const week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const values = [42, 61, 55, 78, 92, 84, 71];
    const max = Math.max.apply(null, values);

    const kpis = [
      { label: "Views (28 days)", value: UI.compact(totalViews), delta: "+12.4%" },
      { label: "Watch time", value: (totalViews / 60).toFixed(1) + "K hrs", delta: "+8.1%" },
      { label: "Subscribers", value: "+" + UI.compact(Math.floor(totalViews / 900) + 12), delta: "+3.6%" },
      { label: "Estimated revenue", value: "$" + (totalViews / 1000).toFixed(2), delta: "+5.2%" }
    ];

    main.innerHTML =
      '<div class="page-head"><div><h1>Creator Studio</h1>' +
      "<p>How your channel is performing across videos and Shorts.</p></div>" +
      '<a class="btn btn--primary" href="#/upload">' + UI.ICONS.plus + " New upload</a></div>" +

      '<div class="kpis">' +
        kpis.map(function (k) {
          return '<div class="kpi"><div class="kpi__label">' + k.label + "</div>" +
            '<div class="kpi__value">' + k.value + "</div>" +
            '<div class="kpi__delta">' + k.delta + " vs previous period</div></div>";
        }).join("") +
      "</div>" +

      '<div class="panel-card"><h3>Views over the last 7 days</h3>' +
        '<div class="bars">' +
          week.map(function (d, i) {
            return '<div class="bars__col"><div class="bars__bar" style="height:' +
              Math.round((values[i] / max) * 100) + '%"></div>' +
              '<span class="bars__label">' + d + "</span></div>";
          }).join("") +
        "</div>" +
        '<p class="muted" style="font-size:.8rem;margin-top:6px">Peak was Saturday. These are illustrative figures for the demo.</p>' +
      "</div>" +

      '<div class="panel-card"><h3>Top content</h3>' +
        '<div class="table-wrap"><table class="data"><thead><tr>' +
        "<th>Video</th><th>Published</th><th>Views</th><th>Likes</th><th>Engagement</th></tr></thead><tbody>" +
        ups.map(function (v) {
          const eng = v.views ? ((v.likes / v.views) * 100).toFixed(1) + "%" : "—";
          return "<tr>" +
            '<td><a href="#/watch/' + v.id + '">' + UI.escapeHtml(v.title.slice(0, 46)) + "</a></td>" +
            "<td>" + UI.daysAgo(v.days) + "</td>" +
            "<td>" + UI.exact(v.views) + "</td>" +
            "<td>" + UI.exact(v.likes) + "</td>" +
            "<td>" + eng + "</td>" +
          "</tr>";
        }).join("") +
        "</tbody></table></div></div>" +

      '<div class="panel-card"><h3>Audience</h3>' +
        '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px">' +
          '<div><p class="kpi__label">Top geographies</p>' +
            '<p style="font-size:.9rem;line-height:1.9">United Kingdom 24%<br>United States 19%<br>Germany 11%<br>India 9%<br>Canada 7%</p></div>' +
          '<div><p class="kpi__label">Age &amp; gender</p>' +
            '<p style="font-size:.9rem;line-height:1.9">18-24 — 31%<br>25-34 — 38%<br>35-44 — 19%<br>45+ — 12%</p></div>' +
          '<div><p class="kpi__label">Traffic sources</p>' +
            '<p style="font-size:.9rem;line-height:1.9">Browse features 41%<br>Suggested 27%<br>Search 18%<br>External 14%</p></div>' +
        "</div></div>" +

      '<div class="panel-card"><h3>Monetisation &amp; tools</h3>' +
        '<div class="tiles">' +
          ["Channel memberships", "Super Thanks", "Shopping", "Brand connect", "Content scheduling", "Branded content"].map(function (n) {
            return '<div class="tile"><div class="tile__ico">' + UI.ICONS.sparkle + "</div>" +
              "<h3>" + n + "</h3><p>Available on eligible channels. Requirements are met at 1,000 subscribers and 4,000 watch hours.</p></div>";
          }).join("") +
        "</div></div>";
  };

  /* ============================================================
     SETTINGS
     ============================================================ */
  window.viewSettings = function () {
    main.className = "main";
    const s = Store.state;
    const p = s.myProfile;

    function sw(id, label, sub, checked) {
      return '<div class="switch"><input type="checkbox" id="' + id + '"' + (checked ? " checked" : "") + " />" +
        '<label class="switch__track" for="' + id + '"></label>' +
        '<span class="switch__label">' + label + "<small>" + sub + "</small></span></div>";
    }

    main.innerHTML =
      '<div class="page-head"><div><h1>Settings</h1>' +
      "<p>Account, privacy, notifications and playback.</p></div>" +
      '<button class="btn btn--ghost" id="resetAll">Reset all data</button></div>' +

      '<div class="panel-card"><h3>Profile</h3>' +
        '<div class="form-grid">' +
          '<div class="field"><label for="setName">Display name</label>' +
            '<input type="text" id="setName" value="' + UI.escapeHtml(p.name) + '" /></div>' +
          '<div class="field"><label for="setHandle">Username</label>' +
            '<input type="text" id="setHandle" value="' + UI.escapeHtml(p.handle) + '" /></div>' +
        "</div>" +
        '<div class="field"><label for="setBio">Biography</label>' +
          '<textarea id="setBio">' + UI.escapeHtml(p.bio) + "</textarea></div>" +
        '<div class="field"><label for="setLinks">Website links</label>' +
          '<input type="text" id="setLinks" value="' + UI.escapeHtml((p.links || []).join(", ")) + '" />' +
          '<p class="field__hint">Separate multiple links with commas.</p></div>' +
        '<div class="field"><label for="setType">Account type</label>' +
          '<select id="setType">' +
            ["personal", "creator", "business"].map(function (t) {
              return "<option" + (p.accountType === t ? " selected" : "") + ">" + t + "</option>";
            }).join("") +
          "</select></div>" +
        '<div class="field"><label>Profile picture</label>' +
          '<div class="hstack">' + UI.avatar("you", "lg") +
          '<div><input type="file" id="setAvatar" accept="image/*" class="sr-only" />' +
          '<button class="btn btn--ghost btn--sm" id="pickAvatar">Choose image</button>' +
          '<p class="field__hint">Your initial is used until an image is chosen.</p></div></div></div>' +
        '<div class="hstack" style="justify-content:flex-end">' +
          '<button class="btn btn--primary" id="saveProfile">Save changes</button></div>' +
      "</div>" +

      '<div class="panel-card"><h3>Privacy &amp; safety</h3>' +
        sw("setPrivate", "Private account", "Only approved followers can see your content.", s.settings.privateAccount) +
        sw("set2fa", "Two-factor authentication", "Require a second step when signing in.", s.settings.twoFactor) +
        sw("setHideComments", "Hide unwanted comments", "Filter comments that may be offensive.", s.settings.hideComments) +
        '<div class="form-grid" style="margin-top:14px">' +
          '<div class="field"><label for="setDMs">Who can message you</label><select id="setDMs">' +
            ["everyone", "followers", "nobody"].map(function (v) {
              return "<option" + (s.settings.allowDMs === v ? " selected" : "") + ">" + v + "</option>";
            }).join("") + "</select></div>" +
          '<div class="field"><label for="setMentions">Who can mention you</label><select id="setMentions">' +
            ["everyone", "followers", "nobody"].map(function (v) {
              return "<option" + (s.settings.allowMentions === v ? " selected" : "") + ">" + v + "</option>";
            }).join("") + "</select></div>" +
        "</div>" +
      "</div>" +

      '<div class="panel-card"><h3>Notifications &amp; playback</h3>' +
        sw("setPush", "Push notifications", "New followers, likes, comments and live alerts.", s.settings.pushEnabled) +
        sw("setAutoplay", "Autoplay next video", "Start the next recommendation automatically.", s.settings.autoplay) +
        sw("setCaptions", "Captions on by default", "Show subtitles when available.", s.settings.captionsOn) +
        sw("setAlt", "Alternative text", "Prompt for alt text when uploading.", s.settings.altText) +
      "</div>" +

      '<div class="panel-card"><h3>Login activity</h3>' +
        '<div class="table-wrap"><table class="data"><thead><tr>' +
        "<th>Device</th><th>Location</th><th>When</th><th>Status</th></tr></thead><tbody>" +
        "<tr><td>Chrome • macOS</td><td>London, UK</td><td>Active now</td><td>Current session</td></tr>" +
        "<tr><td>Safari • iPhone</td><td>London, UK</td><td>2 days ago</td><td>Recognised</td></tr>" +
        "<tr><td>Firefox • Windows</td><td>Manchester, UK</td><td>9 days ago</td><td>Recognised</td></tr>" +
        "</tbody></table></div></div>" +

      '<div class="panel-card"><h3>Your data</h3>' +
        '<div class="hstack" style="flex-wrap:wrap;gap:10px">' +
          '<button class="btn btn--ghost" id="downloadData">Download your information</button>' +
          '<button class="btn btn--ghost" id="deactivate">Deactivate account</button>' +
          '<button class="btn btn--ghost" id="deleteAccount" style="border-color:#ff5f5f;color:#ff5f5f">Delete account</button>' +
        "</div>" +
        '<p class="field__hint">This demo keeps everything in your browser only — nothing is sent anywhere.</p>' +
      "</div>";

    document.getElementById("pickAvatar").addEventListener("click", function () {
      document.getElementById("setAvatar").click();
    });

    document.getElementById("saveProfile").addEventListener("click", function () {
      Store.update(function (state) {
        state.myProfile.name = document.getElementById("setName").value.trim() || "Your Channel";
        state.myProfile.handle = document.getElementById("setHandle").value.trim() || "@you";
        state.myProfile.bio = document.getElementById("setBio").value;
        state.myProfile.links = document.getElementById("setLinks").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean);
        state.myProfile.accountType = document.getElementById("setType").value;
      });
      A.toast("Profile updated");
      A.syncBadges();
    });

    const toggleMap = [
      ["setPrivate", "privateAccount"],
      ["set2fa", "twoFactor"],
      ["setHideComments", "hideComments"],
      ["setPush", "pushEnabled"],
      ["setAutoplay", "autoplay"],
      ["setCaptions", "captionsOn"],
      ["setAlt", "altText"]
    ];
    toggleMap.forEach(function (pair) {
      const el = document.getElementById(pair[0]);
      if (!el) return;
      el.addEventListener("change", function () {
        const val = el.checked;
        Store.update(function (state) { state.settings[pair[1]] = val; });
        A.toast(pair[0].replace("set", "") + " → " + (val ? "on" : "off"));
      });
    });

    document.getElementById("setDMs").addEventListener("change", function () {
      const v = this.value;
      Store.update(function (state) { state.settings.allowDMs = v; });
      A.toast("Direct messages: " + v);
    });
    document.getElementById("setMentions").addEventListener("change", function () {
      const v = this.value;
      Store.update(function (state) { state.settings.allowMentions = v; });
      A.toast("Mentions: " + v);
    });

    document.getElementById("downloadData").addEventListener("click", function () {
      const blob = new Blob([JSON.stringify(Store.state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "streamtube-account-data.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      A.toast("Account data downloaded");
    });

    document.getElementById("deactivate").addEventListener("click", function () {
      A.toast("Account deactivated — sign back in any time to reactivate");
    });
    document.getElementById("deleteAccount").addEventListener("click", function () {
      if (confirm("Delete the account and all local data? This cannot be undone.")) {
        Store.reset();
      }
    });
    document.getElementById("resetAll").addEventListener("click", function () {
      if (confirm("Reset the demo back to its original state?")) Store.reset();
    });
  };

  /* ============================================================
     TRIM / EDIT TOOL (modal, opened from the watch page)
     ============================================================ */
  window.openTrimTool = function (v) {
    const wrap = document.createElement("div");
    wrap.className = "modal is-open";
    wrap.innerHTML =
      '<div class="modal__card"><div class="modal__head">' +
        "<h3>Edit &amp; trim — " + UI.escapeHtml(v.title.slice(0, 40)) + "</h3>" +
        '<button class="icon-btn" data-close-modal>&times;</button></div>' +
        '<div class="modal__body">' +
          '<div class="field"><label>Trim range</label>' +
            '<div class="hstack" style="gap:14px">' +
              '<input type="range" id="mStart" min="0" max="100" value="0" style="flex:1" />' +
              '<input type="range" id="mEnd" min="0" max="100" value="60" style="flex:1" />' +
            "</div>" +
            '<p class="field__hint" id="mLabel">Keeps 0% – 60%</p></div>' +
          '<div class="form-grid">' +
            '<div class="field"><label for="mFilter">Filter</label><select id="mFilter">' +
              ST.filters.map(function (f) { return "<option>" + f + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="mEffect">Effect</label><select id="mEffect">' +
              ST.effects.map(function (f) { return "<option>" + f + "</option>"; }).join("") + "</select></div>" +
            '<div class="field"><label for="mMusic">Music</label><select id="mMusic">' +
              '<option value="">None</option>' +
              ST.musicLibrary.map(function (m) { return "<option>" + m.title + " — " + m.artist + "</option>"; }).join("") +
            "</select></div>" +
            '<div class="field"><label for="mSpeed">Speed</label><select id="mSpeed">' +
              ST.speeds.map(function (s) { return '<option value="' + s + '">' + s + "×</option>"; }).join("") + "</select></div>" +
          "</div>" +
          '<div class="field"><label for="mCaption">Captions</label>' +
            '<textarea id="mCaption" placeholder="Add subtitles for your clip…"></textarea></div>' +
          '<div class="hstack" style="justify-content:flex-end;gap:10px">' +
            '<button class="btn btn--ghost" data-close-modal>Cancel</button>' +
            '<button class="btn btn--primary" id="mSave">Save edits</button></div>' +
        "</div></div>";

    document.body.appendChild(wrap);

    function label() {
      const a = Number(wrap.querySelector("#mStart").value);
      const b = Number(wrap.querySelector("#mEnd").value);
      wrap.querySelector("#mLabel").textContent = "Keeps " + Math.min(a, b) + "% – " + Math.max(a, b) + "%";
    }
    wrap.querySelector("#mStart").addEventListener("input", label);
    wrap.querySelector("#mEnd").addEventListener("input", label);

    wrap.addEventListener("click", function (e) {
      if (e.target === wrap || e.target.closest("[data-close-modal]")) wrap.remove();
    });

    wrap.querySelector("#mSave").addEventListener("click", function () {
      const filter = wrap.querySelector("#mFilter").value;
      const music = wrap.querySelector("#mMusic").value;
      const caption = wrap.querySelector("#mCaption").value.trim();
      A.toast("Edits saved" + (filter !== "None" ? " • filter: " + filter : "") +
        (music ? " • music added" : "") + (caption ? " • captions added" : ""));
      wrap.remove();
    });
  };
})();
