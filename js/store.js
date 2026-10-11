/* ============================================================
   store.js — state container with persistence.
   Everything the UI reads or writes lives here.
   ============================================================ */

const Store = (function () {
  const KEY = "streamtube.v1";

  const defaults = {
    theme: "dark",
    likedVideos: [],     // video ids
    savedVideos: [],     // watch later
    dislikedVideos: [],
    subscribed: [],      // creator ids
    watchHistory: [],    // video ids, most recent first
    progress: {},        // videoId -> seconds
    likedShorts: [],
    savedShorts: [],
    comments: {},        // videoId -> comment[]
    threads: null,       // cloned from seed on first run
    notifications: null, // cloned from seed on first run
    activeThread: "t1",
    settings: null,
    uploads: [],         // { id, title, desc, cat, tags, visibility, thumbSeed }
    myProfile: {
      name: "Your Channel",
      handle: "@you",
      bio: "This is your channel. Upload something and watch the numbers move.",
      links: ["example.com"],
      accountType: "creator",
      private: false
    }
  };

  let state = load();

  function load() {
    let saved = {};
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) saved = JSON.parse(raw) || {};
    } catch (e) {
      console.warn("State could not be read; starting fresh.", e);
    }
    const merged = Object.assign({}, defaults, saved);
    // Deep defaults for nested objects
    merged.settings = Object.assign({}, ST.defaultSettings, saved.settings || {});
    merged.myProfile = Object.assign({}, defaults.myProfile, saved.myProfile || {});
    // Seed the collections that live in data.js the first time only
    if (!merged.threads) merged.threads = JSON.parse(JSON.stringify(ST.seedThreads));
    if (!merged.notifications) merged.notifications = JSON.parse(JSON.stringify(ST.seedNotifications));
    if (!merged.comments || !Object.keys(merged.comments).length) {
      merged.comments = JSON.parse(JSON.stringify(ST.seedComments));
    }
    return merged;
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("State could not be saved (storage full or blocked).", e);
    }
  }

  /* Notify subscribers on every mutation so views can re-render themselves. */
  const listeners = new Set();

  function commit() {
    persist();
    listeners.forEach(function (fn) { fn(state); });
  }

  return {
    get state() { return state; },

    subscribe(fn) { listeners.add(fn); return function () { listeners.delete(fn); }; },

    /** Patch top-level keys, then persist + notify. */
    set(patch) {
      Object.assign(state, patch);
      commit();
    },

    /** Mutate nested state via a callback, then persist + notify. */
    update(fn) {
      fn(state);
      commit();
    },

    /* ---------- convenience helpers ---------- */
    toggleInList(listName, id) {
      const list = state[listName];
      const i = list.indexOf(id);
      if (i === -1) list.push(id); else list.splice(i, 1);
      commit();
      return i === -1; // true when it was added
    },

    isIn(listName, id) { return state[listName].indexOf(id) !== -1; },

    push(listName, item) {
      state[listName].unshift(item);
      commit();
      return item;
    },

    unreadMessages() {
      return state.threads.reduce(function (n, t) { return n + (t.unread || 0); }, 0);
    },

    unreadNotifications() {
      return state.notifications.filter(function (n) { return n.unread; }).length;
    },

    reset() {
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
      location.reload();
    }
  };
})();
