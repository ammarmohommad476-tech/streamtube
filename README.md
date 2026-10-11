# StreamTube

A YouTube-style video website built with plain HTML, CSS and JavaScript. No build step, no dependencies, no bundler - open `index.html` and it runs.

Everything is drawn procedurally with the Canvas API, so there are no image or video files to download and the site works completely offline.

---

## Pages

| Page | What it does |
|---|---|
| Home | Video grid, category filter chips, thumbnails with duration badges, watch-progress bars |
| Shorts | Vertical full-screen feed, swipe/scroll up for the next clip, autoplay progress, double-tap to like |
| Watch | Custom player (play/pause, scrub, mute, fullscreen, captions, speed 0.25x-2x), like/dislike, save, share, subscribe, comments with replies, recommended rail |
| Subscriptions | Videos from the channels you follow, plus a manage/unsubscribe screen |
| Explore | Trending grid, trending tags, creator discovery |
| Search | Matches titles, tags, categories and channel names; sort by date, views, rating or duration |
| Library | History, Watch later, Liked videos, Saved Shorts, your uploads, downloads |
| Messages | DMs and group chats, replies, reactions, edit, unsend, read receipts, typing indicators, stickers, GIFs, photo/video attachments, voice messages, voice and video calls, block/mute/restrict |
| Profile | Avatar, bio, links, follower/following/view counts, Videos / Shorts / Playlists / Community / About tabs |
| Upload | Drag and drop, title, description, category, visibility, tags, editor (filter, effect, music, speed, trim sliders, captions, alt text), publish and delete |
| Creator Studio | KPI cards, 7-day views chart, top-content table with engagement rate, audience breakdown, monetisation tools |
| Settings | Display name, username, bio, links, account type, profile picture, private account, 2FA, comment filtering, DM and mention controls, notification and playback toggles, login activity, download your data, deactivate, delete |

Also included: dark/light theme, notifications panel with unread badge, share sheet (copy link, send in chat, embed, report), toast messages, and localStorage persistence so likes, saves, subscriptions, comments, uploads and messages survive a refresh.

### Keyboard shortcuts

On a Watch page: `Space` play/pause, arrow left/right seek 5 seconds, `M` mute, double-click the player to like.
In Shorts: arrow up/down move between clips.
`Esc` closes modals, the notification panel and the mobile sidebar.

---

## Files

```
streamtube/
  index.html          shell: top bar, sidebar, panels, script tags
  css/
    styles.css        design tokens, all components, responsive rules
  js/
    data.js           seed catalogue and procedural thumbnail painter
    store.js          state container with localStorage persistence
    ui.js             formatting and card/avatar/icon renderers
    app.js            router, shell wiring, Home / Shorts / Watch and the player
    pages.js          Subscriptions, Explore, Search, Library, Profile,
                        Upload, Studio, Settings and the trim modal
    messages.js       direct messages
    streamtube.js     boot: binds each view to its route and renders
```

Script order in `index.html` matters. `streamtube.js` must load last, because it is what binds the page views to the router and performs the first render.

---

## Setup

### 1. Run it locally

The site needs no build and no server.

**Option A - open the file directly**

```bash
git clone https://github.com/ammarmohommad476-tech/streamtube.git
cd streamtube
open index.html        # macOS
# xdg-open index.html # Linux
# start index.html    # Windows
```

**Option B - serve it (recommended)**

Some browsers restrict localStorage on `file://` URLs, which means your likes and uploads will not persist. A one-line static server avoids that.

```bash
python3 -m http.server 8000     # Python 3
npx serve .                     # Node
php -S localhost:8000           # PHP
```

Then open http://localhost:8000

### 2. Deploy it

Any static host works, because there is nothing to compile.

**GitHub Pages**

1. Push this repo to GitHub.
2. Go to Settings, then Pages.
3. Under *Build and deployment*, set Source to `Deploy from a branch`.
4. Choose branch `main` and folder `/ (root)`, then Save.
5. After about a minute the site appears at `https://<your-username>.github.io/streamtube/`.

