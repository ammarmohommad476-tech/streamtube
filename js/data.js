/* ============================================================
   data.js — seed data + procedural artwork helpers.
   No external assets: every thumbnail and short is drawn with
   Canvas, so the site works fully offline.
   ============================================================ */

const ST = {};

/* ---------- Procedural gradients ---------- */
ST.palettes = [
  ["#ff2d55", "#7b2ff7"],
  ["#00c9a7", "#005bea"],
  ["#f7971e", "#ffd200"],
  ["#8e2de2", "#4a00e0"],
  ["#ff512f", "#dd2476"],
  ["#11998e", "#38ef7d"],
  ["#fc466b", "#3f5efb"],
  ["#ff8008", "#ffc837"],
  ["#0575e6", "#021b79"],
  ["#f953c6", "#b91d73"],
  ["#ee0979", "#ff6a00"],
  ["#1fa2ff", "#12d8fa"]
];

ST.hashOf = function (str) {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
};

/* Small deterministic PRNG so artwork regenerates identically. */
ST.mulberry = function (a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/* Draw a deterministic abstract "thumbnail" onto a canvas.
   Seeded by a string, so a video always gets the same artwork. */
ST.paintArt = function (canvas, seed, opts) {
  opts = opts || {};
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = canvas.clientWidth || opts.w || 320;
  const h = canvas.clientHeight || opts.h || 180;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const seedNum = ST.hashOf(seed);
  const rand = ST.mulberry(seedNum);
  const pal = ST.palettes[seedNum % ST.palettes.length];

  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, pal[0]);
  g.addColorStop(1, pal[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Soft blobs
  for (let i = 0; i < 5; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 30 + rand() * Math.max(w, h) * 0.44;
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, "rgba(255,255,255,0.30)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Angular ribbons
  ctx.globalAlpha = 0.16;
  ctx.lineWidth = Math.max(1, h / 60);
  for (let i = 0; i < 9; i++) {
    ctx.strokeStyle = i % 2 ? "#ffffff" : "#000000";
    ctx.beginPath();
    ctx.moveTo(rand() * w, -h * 0.3);
    ctx.bezierCurveTo(rand() * w, h * 0.4, rand() * w, h * 0.6, rand() * w, h * 1.3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Vignette
  const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.78);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,0,0.42)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  if (opts.mono) {
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "hsl(0,0%,50%)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
  return canvas;
};

/* ---------- Creators ---------- */
ST.creators = [
  { id: "u1", handle: "@pixelpioneer", name: "Pixel Pioneer", subs: 1280000, verified: true, bio: "Cinematic travel films and colour-grading breakdowns. New video every Friday.\nBusiness: hello@pixelpioneer.tv", links: ["pixelpioneer.tv", "instagram.com/pixelpioneer"] },
  { id: "u2", handle: "@synthwavelab", name: "Synthwave Lab", subs: 742000, verified: true, bio: "Retro synth tutorials, patch walkthroughs and free sample packs.", links: ["synthwavelab.audio"] },
  { id: "u3", handle: "@chefmarco", name: "Chef Marco", subs: 2140000, verified: true, bio: "30-minute dinners that actually work. Naples to London.", links: ["chefmarco.cooking"] },
  { id: "u4", handle: "@driftwoodstudio", name: "Driftwood Studio", subs: 318000, verified: false, bio: "Hand-built furniture, woodworking ASMR, and honest tool reviews.", links: ["driftwood.works"] },
  { id: "u5", handle: "@nightowlcode", name: "Night Owl Code", subs: 906000, verified: true, bio: "Shipping real software at 2am. TypeScript, systems design, career talks.", links: ["nightowl.dev"] },
  { id: "u6", handle: "@aurorafit", name: "Aurora Fit", subs: 1560000, verified: true, bio: "Strength training for real humans. 20-minute sessions, zero fluff.", links: ["aurorafit.app"] },
  { id: "u7", handle: "@quietframes", name: "Quiet Frames", subs: 143000, verified: false, bio: "Slow films about ordinary places. Shot on a 1970s rangefinder.", links: ["quietframes.org"] },
  { id: "u8", handle: "@lumenlabs", name: "Lumen Labs", subs: 452000, verified: true, bio: "Science explainers with too many camera angle changes. Patreon in bio.", links: ["lumenlabs.io"] },
  { id: "you", handle: "@you", name: "Your Channel", subs: 1240, verified: false, bio: "This is your channel. Upload something and watch the numbers move.", links: ["example.com"] }
];

ST.creatorById = function (id) {
  return ST.creators.find(function (c) { return c.id === id; }) || ST.creators[ST.creators.length - 1];
};

/* ---------- Categories ---------- */
ST.categories = [
  "All", "Music", "Gaming", "Live", "Cooking", "Woodworking",
  "Technology", "Fitness", "Travel", "Film", "Science", "Podcasts"
];

/* ---------- Videos ---------- */
ST.videos = [
  { id: "v1", title: "I Shot Iceland With One Lens — Full Cinematic Breakdown", owner: "u1", cat: "Film", views: 2841003, duration: 1284, days: 3, likes: 184200, desc: "Ten days, one 35mm lens, and a very cold tripod. In this breakdown I walk through every location, the colour grade, and the two shots I ruined.\n\n00:00 Cold open\n01:42 Gear\n06:15 Locations\n14:03 The grade\n19:20 What I'd change", tags: ["cinematography", "iceland", "filmmaking"] },
  { id: "v2", title: "Building a $4,000 Synth Patch From Scratch", owner: "u2", cat: "Music", views: 512400, duration: 968, days: 1, likes: 42100, desc: "No presets, no shortcuts. Just two oscillators, a filter that fights back, and 16 minutes of modulation.\nPatch sheet in the description.", tags: ["synthwave", "sounddesign", "musicproduction"] },
  { id: "v3", title: "The 12-Minute Ragù That Tastes Like Sunday", owner: "u3", cat: "Cooking", views: 3910877, duration: 742, days: 6, likes: 289400, desc: "Yes, ragù takes four hours. This one doesn't, and it's still good. Here's the trick — it's the pressure cooker and a lot of patience with the soffritto.", tags: ["pasta", "recipe", "italian"] },
  { id: "v4", title: "Hand-Cutting Dovetails With Zero Power Tools", owner: "u4", cat: "Woodworking", views: 684120, duration: 1523, days: 12, likes: 58200, desc: "A quiet build, start to finish. Saw, chisel, mallet, and a lot of sharpening in between.", tags: ["woodworking", "joinery", "asmr"] },
  { id: "v5", title: "Why Your TypeScript Compiles Slowly (And How To Fix It)", owner: "u5", cat: "Technology", views: 412980, duration: 1156, days: 4, likes: 39800, desc: "I profiled a 400k-line monorepo until I understood every hot path. Skip to 09:12 if you just want the checklist.", tags: ["typescript", "performance", "devtools"] },
  { id: "v6", title: "20 Minute Full Body — No Equipment, No Jumping", owner: "u6", cat: "Fitness", views: 1920451, duration: 1382, days: 2, likes: 143900, desc: "Apartment-friendly, quiet, and genuinely hard by round three. Warm-up included, cool-down at 19:40.", tags: ["homeworkout", "strength", "fitness"] },
  { id: "v7", title: "A Slow Morning in a Town Nobody Visits", owner: "u7", cat: "Travel", views: 218740, duration: 1845, days: 9, likes: 21400, desc: "No narration. Just rain, a bakery, and an hour of walking. Best with headphones.", tags: ["slowcinema", "travel", "documentary"] },
  { id: "v8", title: "What Actually Happens Inside a Battery Fire", owner: "u8", cat: "Science", views: 1204830, duration: 894, days: 7, likes: 96700, desc: "We put six cells in a blast chamber and filmed at 2000fps. Thermal runaway, explained without the hand-waving.", tags: ["science", "batteries", "thermalrunaway"] },
  { id: "v9", title: "Ranking Every Camera I've Owned Since 2009", owner: "u1", cat: "Film", views: 906412, duration: 1671, days: 21, likes: 74200, desc: "Fourteen cameras. Some good, some expensive, one genuinely terrible. Timestamps for each below.", tags: ["cameras", "gear", "review"] },
  { id: "v10", title: "Mixing Live Synths With a Pedalboard Only", owner: "u2", cat: "Music", views: 173209, duration: 1012, days: 15, likes: 15200, desc: "No DAW, no laptop. Just a looper, four pedals, and a mixer.", tags: ["live", "pedals", "modular"] },
  { id: "v11", title: "One Pan, Seven Dinners — A Week of Prep", owner: "u3", cat: "Cooking", views: 2471033, duration: 1104, days: 30, likes: 198300, desc: "Sunday prep that doesn't taste like Sunday prep by Thursday. Shopping list pinned in the comments.", tags: ["mealprep", "cooking", "budget"] },
  { id: "v12", title: "Fixing the Chair I Ruined Two Years Ago", owner: "u4", cat: "Woodworking", views: 326511, duration: 1288, days: 40, likes: 29800, desc: "Epoxy was a mistake. Here's the honest repair, including the part where it cracked again.", tags: ["restoration", "woodworking", "mistakes"] },
  { id: "v13", title: "Live: Building an Entire App in One Sitting (Part 3)", owner: "u5", cat: "Technology", views: 88304, duration: 9420, days: 0, likes: 7100, live: true, desc: "Streaming until it ships. Auth, database, deploy. Chat picks the features.", tags: ["live", "coding", "build"] },
  { id: "v14", title: "Mobility Routine That Fixed My Desk Posture", owner: "u6", cat: "Fitness", views: 764219, duration: 726, days: 11, likes: 61900, desc: "Eight minutes, every morning, and my shoulders stopped living in my ears.", tags: ["mobility", "posture", "desk"] },
  { id: "v15", title: "We Measured the Speed of Smell (It's Weird)", owner: "u8", cat: "Science", views: 528330, duration: 812, days: 18, likes: 47300, desc: "An experiment we did not expect to work, and a result that nobody can fully explain yet.", tags: ["science", "experiment", "senses"] }
];

ST.videoById = function (id) {
  return ST.videos.find(function (v) { return v.id === id; }) || null;
};

/* ---------- Shorts ---------- */
ST.shorts = [
  { id: "s1", owner: "u1", caption: "The one lens trick nobody tells you about 🔭 #filmmaking", music: "Aurora Drift — Lumen Sound", likes: 184200, comments: 3120, shares: 8900, saves: 22100, views: 2840000 },
  { id: "s2", owner: "u2", caption: "This patch writes itself if you let it breathe #synthwave", music: "Neon Corridor — Synthwave Lab", likes: 96400, comments: 1840, shares: 4210, saves: 15600, views: 1204000 },
  { id: "s3", owner: "u3", caption: "Garlic. Butter. Pasta water. That's the whole secret.", music: "Kitchen Jazz — Chef Marco", likes: 421900, comments: 8740, shares: 21300, saves: 64100, views: 4810000 },
  { id: "s4", owner: "u6", caption: "Try this before you sit down tomorrow morning ☀️", music: "Morning Run — Aurora Fit", likes: 268300, comments: 4120, shares: 15800, saves: 47200, views: 3140000 },
  { id: "s5", owner: "u8", caption: "2000fps of something you should never do at home #science", music: "Deep Focus — Lumen Labs", likes: 132700, comments: 5210, shares: 11200, saves: 18400, views: 1780000 },
  { id: "s6", owner: "u4", caption: "The sound of a hand-cut dovetail at 4am 🤫", music: "Workshop Rain — Driftwood", likes: 74200, comments: 940, shares: 2380, saves: 11900, views: 690000 },
  { id: "s7", owner: "u5", caption: "3 seconds that saved my whole build #devtips", music: "Lofi Terminal — Night Owl", likes: 58900, comments: 1620, shares: 3410, saves: 14700, views: 812000 },
  { id: "s8", owner: "u7", caption: "Nothing happens in this clip. That's the point.", music: "Rain on Glass — Quiet Frames", likes: 41200, comments: 610, shares: 1290, saves: 7300, views: 402000 }
];

/* ---------- Comments ---------- */
ST.seedComments = {
  v1: [
    { id: "c1", user: "u3", text: "The 06:15 gear section is the most honest camera talk on this platform.", likes: 4210, hours: 2, replies: [
      { id: "c1r1", user: "u1", text: "Took three years to be willing to say it out loud.", likes: 890, hours: 1 }
    ]},
    { id: "c2", user: "u7", text: "That grade is gorgeous. Did you push the shadows or pull the mids?", likes: 1180, hours: 5 },
    { id: "c3", user: "u8", text: "Watching this on a phone screen and it still reads. That's the real test.", likes: 640, hours: 9 }
  ],
  v3: [
    { id: "c4", user: "u6", text: "Made this on Tuesday. My flatmate asked what restaurant it was from.", likes: 12900, hours: 4 },
    { id: "c5", user: "u4", text: "The soffritto patience is real. I rushed it once and never again.", likes: 3400, hours: 11 }
  ],
  v8: [
    { id: "c6", user: "u5", text: "Finally an explanation that doesn't hand-wave the separator.", likes: 5820, hours: 6 },
    { id: "c7", user: "u1", text: "The 2000fps footage is absurd. What camera was that?", likes: 2140, hours: 14 }
  ],
  v6: [
    { id: "c8", user: "u7", text: "Round 3 destroyed me and I was smug about round 1.", likes: 8730, hours: 3 }
  ]
};

/* ---------- DM seed threads ---------- */
ST.seedThreads = [
  { id: "t1", name: "Pixel Pioneer", kind: "dm", user: "u1", unread: 2, notes: "Editing all week ✂️", messages: [
    { id: "m1", mine: false, text: "Did you see the final cut I sent over?", mins: 240 },
    { id: "m2", mine: true, text: "Just watched it. The transition at 2:10 is unreal.", mins: 236 },
    { id: "m3", mine: false, text: "That's the one I was worried about 😅", mins: 120 },
    { id: "m4", mine: false, text: "Sending you the graded version tonight", mins: 118 }
  ]},
  { id: "t2", name: "Synthwave Lab", kind: "dm", user: "u2", unread: 0, notes: "", messages: [
    { id: "m5", mine: true, text: "Can I use that pad from your last video?", mins: 1500 },
    { id: "m6", mine: false, text: "Yes — credit me and it's yours.", mins: 1480 },
    { id: "m7", mine: false, text: "🎹", mins: 1479 }
  ]},
  { id: "t3", name: "Creator Collab 🎬", kind: "group", members: ["u1", "u3", "u6"], unread: 5, notes: "", messages: [
    { id: "m8", mine: false, text: "Who's free for the shoot on the 14th?", from: "Chef Marco", mins: 60 },
    { id: "m9", mine: false, text: "I can do the morning slot.", from: "Aurora Fit", mins: 55 },
    { id: "m10", mine: true, text: "Morning works. I'll bring the gimbal.", mins: 51 },
    { id: "m11", mine: false, text: "Perfect. Location pinned 📍", from: "Chef Marco", mins: 48 }
  ]},
  { id: "t4", name: "Night Owl Code", kind: "dm", user: "u5", unread: 0, notes: "Shipping at 2am", messages: [
    { id: "m12", mine: false, text: "Stream tonight? Part 4.", mins: 300 },
    { id: "m13", mine: true, text: "I'll be there. Bring the profiler.", mins: 291 }
  ]}
];

/* ---------- Notifications ---------- */
ST.seedNotifications = [
  { id: "n1", type: "upload", user: "u2", video: "v2", text: "uploaded <b>Building a $4,000 Synth Patch From Scratch</b>", hours: 1, unread: true },
  { id: "n2", type: "comment", user: "u6", text: "commented: <b>Round 3 destroyed me and I was smug about round 1.</b>", hours: 3, unread: true },
  { id: "n3", type: "like", user: "u3", text: "and <b>4,182 others</b> liked your comment", hours: 6, unread: true },
  { id: "n4", type: "follow", user: "u8", text: "started following you", hours: 20, unread: false },
  { id: "n5", type: "live", user: "u5", video: "v13", text: "is live now: <b>Building an Entire App in One Sitting</b>", hours: 24, unread: false },
  { id: "n6", type: "mention", user: "u1", text: "mentioned you in a post", hours: 40, unread: false }
];

/* ---------- Trending ---------- */
ST.trending = [
  { tag: "#cinematography", posts: 482000, cat: "Film" },
  { tag: "#synthwave", posts: 214000, cat: "Music" },
  { tag: "#30minutemeals", posts: 963000, cat: "Cooking" },
  { tag: "#handtools", posts: 128000, cat: "Woodworking" },
  { tag: "#typescript", posts: 341000, cat: "Technology" },
  { tag: "#homeworkout", posts: 1204000, cat: "Fitness" },
  { tag: "#slowcinema", posts: 47000, cat: "Film" },
  { tag: "#thermalrunaway", posts: 61000, cat: "Science" }
];

/* ---------- Music library for the editor ---------- */
ST.musicLibrary = [
  { id: "mu1", title: "Aurora Drift", artist: "Lumen Sound", mood: "Cinematic" },
  { id: "mu2", title: "Neon Corridor", artist: "Synthwave Lab", mood: "Synth" },
  { id: "mu3", title: "Kitchen Jazz", artist: "Chef Marco", mood: "Warm" },
  { id: "mu4", title: "Morning Run", artist: "Aurora Fit", mood: "Upbeat" },
  { id: "mu5", title: "Deep Focus", artist: "Lumen Labs", mood: "Ambient" },
  { id: "mu6", title: "Lofi Terminal", artist: "Night Owl Code", mood: "Lofi" }
];

/* ---------- Stickers / GIFs / filters ---------- */
ST.stickers = ["😄", "🔥", "😂", "❤️", "👏", "🎉", "🤯", "🥲"];
ST.gifs = [
  { id: "g1", label: "applause", seed: "gif-applause" },
  { id: "g2", label: "mind blown", seed: "gif-mindblown" },
  { id: "g3", label: "heart burst", seed: "gif-heart" },
  { id: "g4", label: "confetti", seed: "gif-confetti" }
];
ST.filters = ["None", "Mono", "Warm", "Cool", "Fade", "Vivid"];
ST.speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
ST.effects = ["None", "Glitch", "VHS", "Bloom", "Shake", "Strobe"];

/* ---------- Settings seed ---------- */
ST.defaultSettings = {
  theme: "dark",
  privateAccount: false,
  twoFactor: true,
  allowDMs: "everyone",
  allowMentions: "everyone",
  hideComments: false,
  pushEnabled: true,
  autoplay: true,
  altText: true,
  captionsOn: false,
  accountType: "creator"
};
