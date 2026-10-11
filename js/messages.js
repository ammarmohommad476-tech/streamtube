/* ============================================================
   messages.js — direct messages.
   Threads, group chats, replies, reactions, edits, unsend,
   stickers, GIFs, voice messages, blocking, calls.
   ============================================================ */

(function () {
  "use strict";

  const A = window.__ST;
  const main = A.main;
  const T = A.T;

  /* ---------- helpers ---------- */
  function threadById(id) {
    return Store.state.threads.find(function (t) { return t.id === id; }) || Store.state.threads[0];
  }

  function lastMessage(t) {
    if (!t.messages || !t.messages.length) return "No messages yet";
    const m = t.messages[t.messages.length - 1];
    return (m.mine ? "You: " : (m.from ? m.from + ": " : "")) + (m.text || "[attachment]");
  }

  function threadAvatar(t) {
    if (t.kind === "group") {
      return '<span class="avatar" style="background:linear-gradient(135deg,#7b2ff7,#ff2d55)">' +
        (t.name.indexOf("\uD83C\uDFAC") !== -1 ? "\uD83C\uDFAC" : UI.initials(t.name)) + "</span>";
    }
    return UI.avatar(t.user);
  }

  /* ============================================================
     VIEW
     ============================================================ */
  window.viewMessages = function () {
    main.className = "main main--flush";
    const s = Store.state;
    const active = threadById(s.activeThread);

    main.innerHTML =
      '<div class="dm" id="dmShell">' +

        '<aside class="dm__list">' +
          '<div class="dm__list-head"><h2>Messages</h2>' +
            '<button class="icon-btn" id="newThread" title="New message">' + UI.ICONS.plus + "</button>" +
          "</div>" +
          '<div class="dm__threads" id="threadList">' +
            s.threads.map(function (t) {
              return '<div class="dm-thread' + (t.id === active.id ? " is-active" : "") + '" data-thread="' + t.id + '">' +
                threadAvatar(t) +
                '<div class="dm-thread__info">' +
                  '<div class="dm-thread__name">' + UI.escapeHtml(t.name) +
                    (t.kind === "group" ? ' <span class="tag-pill" style="font-size:.62rem">group</span>' : "") +
                  "</div>" +
                  '<div class="dm-thread__last">' + UI.escapeHtml(lastMessage(t)) + "</div>" +
                "</div>" +
                '<div class="dm-thread__side">' +
                  '<div class="dm-thread__time">' + UI.minsAgo(t.messages.length ? t.messages[t.messages.length - 1].mins : 0) + "</div>" +
                  (t.unread ? '<span class="dm-dot"></span>' : "") +
                "</div>" +
              "</div>";
            }).join("") +
          "</div>" +
        "</aside>" +

        '<section class="dm__chat" id="dmChat">' +
          '<header class="dm__chat-head">' +
            '<button class="icon-btn" id="backToList" style="display:none">' + UI.ICONS.arrowUp + "</button>" +
            threadAvatar(active) +
            "<div>" +
              "<h3>" + UI.escapeHtml(active.name) + "</h3>" +
              '<div class="dm__status" id="dmStatus">' +
                (active.kind === "group"
                  ? active.members.length + " members"
                  : "Active recently") +
              "</div>" +
            "</div>" +
            '<div class="dm__head-actions">' +
              '<button class="icon-btn" id="voiceCall" title="Voice call">' + UI.ICONS.phone + "</button>" +
              '<button class="icon-btn" id="videoCall" title="Video call">' + UI.ICONS.video + "</button>" +
              '<button class="icon-btn" id="threadMore" title="More">' + UI.ICONS.more + "</button>" +
            "</div>" +
          "</header>" +

          '<div class="dm__body" id="dmBody"></div>' +

          '<div class="dm__composer" id="dmComposer"></div>' +
        "</section>" +
      "</div>";

    renderThreadBody(active);
    renderComposer(active);
    renderThreadList(active.id);

    /* Thread switching */
    main.querySelector("#threadList").addEventListener("click", function (e) {
      const row = e.target.closest("[data-thread]");
      if (!row) return;
      openThread(row.dataset.thread);
    });

    /* Header actions */
    document.getElementById("voiceCall").addEventListener("click", function () { startCall(active, "voice"); });
    document.getElementById("videoCall").addEventListener("click", function () { startCall(active, "video"); });

    document.getElementById("threadMore").addEventListener("click", function () {
      const t = active;
      const muted = t.muted === true;
      const blocked = t.blocked === true;
      const choice = prompt(
        "Thread options \u2014 type a number:\n\n" +
        "1. " + (muted ? "Unmute" : "Mute") + " conversation\n" +
        "2. " + (blocked ? "Unblock" : "Block") + " account\n" +
        "3. Restrict account\n" +
        "4. Mark as read\n" +
        "5. Clear conversation",
        "1"
      );
      if (!choice) return;
      if (choice === "1") {
        Store.update(function (st) {
          st.threads.forEach(function (x) { if (x.id === t.id) x.muted = !muted; });
        });
        A.toast(muted ? "Conversation unmuted" : "Conversation muted");
      } else if (choice === "2") {
        Store.update(function (st) {
          st.threads.forEach(function (x) { if (x.id === t.id) x.blocked = !blocked; });
        });
        A.toast(blocked ? "Account unblocked" : "Account blocked \u2014 they can no longer message you");
      } else if (choice === "3") {
        A.toast("Account restricted \u2014 their messages are held in requests");
      } else if (choice === "4") {
        Store.update(function (st) {
          st.threads.forEach(function (x) { if (x.id === t.id) x.unread = 0; });
        });
        A.repaint();
      } else if (choice === "5") {
        Store.update(function (st) {
          st.threads.forEach(function (x) { if (x.id === t.id) x.messages = []; });
        });
        A.toast("Conversation cleared");
        A.repaint();
      }
    });

    document.getElementById("newThread").addEventListener("click", function () {
      const choices = ST.creators.filter(function (c) { return c.id !== "you"; })
        .map(function (c, i) { return (i + 1) + ". " + c.name; }).join("\n");
      const pick = prompt("Start a new conversation with:\n\n" + choices + "\n\nEnter a number:", "1");
      if (!pick) return;
      const c = ST.creators.filter(function (x) { return x.id !== "you"; })[Number(pick) - 1];
      if (!c) { A.toast("That was not one of the options"); return; }
      const exists = Store.state.threads.find(function (t) { return t.user === c.id && t.kind === "dm"; });
      if (exists) { openThread(exists.id); return; }
      const t = {
        id: "t-" + Date.now(),
        name: c.name,
        kind: "dm",
        user: c.id,
        unread: 0,
        notes: "",
        messages: []
      };
      Store.update(function (st) { st.threads.unshift(t); });
      openThread(t.id);
      A.toast("Conversation with " + c.name + " started");
    });

    /* Mobile: back to list */
    document.getElementById("backToList").addEventListener("click", function () {
      document.getElementById("dmShell").classList.add("is-list");
    });
  };

  /* ---------- thread list ---------- */
  function renderThreadList(activeId) {
    const host = document.getElementById("threadList");
    if (!host) return;
    host.querySelectorAll("[data-thread]").forEach(function (row) {
      row.classList.toggle("is-active", row.dataset.thread === activeId);
      const t = threadById(row.dataset.thread);
      row.querySelector(".dm-thread__last").textContent = lastMessage(t);
      const dot = row.querySelector(".dm-dot");
      if (t.unread && !dot) {
        const side = row.querySelector(".dm-thread__side");
        if (side) side.insertAdjacentHTML("beforeend", '<span class="dm-dot"></span>');
      } else if (!t.unread && dot) {
        dot.remove();
      }
    });
  }

  /* ---------- messages body ---------- */
  function renderThreadBody(t) {
    const body = document.getElementById("dmBody");
    if (!body) return;

    if (!t.messages.length) {
      body.innerHTML = '<div class="dm-empty"><strong>' + UI.escapeHtml(t.name) + "</strong>" +
        "<p>No messages yet. Say hello.</p></div>";
      return;
    }

    const sorted = t.messages.slice().sort(function (a, b) { return b.mins - a.mins; });

    body.innerHTML = '<div class="dm-day">Today</div>' + sorted.map(function (m) {
      return messageHtml(t, m);
    }).join("");

    UI.paintAll(body);
    body.scrollTop = body.scrollHeight;
  }

  function messageHtml(t, m) {
    const react = m.react ? '<span class="msg__react">' + m.react + "</span>" : "";
    const edited = m.edited ? ' \u00b7 <span class="msg__edited">edited</span>' : "";
    const readState = m.mine ? " \u00b7 " + (m.read === false ? "Sent" : "Seen") : "";

    let inner = "";
    if (m.replyTo) {
      inner += '<span class="msg__reply">' + UI.escapeHtml(m.replyTo) + "</span>";
    }

    if (m.kind === "voice") {
      inner += '<div class="voice-bubble">' +
        '<span class="voice-bars"><i></i><i></i><i></i><i></i><i></i></span>' +
        "<span>" + (m.seconds || 12) + "s</span></div>";
    } else if (m.kind === "gif" || m.kind === "sticker") {
      inner += m.kind === "sticker"
        ? '<span style="font-size:2.4rem;line-height:1">' + UI.escapeHtml(m.text) + "</span>"
        : '<div class="msg__media">' + UI.thumbCanvas(m.seed || "gif") + "</div>";
    } else if (m.kind === "image" || m.kind === "video") {
      inner += '<div class="msg__media">' + UI.thumbCanvas(m.seed || "media") + "</div>" +
        (m.text ? '<div style="margin-top:6px">' + UI.escapeHtml(m.text) + "</div>" : "");
    } else {
      inner += UI.escapeHtml(m.text);
    }

    inner += '<div class="msg__meta">' + UI.minsAgo(m.mins) + readState + edited + "</div>";

    const hover =
      '<div class="msg__hover">' +
        '<button data-msg-react="' + m.id + '" title="React">\u263A</button>' +
        '<button data-msg-reply="' + m.id + '" title="Reply">' + UI.ICONS.comment + "</button>" +
        (m.mine ? '<button data-msg-edit="' + m.id + '" title="Edit">' + UI.ICONS.edit + "</button>" +
                  '<button data-msg-unsend="' + m.id + '" title="Unsend">' + UI.ICONS.trash + "</button>" : "") +
      "</div>";

    return '<div class="msg' + (m.mine ? " is-mine" : "") + '" data-msg="' + m.id + '">' +
      hover +
      '<div class="msg__bubble">' + inner + "</div>" + react +
    "</div>";
  }

  /* ---------- composer ---------- */
  function renderComposer(t) {
    const host = document.getElementById("dmComposer");
    if (!host) return;

    const replyBar = T.replyTo
      ? '<div class="dm__reply-bar">' +
          "<span>Replying to: " + UI.escapeHtml(T.replyTo.text.slice(0, 70)) + "</span>" +
          '<button class="text-btn" id="cancelReply">Cancel</button>' +
        "</div>"
      : "";

    host.innerHTML =
      replyBar +
      '<div id="stickerRow" style="display:none" class="dm__stickers">' +
        ST.stickers.map(function (s) { return '<button data-sticker="' + s + '">' + s + "</button>"; }).join("") +
      "</div>" +
      '<div id="gifRow" style="display:none" class="dm__stickers">' +
        ST.gifs.map(function (g) {
          return '<button data-gif="' + g.seed + '" title="' + g.label + '" style="font-size:.75rem;width:64px;height:56px">' +
            "GIF<br>" + g.label + "</button>";
        }).join("") +
      "</div>" +
      '<div class="dm__input-row">' +
        '<button class="icon-btn" id="attachBtn" title="Photo or video">' + UI.ICONS.image + "</button>" +
        '<button class="icon-btn" id="stickerBtn" title="Stickers and GIFs">' + UI.ICONS.sparkle + "</button>" +
        '<textarea class="dm__input" id="dmInput" rows="1" placeholder="Message ' + UI.escapeHtml(t.name) + '\u2026"></textarea>' +
        '<button class="icon-btn" id="micBtn" title="Voice message">' + UI.ICONS.mic + "</button>" +
        '<button class="icon-btn" id="sendBtn" title="Send">' + UI.ICONS.send + "</button>" +
      "</div>" +
      '<input type="file" id="attachInput" accept="image/*,video/*" class="sr-only" />';

    const input = document.getElementById("dmInput");
    const stickerRow = document.getElementById("stickerRow");
    const gifRow = document.getElementById("gifRow");

    input.addEventListener("input", function () {
      input.style.height = "auto";
      input.style.height = Math.min(140, input.scrollHeight) + "px";
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendText(); }
    });

    const cancel = document.getElementById("cancelReply");
    if (cancel) cancel.addEventListener("click", function () {
      T.replyTo = null;
      renderComposer(t);
    });

    document.getElementById("stickerBtn").addEventListener("click", function () {
      stickerRow.style.display = stickerRow.style.display === "none" ? "flex" : "none";
      gifRow.style.display = "none";
    });
    document.getElementById("attachBtn").addEventListener("click", function () {
      document.getElementById("attachInput").click();
    });
    stickerRow.addEventListener("click", function (e) {
      const b = e.target.closest("[data-sticker]");
      if (!b) return;
      pushMessage(t, { kind: "sticker", text: b.dataset.sticker });
    });
    gifRow.addEventListener("click", function (e) {
      const b = e.target.closest("[data-gif]");
      if (!b) return;
      pushMessage(t, { kind: "gif", seed: b.dataset.gif });
    });

    /* Double-clicking the sticker row reveals the GIF row. */
    stickerRow.addEventListener("dblclick", function () {
      gifRow.style.display = gifRow.style.display === "none" ? "flex" : "none";
    });

    document.getElementById("attachInput").addEventListener("change", function () {
      if (!this.files || !this.files[0]) return;
      const f = this.files[0];
      const isVideo = f.type.indexOf("video") === 0;
      pushMessage(t, {
        kind: isVideo ? "video" : "image",
        seed: "dm-" + f.name,
        text: f.name
      });
      A.toast(isVideo ? "Video sent" : "Photo sent");
      this.value = "";
    });

    document.getElementById("sendBtn").addEventListener("click", sendText);

    document.getElementById("micBtn").addEventListener("click", function () {
      if (T.recording) { stopRecording(); return; }
      beginRecording(t);
    });

    function sendText() {
      const text = input.value.trim();
      if (!text) { A.toast("Type a message first"); return; }
      pushMessage(t, { kind: "text", text: text });
      input.value = "";
      input.style.height = "auto";
    }
  }

  /* ---------- recording ---------- */
  function beginRecording(t) {
    T.recording = true;
    T.recordSeconds = 0;
    const row = document.querySelector(".dm__input-row");
    if (!row) return;

    row.innerHTML = '<div class="recording"><span class="rec-dot"></span>' +
      '<span id="recTime">0:00</span><span class="muted" style="font-weight:400">recording\u2026</span>' +
      '<button class="btn btn--sm btn--ghost" id="recCancel">Cancel</button>' +
      '<button class="btn btn--sm btn--primary" id="recSend">Send</button></div>';

    T.recordTimer = setInterval(function () {
      T.recordSeconds += 1;
      const el = document.getElementById("recTime");
      if (el) el.textContent = "0:" + String(T.recordSeconds).padStart(2, "0");
    }, 1000);

    document.getElementById("recCancel").addEventListener("click", function () {
      stopRecording();
      A.toast("Voice message discarded");
      renderComposer(t);
    });
    document.getElementById("recSend").addEventListener("click", function () {
      const secs = T.recordSeconds || 1;
      stopRecording();
      pushMessage(t, { kind: "voice", seconds: secs, text: "Voice message" });
    });
  }

  function stopRecording() {
    if (!T.recording) return;
    T.recording = false;
    clearInterval(T.recordTimer);
    T.recordTimer = null;
  }

  /* ---------- send a message ---------- */
  function pushMessage(t, payload) {
    const msg = Object.assign({
      id: "m-" + Date.now() + "-" + Math.floor(Math.random() * 999),
      mine: true,
      mins: 0,
      read: false
    }, payload);

    if (T.replyTo) msg.replyTo = T.replyTo.text.slice(0, 60);

    Store.update(function (s) {
      const target = s.threads.find(function (x) { return x.id === t.id; });
      if (!target) return;
      target.messages.push(msg);
      target.unread = 0;
      if (msg.replyTo) T.replyTo = null;
    });

    renderThreadBody(threadById(t.id));
    renderComposer(threadById(t.id));
    renderThreadList(t.id);
    A.syncBadges();

    /* Simulated reply + read receipt + typing indicator */
    simulateReply(t, msg);
  }

  function simulateReply(t, myMsg) {
    const status = document.getElementById("dmStatus");
    if (!status) return;

    setTimeout(function () {
      if (!document.getElementById("dmStatus")) return;
      status.textContent = "typing\u2026";
      status.classList.add("is-typing");
    }, 700);

    setTimeout(function () {
      const current = threadById(t.id);
      const replyText = pickReply(current, myMsg);

      Store.update(function (s) {
        const target = s.threads.find(function (x) { return x.id === t.id; });
        if (!target) return;
        target.messages.forEach(function (m) { if (m.id === myMsg.id) m.read = true; });
        target.messages.push({
          id: "m-" + Date.now() + "-r",
          mine: false,
          text: replyText,
          mins: 0,
          from: target.kind === "group" ? ST.creatorById(target.members[1] || target.members[0]).name : undefined
        });
      });

      const st = document.getElementById("dmStatus");
      if (st) { st.textContent = "Active recently"; st.classList.remove("is-typing"); }

      renderThreadBody(threadById(t.id));
      renderThreadList(t.id);
    }, 2400);
  }

  function pickReply(t, myMsg) {
    const text = (myMsg.text || "").toLowerCase();
    if (/price|cost|charge/.test(text)) return "Let me send the rate card over.";
    if (/when|time|schedule/.test(text)) return "Does Thursday afternoon work for you?";
    if (/thanks|thank you|cheers/.test(text)) return "Any time \uD83D\uDE4C";
    if (/file|export|render/.test(text)) return "Exporting now \u2014 link in a moment.";
    if (/\?$/.test(myMsg.text || "")) return "Good question. Short answer: yes.";
    if (myMsg.kind === "voice") return "Just listened \u2014 that works for me.";
    if (myMsg.kind === "image" || myMsg.kind === "video") return "Oh that turned out well \uD83D\uDD25";
    if (myMsg.kind === "gif" || myMsg.kind === "sticker") return "\uD83D\uDE02";
    const pool = [
      "Ha, exactly.",
      "Sounds good to me.",
      "Sending that over in a sec.",
      "Perfect \uD83D\uDE4C",
      "Let's do it."
    ];
    return pool[ST.hashOf(myMsg.id) % pool.length];
  }

  /* ---------- message actions (react / reply / edit / unsend) ---------- */
  function wireMessageActions(t) {
    const body = document.getElementById("dmBody");
    if (!body) return;

    body.addEventListener("click", function (e) {
      const react = e.target.closest("[data-msg-react]");
      if (react) {
        const pick = prompt("React with an emoji:", "\uD83D\uDD25");
        if (!pick) return;
        Store.update(function (s) {
          const th = s.threads.find(function (x) { return x.id === t.id; });
          const m = th.messages.find(function (x) { return x.id === react.dataset.msgReact; });
          if (m) m.react = pick;
        });
        renderThreadBody(threadById(t.id));
        A.toast("Reaction added");
        return;
      }

      const reply = e.target.closest("[data-msg-reply]");
      if (reply) {
        const th = threadById(t.id);
        const m = th.messages.find(function (x) { return x.id === reply.dataset.msgReply; });
        if (!m) return;
        T.replyTo = { id: m.id, text: m.text || "[attachment]" };
        renderComposer(th);
        document.getElementById("dmInput").focus();
        return;
      }

      const edit = e.target.closest("[data-msg-edit]");
      if (edit) {
        const th = threadById(t.id);
        const m = th.messages.find(function (x) { return x.id === edit.dataset.msgEdit; });
        if (!m) return;
        const next = prompt("Edit your message:", m.text || "");
        if (next === null) return;
        if (!next.trim()) { A.toast("A message cannot be empty"); return; }
        Store.update(function (s) {
          const target = s.threads.find(function (x) { return x.id === t.id; });
          const msg = target.messages.find(function (x) { return x.id === m.id; });
          msg.text = next.trim();
          msg.edited = true;
        });
        renderThreadBody(threadById(t.id));
        A.toast("Message edited");
        return;
      }

      const unsend = e.target.closest("[data-msg-unsend]");
      if (unsend) {
        if (!confirm("Unsend this message for everyone?")) return;
        Store.update(function (s) {
          const target = s.threads.find(function (x) { return x.id === t.id; });
          target.messages = target.messages.filter(function (x) { return x.id !== unsend.dataset.msgUnsend; });
        });
        renderThreadBody(threadById(t.id));
        renderThreadList(t.id);
        A.toast("Message unsent");
      }
    });
  }

  /* ---------- open a thread ---------- */
  function openThread(id) {
    const t = threadById(id);
    Store.update(function (s) {
      s.activeThread = id;
      s.threads.forEach(function (x) { if (x.id === id) x.unread = 0; });
    });
    T.replyTo = null;
    A.repaint();
    A.syncBadges();
    const shell = document.getElementById("dmShell");
    if (shell) shell.classList.remove("is-list");
  }

  /* ---------- calls ---------- */
  function startCall(t, kind) {
    const existing = document.getElementById("callOverlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.className = "call-overlay is-on";
    overlay.id = "callOverlay";
    overlay.innerHTML =
      '<div class="call-overlay__inner">' +
        threadAvatar(t) +
        "<h2>" + UI.escapeHtml(t.name) + "</h2>" +
        '<p class="call-overlay__timer" id="callTimer">' +
          (kind === "video" ? "Starting video call\u2026" : "Calling\u2026") + "</p>" +
        '<div class="call-overlay__btns">' +
          '<button class="btn btn--ghost" id="callMute">Mute</button>' +
          '<button class="btn btn--ghost" id="callSpeaker">Speaker</button>' +
          '<button class="btn btn--primary" id="callEnd">End call</button>' +
        "</div>" +
      "</div>";

    document.body.appendChild(overlay);

    let seconds = 0;
    let connected = false;
    const started = Date.now();

    /* Simulate connecting after 1.5s, then run a timer. */
    setTimeout(function () {
      connected = true;
      const el = document.getElementById("callTimer");
      if (el) el.textContent = "00:00";
    }, 1500);

    T.callTimer = setInterval(function () {
      if (!connected) return;
      seconds += 1;
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      const el = document.getElementById("callTimer");
      if (el) el.textContent = (kind === "video" ? "Video call" : "Voice call") + " \u00b7 " + mm + ":" + ss;
    }, 1000);

    function end(reason) {
      clearInterval(T.callTimer);
      T.callTimer = null;
      overlay.remove();
      const secs = Math.round((Date.now() - started) / 1000);
      A.toast(reason + " \u2014 call lasted " + UI.clock(secs));
    }

    overlay.querySelector("#callMute").addEventListener("click", function () {
      this.classList.toggle("is-on");
      A.toast(this.classList.contains("is-on") ? "Microphone muted" : "Microphone live");
    });
    overlay.querySelector("#callSpeaker").addEventListener("click", function () {
      this.classList.toggle("is-on");
      A.toast(this.classList.contains("is-on") ? "Speaker on" : "Speaker off");
    });
    overlay.querySelector("#callEnd").addEventListener("click", function () { end("Call ended"); });

    A.toast(kind === "video" ? "Video call connecting\u2026" : "Voice call connecting\u2026");
  }

  /* Wire message actions once the body exists. */
  const originalViewMessages = window.viewMessages;
  window.viewMessages = function () {
    main.className = "main main--flush";
    const s = Store.state;
    const active = threadById(s.activeThread);

    originalViewMessages.apply(this, arguments);

    /* mobile shell state */
    const shell = document.getElementById("dmShell");
    const back = document.getElementById("backToList");
    if (back) {
      const narrow = window.innerWidth <= 760;
      back.style.display = narrow ? "grid" : "none";
      back.style.transform = "rotate(-90deg)";
      shell.classList.toggle("is-list", narrow);
    }

    wireMessageActions(active);
  };
})();