**Netlify, Vercel or Cloudflare Pages** - drag the folder onto the dashboard, or connect the repo. Leave the build command empty and set the publish directory to `/`.

### 3. Reset the demo

All state lives in localStorage under the key `streamtube.v1`. Use **Settings, Reset all data**, or run `localStorage.clear()` in the browser console.

---

## Customising

**Change the brand colour.** Edit `--accent` in `css/styles.css`:

```css
:root {
  --accent: #ff2d55;
  --accent-soft: rgba(255, 45, 85, 0.14);
}
```

**Add a video.** Append to the `ST.videos` array in `js/data.js`:

```js
{
  id: "v16",
  title: "Your title here",
  owner: "u1",              // must match an id in ST.creators
  cat: "Film",
  views: 12000,
  duration: 640,            // seconds
  days: 2,                  // days since upload
  likes: 840,
  desc: "Description with line breaks.",
  tags: ["tagone", "tagtwo"]
}
```

The thumbnail is generated automatically from the `id`, so no image file is needed.

**Add a creator.** Append to `ST.creators`:

```js
{ id: "u9", handle: "@yourname", name: "Your Name", subs: 5000,
  verified: false, bio: "Short biography.", links: ["yoursite.com"] }
```

**Add a Short.** Append to `ST.shorts`:

```js
{ id: "s9", owner: "u1", caption: "Caption text #tag",
  music: "Track Name - Artist", likes: 1000, comments: 20,
  shares: 40, saves: 90, views: 5000 }
```

---

## How it works

**Routing** is hash-based: `#/watch/v1`, `#/profile/u3`, `#/search?q=italian`. `app.js` owns the router; `streamtube.js` rebuilds the route table once every view has registered, then re-renders. To add a page, write `window.viewSomething = function (route) { ... }` in `pages.js` and add the name to `boot.routes`. The `route` object carries `name`, `param` (the first path segment) and `params` (a `URLSearchParams` for the query string).

**State** lives in `Store` (`js/store.js`). Read it with `Store.state`, change it with `Store.update(function (state) { ... })`, which persists to localStorage and notifies subscribers. `Store.toggleInList("likedVideos", id)` is the shorthand for like, save and subscribe toggles, and returns `true` when the item was added.

**Thumbnails** come from `ST.paintArt(canvas, seed)` in `js/data.js`. A seeded PRNG drives a gradient, soft blobs, ribbons and a vignette, so the same seed always produces the same artwork. `UI.paintAll(root)` fills in every `<canvas data-seed="...">` inside a container after a render.

**Media playback** is simulated. There is no real `<video>` element behind the player: `setupPlayer()` in `app.js` runs a requestAnimationFrame loop that advances a timestamp, paints the scrub bar and writes progress into `Store.state.progress`.

---

## Known limitations

This is a front-end demo, so a few things are simulated rather than real:

- Video and audio are not decoded. The players draw Canvas artwork and run a timer; there is no media pipeline behind them.
- Uploads are metadata only. A chosen file is read for its name and size but never uploaded or stored; publishing creates a catalogue entry with generated artwork.
- Messages and notifications are local. The other participants are simulated with scripted replies, and nothing leaves the browser. There is no server, no account system and no authentication.
- Calls do not connect. The overlay, mute button and timer work, but no WebRTC session is opened and no microphone or camera permission is requested.
- Search is substring matching across titles, tags, categories and channel names, not a relevance-ranked index.

To make any of these real you would add a backend: object storage for uploads, a database for the catalogue and messages, WebSocket or WebRTC for realtime, and OAuth for accounts. The front end is structured so that `Store`, `data.js` and the render functions are the only pieces that would need to change.

---

## Browser support

The code uses CSS custom properties, `color-mix()`, CSS Grid, `aspect-ratio`, `IntersectionObserver`, `URLSearchParams` and the Clipboard API. It targets current versions of Chrome, Edge, Safari and Firefox. `IntersectionObserver` is required by the Shorts feed; everything else degrades gracefully.

## Licence

MIT.
