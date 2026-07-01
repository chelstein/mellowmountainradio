/* =========================================================
   KAZM / Mellow Mountain Radio - app shell + behavior
   - Persistent shell (header, footer, live player, podcast player)
   - Client-side router: <main> swaps via fetch, AUDIO NEVER STOPS
   - Link prefetch on hover for instant navigation
   - Live Now Playing / artwork / listeners (AzuraCast)
   - Live sports scoreboards, RSS feeds, podcasts, heritage rotator
   ========================================================= */
(function () {
  "use strict";

  var doc = document;

  var ICON_PLAY = '<svg class="ic-play" viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><path d="M232.4 114.5 88.3 26.6a16 16 0 0 0-24.3 13.5v175.8a16 16 0 0 0 24.3 13.5l144.1-87.9a15.9 15.9 0 0 0 0-27z"/></svg>';
  var ICON_PAUSE = '<svg class="ic-pause" viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><path d="M216 48v160a16 16 0 0 1-16 16h-40a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h40a16 16 0 0 1 16 16ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Z"/></svg>';

  var HEADER_HTML =
    '<header class="site-header" id="top" data-header><div class="header-inner">' +
      '<a class="brand" href="index.html" aria-label="KAZM Mellow Mountain Radio home">' +
        '<img src="Color%20logo%20-%20no%20background.svg" alt="KAZM 106.5 FM and 780 AM, Mellow Mountain Radio" class="brand-logo brand-logo--light" />' +
        '<img src="White%20logo%20-%20no%20background.svg" alt="" aria-hidden="true" class="brand-logo brand-logo--dark" />' +
      '</a>' +
      '<nav class="primary-nav" aria-label="Primary"><ul class="nav-list">' +
        '<li data-nav="home"><a href="index.html">Home</a></li>' +
        '<li class="has-menu" data-nav="news"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">News</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="news.html#local">Local News</a><a role="menuitem" href="news.html#national">National News</a><a role="menuitem" href="news.html#world">World News</a><a role="menuitem" href="news.html#traffic">Traffic &amp; Weather</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="sports"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Sports</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="sports.html#mlb">MLB &middot; Diamondbacks</a><a role="menuitem" href="sports.html#nba">NBA &middot; Suns</a><a role="menuitem" href="sports.html#nfl">NFL &middot; Cardinals</a><a role="menuitem" href="sports.html#college">College &middot; ASU, U of A, NAU</a><a role="menuitem" href="sports.html#ufc">UFC</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="music"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Music &amp; More</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="concerts.html">Concerts</a><a role="menuitem" href="movies.html">Movies</a><a role="menuitem" href="shows.html">Shows</a><a role="menuitem" href="podcasts.html">Podcasts</a><a role="menuitem" href="schedule.html">Program Schedule</a><a role="menuitem" href="contests.html">Contests</a><a role="menuitem" href="music.html">The Sound</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="events"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Events</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="library.html">Library Events</a><a role="menuitem" href="events.html#hiking">Hiking</a><a role="menuitem" href="events.html#biking">Mountain Biking</a><a role="menuitem" href="events.html#creek">Oak Creek</a><a role="menuitem" href="events.html#slide-rock">Slide Rock</a><a role="menuitem" href="events.html#ski">Ski Report</a><a role="menuitem" href="events.html#photography">Photography</a><a role="menuitem" href="events.html">All Adventures</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="about"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">About</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="about.html">About KAZM</a><a role="menuitem" href="archives.html">KAZM Archives</a><a role="menuitem" href="staff.html">Staff</a><a role="menuitem" href="vibe.html">The Vibe</a><a role="menuitem" href="contact.html">Contact</a>' +
        '</div></li>' +
        '<li data-nav="advertising"><a href="advertising.html">Advertising</a></li>' +
      '</ul></nav>' +
      '<div class="header-actions">' +
        '<button class="listen-btn" data-listen aria-pressed="false"><span class="listen-icon" aria-hidden="true">' + ICON_PLAY + ICON_PAUSE + '</span><span class="listen-label" data-listen-label>Listen Live</span></button>' +
        '<button class="menu-toggle" data-menu-toggle aria-expanded="false" aria-label="Open menu"><span></span><span></span><span></span></button>' +
      '</div>' +
    '</div></header>';

  var FOOTER_HTML =
    '<footer class="site-footer"><div class="wrap footer-grid">' +
      '<div class="footer-brand">' +
        '<img src="White%20logo%20-%20no%20background.svg" alt="KAZM 106.5 FM and 780 AM, Mellow Mountain Radio" class="footer-logo" />' +
        '<p class="footer-tag">The sound of Sedona since 1974. Soft oldies, yacht rock, and the news that matters here.</p>' +
        '<div class="social" aria-label="Social media">' +
          '<a href="https://www.facebook.com/profile.php?id=61552335103946" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z"/></svg></a>' +
          '<a href="https://www.instagram.com/mellowmountainradio/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44Z"/></svg></a>' +
          '<a href="https://www.youtube.com/channel/UCt3gbxEFSkV8roRdnqBefog" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.52A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.13c1.88.52 9.38.52 9.38.52s7.5 0 9.38-.52a3 3 0 0 0 2.12-2.13A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6Z"/></svg></a>' +
          '<a href="https://twitter.com/mellowmountain1" target="_blank" rel="noopener" aria-label="X"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M18.9 2H22l-7.1 8.1L23.3 22h-6.6l-5.2-6.8L5.6 22H2.5l7.6-8.7L1 2h6.8l4.7 6.2Zm-1.2 18h1.8L7.4 3.8H5.5Z"/></svg></a>' +
        '</div>' +
      '</div>' +
      '<nav class="footer-col" aria-label="Listen"><h4>Listen</h4><a href="index.html">Home</a><a href="concerts.html">Concerts</a><a href="movies.html">Movies</a><a href="shows.html">Shows</a><a href="schedule.html">Program Schedule</a><a href="music.html">Music &amp; More</a><a href="podcasts.html">Podcasts</a></nav>' +
      '<nav class="footer-col" aria-label="Community"><h4>Community</h4><a href="news.html">News</a><a href="sports.html">Sports</a><a href="news.html#traffic">Traffic &amp; Weather</a><a href="library.html">Library Events</a><a href="events.html">Events</a><a href="events.html#photography">Photography</a><a href="vibe.html">The Vibe</a><a href="contests.html">Contests</a></nav>' +
      '<nav class="footer-col" aria-label="Station"><h4>Station</h4><a href="about.html">About</a><a href="archives.html">KAZM Archives</a><a href="advertising.html">Advertising</a><a href="staff.html">Staff</a><a href="contact.html">Contact</a><a href="http://tee.pub/lic/XYLqEd6IJr8" target="_blank" rel="noopener">Merch</a></nav>' +
    '</div>' +
    '<div class="wrap footer-bottom">' +
      '<p class="footer-freq"><strong>106.5</strong> FM <span class="dot-sep" aria-hidden="true"></span> <strong>780</strong> AM <span class="dot-sep" aria-hidden="true"></span> Sedona, Arizona</p>' +
      '<nav class="footer-legal" aria-label="Legal"><a href="https://publicfiles.fcc.gov/am-profile/KAZM" target="_blank" rel="noopener">Public Inspection File</a><a href="https://publicfiles.fcc.gov/am-profile/KAZM/political-files" target="_blank" rel="noopener">Political File</a><a href="https://publicfiles.fcc.gov/am-profile/KAZM/applications-and-related-materials" target="_blank" rel="noopener">FCC Applications</a><a href="contact.html">Contact</a></nav>' +
      '<p class="footer-copy">&copy; <span data-year>2026</span> Cutter Grind Broadcasting LLC. All rights reserved.</p>' +
    '</div></footer>';

  var PLAYER_HTML =
    '<div class="player" data-player aria-live="polite">' +
      '<canvas class="player-viz" data-viz aria-hidden="true"></canvas>' +
      '<div class="player-inner wrap">' +
      '<div class="player-meta">' +
        '<img class="player-art" data-now-art src="Color%20logo%20-%20no%20background.svg" alt="" aria-hidden="true" />' +
        '<span class="player-eq eq" data-eq aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
        '<span class="player-onair"><span class="onair-dot" aria-hidden="true"></span> On air <span class="player-listeners" data-listeners></span></span>' +
        '<span class="player-track"><span class="player-title" data-now-track>Mellow Mountain Radio</span><span class="player-artist" data-now-artist>106.5 FM &amp; 780 AM</span></span>' +
      '</div>' +
      '<button class="player-btn" data-listen aria-pressed="false" aria-label="Play or pause the live stream">' + ICON_PLAY + ICON_PAUSE + '<span class="player-btn-label" data-listen-label>Listen Live</span></button>' +
    '</div></div>' +
    '<audio id="stream" preload="none" crossorigin="anonymous"><source src="https://streaming.mellowmountainradio.com/listen/mellowmountainradio/radio.mp3" type="audio/mpeg" /><source src="https://streaming.live365.com/a56104" type="audio/mpeg" /></audio>';

  /* ---------- shared PWA head tags (inject once, skip duplicates) ---------- */
  (function injectHead() {
    var head = doc.head;
    if (!head) return;
    function ensure(sel, make) { if (!doc.querySelector(sel)) head.appendChild(make()); }
    ensure('link[rel="manifest"]', function () { var l = doc.createElement("link"); l.rel = "manifest"; l.href = "/manifest.webmanifest"; return l; });
    ensure('meta[name="theme-color"]', function () { var m = doc.createElement("meta"); m.name = "theme-color"; m.content = "#223d6e"; return m; });
    ensure('link[rel="apple-touch-icon"]', function () { var l = doc.createElement("link"); l.rel = "apple-touch-icon"; l.href = "/icon-192.png"; return l; });
    ensure('meta[name="apple-mobile-web-app-capable"]', function () { var m = doc.createElement("meta"); m.name = "apple-mobile-web-app-capable"; m.content = "yes"; return m; });
    ensure('meta[name="mobile-web-app-capable"]', function () { var m = doc.createElement("meta"); m.name = "mobile-web-app-capable"; m.content = "yes"; return m; });
    ensure('meta[name="apple-mobile-web-app-status-bar-style"]', function () { var m = doc.createElement("meta"); m.name = "apple-mobile-web-app-status-bar-style"; m.content = "black-translucent"; return m; });
    ensure('meta[name="apple-mobile-web-app-title"]', function () { var m = doc.createElement("meta"); m.name = "apple-mobile-web-app-title"; m.content = "KAZM"; return m; });
  })();

  /* ---------- inject persistent shell (once) ---------- */
  var headerSlot = doc.querySelector("[data-site-header]");
  if (headerSlot) headerSlot.innerHTML = HEADER_HTML;
  var footerSlot = doc.querySelector("[data-site-footer]");
  if (footerSlot) footerSlot.innerHTML = FOOTER_HTML;
  if (!doc.querySelector("[data-player]")) doc.body.insertAdjacentHTML("beforeend", PLAYER_HTML);

  var yearEl = doc.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  function updateNavActive(key) {
    doc.querySelectorAll(".nav-list .nav-current").forEach(function (li) { li.classList.remove("nav-current"); });
    if (key) { var li = doc.querySelector('.nav-list [data-nav="' + key + '"]'); if (li) li.classList.add("nav-current"); }
  }
  updateNavActive(doc.body.getAttribute("data-page"));

  /* ---------- sticky header ---------- */
  var header = doc.querySelector("[data-header]");
  function onScroll() { if (header) header.classList.toggle("scrolled", window.scrollY > 24); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile menu + dropdowns (persistent header, bind once) ---------- */
  var menuToggle = doc.querySelector("[data-menu-toggle]");
  var nav = doc.querySelector(".primary-nav");
  function closeNav() { if (nav) nav.classList.remove("open"); if (menuToggle) menuToggle.setAttribute("aria-expanded", "false"); doc.body.style.overflow = ""; }
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
      doc.body.style.overflow = open ? "hidden" : "";
    });
  }
  function closeMegas() {
    doc.querySelectorAll(".mega.open").forEach(function (m) {
      m.classList.remove("open");
      var t = m.previousElementSibling;
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }
  doc.querySelectorAll(".nav-trigger").forEach(function (trigger) {
    var menu = trigger.nextElementSibling;
    trigger.addEventListener("click", function () {
      var isOpen = menu.classList.contains("open");
      doc.querySelectorAll(".mega.open").forEach(function (m) { if (m !== menu) { m.classList.remove("open"); var t = m.previousElementSibling; if (t) t.setAttribute("aria-expanded", "false"); } });
      menu.classList.toggle("open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
    });
  });
  doc.addEventListener("click", function (e) { if (!e.target.closest(".has-menu")) closeMegas(); });
  // close the dropdowns + mobile menu after any nav link is followed (fixes stuck-open menu)
  doc.querySelectorAll(".mega a, .nav-list > li > a").forEach(function (a) {
    a.addEventListener("click", function () { closeMegas(); closeNav(); });
  });
  doc.addEventListener("keydown", function (e) { if (e.key === "Escape") { closeMegas(); closeNav(); } });

  /* =========================================================
     LIVE STREAM PLAYER (persistent)
     ========================================================= */
  var audio = doc.getElementById("stream");
  var player = doc.querySelector("[data-player]");
  var playing = false;
  var DEFAULT_TITLE = doc.title;
  var lastNow = null;

  function setLabel(t) { doc.querySelectorAll("[data-listen-label]").forEach(function (l) { l.textContent = t; }); }
  function syncListenUI() {
    doc.querySelectorAll("[data-listen]").forEach(function (b) { b.classList.toggle("is-playing", playing); b.setAttribute("aria-pressed", String(playing)); });
    setLabel(playing ? "Pause" : "Listen Live");
  }
  function updateTabTitle() {
    document.title = (playing && lastNow) ? "▶ " + lastNow.artist + " · " + lastNow.title + " | KAZM" : DEFAULT_TITLE;
  }
  function setPlayingState(state) {
    playing = state;
    doc.body.classList.toggle("is-playing", state);
    if (player) { player.classList.add("show"); doc.body.classList.add("has-player"); }
    syncListenUI();
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state ? "playing" : "paused";
    updateTabTitle();
  }
  function togglePlay() {
    if (!audio) return;
    if (player) { player.classList.add("show"); doc.body.classList.add("has-player"); }
    if (playing) { audio.pause(); return; }
    setupAudioGraph();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    setLabel("Connecting...");
    var p = audio.play();
    if (p && p.catch) p.catch(function () { setLabel("Listen Live"); });
  }
  if (audio) {
    audio.addEventListener("playing", function () { setPlayingState(true); startViz(); if (typeof cxStop === "function") cxStop(); });
    audio.addEventListener("pause", function () { setPlayingState(false); stopViz(); });
    audio.addEventListener("error", function () { setPlayingState(false); stopViz(); setLabel("Listen Live"); });
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", function () { audio.play(); });
        navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
        navigator.mediaSession.setActionHandler("stop", function () { audio.pause(); });
      } catch (e) {}
    }
  }
  // delegated controls so in-page Listen buttons work after navigation
  doc.addEventListener("click", function (e) { if (e.target.closest("[data-listen]")) { e.preventDefault(); togglePlay(); } });
  doc.addEventListener("keydown", function (e) {
    var tag = (e.target && e.target.tagName) || "";
    if ((e.code === "Space" || e.key === " ") && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) { e.preventDefault(); togglePlay(); }
  });

  /* =========================================================
     LIVE AUDIO VISUALIZER (real Web Audio spectrum off the stream)
     Reads the actual on-air signal via an AnalyserNode. If the stream
     ever comes back CORS-tainted (all-zero data), we quietly fall back
     to the decorative CSS bars — we never fake a "real" spectrum.
     ========================================================= */
  var viz = doc.querySelector("[data-viz]");
  var eqBars = doc.querySelectorAll("[data-eq] i");
  var audioCtx = null, analyser = null, srcNode = null, freqData = null, rafId = null;
  var vizReal = false;      // have we ever seen non-zero spectrum data?
  var vizChecked = 0;       // frames observed while playing (to detect a tainted stream)

  function setupAudioGraph() {
    if (audioCtx || !audio || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      srcNode = audioCtx.createMediaElementSource(audio);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.78;
      srcNode.connect(analyser);
      analyser.connect(audioCtx.destination);
      freqData = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { audioCtx = null; analyser = null; }
  }

  function drawViz() {
    if (!analyser || !playing) { rafId = null; return; }
    rafId = window.requestAnimationFrame(drawViz);
    analyser.getByteFrequencyData(freqData);
    // detect a genuinely-decoding stream vs. a silent/tainted one
    var sum = 0, n = freqData.length, i;
    for (i = 0; i < n; i++) sum += freqData[i];
    if (sum > 0) { vizReal = true; doc.body.classList.add("viz-live"); }
    if (!vizReal) { vizChecked++; if (vizChecked > 180) { doc.body.classList.remove("viz-live"); return; } }

    // drive the 5 header eq bars off real low-to-high bands
    if (eqBars.length && vizReal) {
      for (i = 0; i < eqBars.length; i++) {
        var idx = Math.floor((i + 0.5) / eqBars.length * n * 0.7);
        var mag = freqData[idx] / 255;
        eqBars[i].style.height = (5 + mag * 15).toFixed(1) + "px";
        eqBars[i].style.opacity = (0.45 + mag * 0.55).toFixed(2);
      }
    }
    // full spectrum on the canvas backdrop
    if (viz && vizReal) {
      var ctx = viz._c || (viz._c = viz.getContext("2d"));
      var w = viz.width, h = viz.height;
      ctx.clearRect(0, 0, w, h);
      var bars = n, bw = w / bars;
      for (i = 0; i < bars; i++) {
        var v = freqData[i] / 255;
        var bh = v * h;
        var alpha = 0.16 + v * 0.5;
        ctx.fillStyle = "rgba(224, 168, 90, " + alpha.toFixed(3) + ")";
        ctx.fillRect(i * bw, h - bh, bw + 0.6, bh);
      }
    }
  }

  function sizeViz() {
    if (!viz) return;
    var rect = viz.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    viz.width = Math.max(1, Math.round((rect.width || viz.clientWidth || 480) * dpr));
    viz.height = Math.max(1, Math.round((rect.height || 44) * dpr));
    viz._c = null;
  }
  window.addEventListener("resize", sizeViz, { passive: true });

  function startViz() {
    setupAudioGraph();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    sizeViz();
    if (!rafId) drawViz();
  }
  function stopViz() {
    if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
    doc.body.classList.remove("viz-live");
    for (var i = 0; i < eqBars.length; i++) { eqBars[i].style.height = ""; eqBars[i].style.opacity = ""; }
  }

  /* =========================================================
     NOW PLAYING / ARTWORK / LISTENERS (AzuraCast, persistent poll)
     ========================================================= */
  var NOWPLAYING_API = "https://streaming.mellowmountainradio.com/api/nowplaying/mellowmountainradio";
  var LOGO_FALLBACK = "Color%20logo%20-%20no%20background.svg";
  var APPLE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M17.05 12.04c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.69 2.36 2.89 2.31 1.16-.05 1.6-.75 3-.75 1.4 0 1.8.75 3.02.72 1.25-.02 2.04-1.13 2.8-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.44-3.69zM14.79 5.3c.64-.78 1.07-1.86.95-2.94-.92.04-2.04.61-2.7 1.39-.59.69-1.11 1.79-.97 2.85 1.03.08 2.08-.52 2.72-1.3z"/></svg>';
  var artCache = {};
  var lastNowData = null;

  function setAll(selector, text) { if (text == null) return; doc.querySelectorAll(selector).forEach(function (n) { n.textContent = text; }); }
  function setListeners(n) {
    doc.querySelectorAll("[data-listeners]").forEach(function (el) {
      if (n && n > 0) { el.textContent = n + " listening"; el.classList.add("show"); }
      else { el.textContent = ""; el.classList.remove("show"); }
    });
  }
  function fetchArtwork(artist, title) {
    var key = (artist || "") + "|" + (title || "");
    if (artCache[key] !== undefined) return Promise.resolve(artCache[key]);
    var term = ((artist || "") + " " + (title || "")).trim();
    if (!term) return Promise.resolve(null);
    return fetch("https://itunes.apple.com/search?term=" + encodeURIComponent(term) + "&entity=song&limit=1")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var res = d && d.results && d.results[0];
        var meta = { art: res && res.artworkUrl100 ? res.artworkUrl100.replace("100x100", "512x512") : null, album: res && res.collectionName ? res.collectionName : null };
        artCache[key] = meta; return meta;
      })
      .catch(function () { artCache[key] = { art: null, album: null }; return artCache[key]; });
  }
  function applyNowArt(url) {
    doc.querySelectorAll("[data-now-art]").forEach(function (img) {
      if (url) {
        img.onerror = function () { img.onerror = null; img.src = LOGO_FALLBACK; img.classList.remove("is-art"); };
        img.src = url; img.classList.add("is-art");
      } else { img.src = LOGO_FALLBACK; img.classList.remove("is-art"); }
    });
  }
  function appleMusicUrl(artist, title) {
    var term = ((artist || "") + " " + (title || "")).trim();
    return "https://music.apple.com/us/search?term=" + encodeURIComponent(term);
  }
  function renderHistory(history) {
    var historyEl = doc.querySelector("[data-history]");
    if (!historyEl || !history || !history.length) return;
    var frag = doc.createDocumentFragment();
    history.slice(0, 8).forEach(function (item) {
      var song = item.song || {};
      var li = doc.createElement("li");
      var a = doc.createElement("a");
      a.className = "recent-card"; a.href = appleMusicUrl(song.artist, song.title); a.target = "_blank"; a.rel = "noopener";
      a.setAttribute("aria-label", "Find " + (song.title || "this track") + " by " + (song.artist || "") + " on Apple Music");
      var art = doc.createElement("span"); art.className = "recent-art";
      (function (artEl, s) {
        fetchArtwork(s.artist, s.title).then(function (meta) { var u = (meta && meta.art) || s.art; if (u) { artEl.style.backgroundImage = "url('" + u + "')"; artEl.classList.add("has-art"); } });
      })(art, song);
      var badge = doc.createElement("span"); badge.className = "recent-apple"; badge.innerHTML = APPLE_SVG; art.appendChild(badge);
      var meta = doc.createElement("span"); meta.className = "recent-meta";
      var t = doc.createElement("span"); t.className = "recent-title"; t.textContent = song.title || "Unknown";
      var ar = doc.createElement("span"); ar.className = "recent-artist"; ar.textContent = song.artist || "";
      meta.appendChild(t); meta.appendChild(ar);
      a.appendChild(art); a.appendChild(meta); li.appendChild(a); frag.appendChild(li);
    });
    historyEl.innerHTML = ""; historyEl.appendChild(frag);
  }
  function renderNow(data) {
    if (!data) return;
    var song = data.now_playing && data.now_playing.song;
    if (song) {
      setAll("[data-now-track]", song.title || "Mellow Mountain Radio");
      setAll("[data-now-artist]", song.artist || "106.5 FM & 780 AM");
      lastNow = { title: song.title || "Mellow Mountain Radio", artist: song.artist || "KAZM" };
      highlightOnAir(song.artist);
      updateTabTitle();
      fetchArtwork(song.artist, song.title).then(function (meta) {
        var artUrl = (meta && meta.art) || song.art || null;
        applyNowArt(artUrl);
        var album = song.album || (meta && meta.album) || "";
        setAll("[data-now-album]", album ? "from " + album : "");
        if ("mediaSession" in navigator && window.MediaMetadata && playing) {
          navigator.mediaSession.metadata = new MediaMetadata({ title: lastNow.title, artist: lastNow.artist, album: album || "Mellow Mountain Radio", artwork: [{ src: artUrl || "Color%20logo%20with%20background.png", sizes: "512x512", type: "image/jpeg" }] });
        }
      });
    }
    var lc = data.listeners ? (data.listeners.current != null ? data.listeners.current : data.listeners.total) : null;
    setListeners(lc);
    renderHistory(data.song_history);
  }
  function fetchNowPlaying() {
    fetch(NOWPLAYING_API, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("np " + r.status); return r.json(); })
      .then(function (data) { lastNowData = data; renderNow(data); })
      .catch(function () { /* keep last-known on screen */ });
  }
  fetchNowPlaying();
  setInterval(fetchNowPlaying, 20000);

  /* =========================================================
     PODCAST PLAYER (persistent) + browser (re-rendered per page)
     ========================================================= */
  var PI = {
    play: '<svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true"><path d="M232.4 114.5 88.3 26.6a16 16 0 0 0-24.3 13.5v175.8a16 16 0 0 0 24.3 13.5l144.1-87.9a15.9 15.9 0 0 0 0-27z"/></svg>',
    pause: '<svg viewBox="0 0 256 256" width="20" height="20" aria-hidden="true"><path d="M200 32h-40a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Zm-104 0H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Z"/></svg>',
    back: '<svg viewBox="0 0 256 256" width="16" height="16" aria-hidden="true"><path d="M224 128a8 8 0 0 1-8 8H59.3l58.4 58.3a8 8 0 0 1-11.4 11.4l-72-72a8 8 0 0 1 0-11.4l72-72a8 8 0 0 1 11.4 11.4L59.3 120H216a8 8 0 0 1 8 8Z"/></svg>',
    b15: '<svg viewBox="0 0 256 256" width="22" height="22" aria-hidden="true"><path d="M128 64V24L72 80l56 56V96a56 56 0 1 1-56 56 8 8 0 0 0-16 0 72 72 0 1 0 72-72Z"/></svg>',
    f15: '<svg viewBox="0 0 256 256" width="22" height="22" aria-hidden="true"><path d="M128 64V24l56 56-56 56V96a56 56 0 1 0 56 56 8 8 0 0 1 16 0 72 72 0 1 1-72-72Z"/></svg>',
    close: '<svg viewBox="0 0 256 256" width="18" height="18" aria-hidden="true"><path d="M205.7 194.3a8 8 0 0 1-11.4 11.4L128 139.3l-66.3 66.4a8 8 0 0 1-11.4-11.4L116.7 128 50.3 61.7a8 8 0 0 1 11.4-11.4L128 116.7l66.3-66.4a8 8 0 0 1 11.4 11.4L139.3 128Z"/></svg>'
  };
  var STATION_API = "https://streaming.mellowmountainradio.com/api/station/mellowmountainradio/public/podcasts";
  var podAudio = new Audio();
  podAudio.preload = "metadata";
  if (audio) audio.addEventListener("play", function () { podAudio.pause(); });

  var podBar = doc.createElement("div");
  podBar.className = "podplayer";
  podBar.setAttribute("aria-live", "polite");
  podBar.innerHTML =
    '<div class="podplayer-inner">' +
      '<div class="podplayer-now"><img class="podplayer-art" alt="" /><div style="min-width:0"><div class="podplayer-title"></div><div class="podplayer-pod"></div></div></div>' +
      '<div class="podplayer-center"><div class="podplayer-controls">' +
        '<button class="pp-b15" aria-label="Back 15 seconds">' + PI.b15 + '</button>' +
        '<button class="pp-main" aria-label="Play or pause">' + PI.play + '</button>' +
        '<button class="pp-f15" aria-label="Forward 15 seconds">' + PI.f15 + '</button>' +
      '</div><div class="podplayer-seek"><span class="pp-time pp-cur">0:00</span><input class="pp-range" type="range" min="0" max="100" value="0" aria-label="Seek" /><span class="pp-time pp-dur">0:00</span></div></div>' +
      '<div class="podplayer-actions"><button class="pp-speed" aria-label="Playback speed">1x</button><button class="pp-close" aria-label="Close podcast player">' + PI.close + '</button></div>' +
    '</div>';
  doc.body.appendChild(podBar);

  var pElArt = podBar.querySelector(".podplayer-art"), pElTitle = podBar.querySelector(".podplayer-title"), pElPod = podBar.querySelector(".podplayer-pod");
  var pBtnMain = podBar.querySelector(".pp-main"), pBtnB = podBar.querySelector(".pp-b15"), pBtnF = podBar.querySelector(".pp-f15");
  var pBtnSpeed = podBar.querySelector(".pp-speed"), pBtnClose = podBar.querySelector(".pp-close");
  var pRange = podBar.querySelector(".pp-range"), pElCur = podBar.querySelector(".pp-cur"), pElDur = podBar.querySelector(".pp-dur");
  var pSeeking = false, pSpeeds = [1, 1.25, 1.5, 2], pSi = 0;
  var podRoot = null, pods = [], epCache = {};
  var pCur = { eps: null, idx: -1, podTitle: "" };

  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function fmt(t) { if (!t || isNaN(t) || !isFinite(t)) return "0:00"; t = Math.floor(t); var h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60; return h ? h + ":" + pad(m) + ":" + pad(s) : m + ":" + pad(s); }
  function pSetIcon() { pBtnMain.innerHTML = podAudio.paused ? PI.play : PI.pause; }

  pBtnMain.addEventListener("click", function () { if (podAudio.paused) podAudio.play(); else podAudio.pause(); });
  pBtnB.addEventListener("click", function () { podAudio.currentTime = Math.max(0, podAudio.currentTime - 15); });
  pBtnF.addEventListener("click", function () { podAudio.currentTime = Math.min(podAudio.duration || 0, podAudio.currentTime + 15); });
  pBtnSpeed.addEventListener("click", function () { pSi = (pSi + 1) % pSpeeds.length; podAudio.playbackRate = pSpeeds[pSi]; pBtnSpeed.textContent = pSpeeds[pSi] + "x"; });
  pBtnClose.addEventListener("click", function () { podAudio.pause(); podBar.classList.remove("show"); doc.body.classList.remove("podplaying"); });
  podAudio.addEventListener("play", function () { if (audio) audio.pause(); doc.body.classList.add("podplaying"); pSetIcon(); });
  podAudio.addEventListener("pause", pSetIcon);
  podAudio.addEventListener("loadedmetadata", function () { pRange.max = Math.floor(podAudio.duration || 0); pElDur.textContent = fmt(podAudio.duration); });
  podAudio.addEventListener("timeupdate", function () { if (!pSeeking) { pRange.value = Math.floor(podAudio.currentTime); pElCur.textContent = fmt(podAudio.currentTime); } });
  podAudio.addEventListener("ended", function () { playIndex(pCur.idx + 1); });
  pRange.addEventListener("input", function () { pSeeking = true; pElCur.textContent = fmt(+pRange.value); });
  pRange.addEventListener("change", function () { podAudio.currentTime = +pRange.value; pSeeking = false; });

  function podMedia(ep) {
    if (!("mediaSession" in navigator) || !window.MediaMetadata) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: ep.title || "Episode", artist: pCur.podTitle, album: "Mellow Mountain Radio", artwork: [{ src: ep.art || "", sizes: "512x512", type: "image/jpeg" }] });
    try {
      navigator.mediaSession.setActionHandler("play", function () { podAudio.play(); });
      navigator.mediaSession.setActionHandler("pause", function () { podAudio.pause(); });
      navigator.mediaSession.setActionHandler("seekbackward", function () { podAudio.currentTime = Math.max(0, podAudio.currentTime - 15); });
      navigator.mediaSession.setActionHandler("seekforward", function () { podAudio.currentTime += 15; });
      navigator.mediaSession.setActionHandler("nexttrack", function () { playIndex(pCur.idx + 1); });
      navigator.mediaSession.setActionHandler("previoustrack", function () { playIndex(pCur.idx - 1); });
    } catch (e) {}
  }
  function playIndex(idx) {
    if (!pCur.eps || idx < 0 || idx >= pCur.eps.length) return;
    pCur.idx = idx; var ep = pCur.eps[idx];
    podAudio.src = ep.audio; podAudio.playbackRate = pSpeeds[pSi];
    pElArt.src = ep.art || ""; pElTitle.textContent = ep.title || "Episode"; pElPod.textContent = pCur.podTitle;
    podBar.classList.add("show"); podMedia(ep); podAudio.play();
    if (podRoot) podRoot.querySelectorAll(".pod-ep").forEach(function (r) { r.classList.toggle("is-active", r.getAttribute("data-idx") === String(idx)); });
  }
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function fmtDate(ts) { if (!ts) return ""; var d = new Date(ts * 1000); return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function podGrid() {
    if (!podRoot) return;
    var h = '<div class="pod-grid">';
    pods.forEach(function (p) {
      h += '<button type="button" class="pod-card" data-pod="' + p.id + '">' +
        '<img class="pod-cover" loading="lazy" alt="' + esc(p.title) + ' cover" src="' + (p.art || "") + '" />' +
        '<div class="pod-card-body"><span class="pod-author">' + esc(p.author || "Mellow Mountain Radio") + '</span>' +
        '<h3>' + esc(p.title) + '</h3><p class="pod-desc">' + esc(p.description_short || p.description || "") + '</p>' +
        '<span class="pod-count">' + (typeof p.episodes === "number" ? p.episodes + " episodes" : "Listen") + '</span></div></button>';
    });
    h += '</div>';
    podRoot.innerHTML = h;
    podRoot.querySelectorAll(".pod-card").forEach(function (c) { c.addEventListener("click", function () { openPodcast(c.getAttribute("data-pod")); var y = podRoot.getBoundingClientRect().top + window.scrollY - 90; window.scrollTo({ top: y, behavior: "smooth" }); }); });
  }
  function podBackBtn() { var b = podRoot && podRoot.querySelector(".pod-back"); if (b) b.addEventListener("click", podGrid); }
  function openPodcast(id) {
    var p = pods.filter(function (x) { return x.id === id; })[0]; if (!p || !podRoot) return;
    if (epCache[id]) return podDetail(p, epCache[id]);
    podRoot.innerHTML = '<button type="button" class="pod-back">' + PI.back + ' All podcasts</button><p class="rss-loading">Loading episodes...</p>';
    podBackBtn();
    var url = (p.links && p.links.episodes) || "";
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      var eps = data.map(function (e) { return { id: e.id, title: e.title, date: e.publish_at, art: e.art || p.art, audio: (e.links && e.links.download) || "" }; })
        .filter(function (e) { return e.audio; }).sort(function (a, b) { return (b.date || 0) - (a.date || 0); });
      epCache[id] = eps; podDetail(p, eps);
    }).catch(function () { if (podRoot) { podRoot.innerHTML = '<button type="button" class="pod-back">' + PI.back + ' All podcasts</button><p class="embed-note">Could not load episodes.</p>'; podBackBtn(); } });
  }
  function podDetail(p, eps) {
    if (!podRoot) return;
    var h = '<button type="button" class="pod-back">' + PI.back + ' All podcasts</button>' +
      '<div class="pod-detail-head"><img class="pod-cover" alt="' + esc(p.title) + ' cover" src="' + (p.art || "") + '" />' +
      '<div class="pod-detail-meta"><span class="pod-author">' + esc(p.author || "Mellow Mountain Radio") + '</span>' +
      '<h2>' + esc(p.title) + '</h2><p class="pod-desc">' + esc(p.description || p.description_short || "") + '</p>' +
      '<button type="button" class="btn btn-primary pod-playlatest">' + PI.play + ' Play latest episode</button></div></div><div class="pod-eps">';
    eps.forEach(function (e, i) {
      h += '<div class="pod-ep" data-idx="' + i + '"><button type="button" class="pod-ep-play" aria-label="Play ' + esc(e.title) + '">' + PI.play + '</button>' +
        '<div class="pod-ep-main"><div class="pod-ep-title">' + esc(e.title) + '</div><div class="pod-ep-date">' + fmtDate(e.date) + '</div></div></div>';
    });
    h += '</div>';
    podRoot.innerHTML = h;
    pCur.eps = eps; pCur.podTitle = p.title;
    podBackBtn();
    var pl = podRoot.querySelector(".pod-playlatest");
    if (pl) pl.addEventListener("click", function () { playIndex(0); });
    podRoot.querySelectorAll(".pod-ep").forEach(function (row) { row.querySelector(".pod-ep-play").addEventListener("click", function () { playIndex(+row.getAttribute("data-idx")); }); });
  }
  function renderPodcasts() {
    podRoot = doc.querySelector("[data-podcasts]");
    if (!podRoot) return;
    if (pods.length) { podGrid(); return; }
    podRoot.innerHTML = '<p class="rss-loading">Loading podcasts...</p>';
    fetch(STATION_API).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (data) { pods = data.filter(function (p) { return p.is_enabled !== false; }); podGrid(); })
      .catch(function () { if (podRoot) podRoot.innerHTML = '<p class="embed-note">Podcasts are unavailable right now. Please try again soon.</p>'; });
  }

  /* =========================================================
     PAGE MODULES (re-runnable on every navigation)
     ========================================================= */
  function initReveal() {
    var reveals = doc.querySelectorAll(".reveal:not(.in)");
    if ("IntersectionObserver" in window && reveals.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add("in"); io.unobserve(entry.target); } });
      }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
      reveals.forEach(function (el) { io.observe(el); });
    } else { reveals.forEach(function (el) { el.classList.add("in"); }); }
  }

  // ---- Station-owned data layer ------------------------------------
  // Feeds are addressed by stable KEY, not by third-party URL. Once the
  // feed-proxy workflow (see n8n/feed-proxy.workflow.json) is imported and
  // active, every feed is served from our own n8n (CORS-open) and the upstream
  // source can be re-pointed server-side with no site deploy. Until then,
  // fetchFeed transparently falls back to direct fetch + allorigins, so the
  // site works the same before and after the workflow goes live.
  var FEED_PROXY = "https://n8n.mellowmountainradio.com/webhook/feed"; // ?src=<key>
  var FEEDS = {
    "news-local":      "https://rss.app/feeds/waKD0IO27DoomK78.xml",
    "news-national":   "https://rss.app/feeds/qAIOV2Ax8y6Qx7VS.xml",
    "news-world":      "https://rss.app/feeds/ULxiZm9ozY2weGgi.xml",
    "sports-az":       "https://news.google.com/rss/search?q=%28Arizona%20Diamondbacks%29%20OR%20%28Arizona%20Cardinals%29%20OR%20%28Phoenix%20Suns%29%20OR%20%28Arizona%20Wildcats%29%20OR%20%28Arizona%20State%20Sun%20Devils%29%20when%3A7d&hl=en-US&gl=US&ceid=US:en",
    "sports-national": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en"
  };

  // ---- Live Arizona scoreboards (ESPN public API, CORS-open) --------
  // One call per team for record + division standing + next/live game, plus the
  // league scoreboard for accurate live scores. No proxy needed (ESPN sends
  // Access-Control-Allow-Origin: *). Auto-refreshes while a game is in progress.
  var ESPN = "https://site.api.espn.com/apis/site/v2/sports/";
  var AZ_TEAMS = [
    { label: "MLB", league: "baseball/mlb",   id: 29, abbr: "ARI", foot: "Diamondbacks baseball, live on 780 AM" },
    { label: "NFL", league: "football/nfl",   id: 22, abbr: "ARI", foot: "Cardinals football, Red Sea all day" },
    { label: "NBA", league: "basketball/nba", id: 21, abbr: "PHX", foot: "Suns basketball, tip-off coverage" }
  ];
  // Arizona college football (ESPN ids). nextEvent is null deep in the offseason,
  // so the loader also pulls the published season schedule to surface the next game.
  var COLLEGE_TEAMS = [
    { label: "Big 12",  league: "football/college-football", id: 9,    abbr: "ASU",  foot: "Sun Devils football on KAZM" },
    { label: "Big 12",  league: "football/college-football", id: 12,   abbr: "ARIZ", foot: "Arizona Wildcats on the call" },
    { label: "Big Sky", league: "football/college-football", id: 2464, abbr: "NAU",  foot: "NAU Lumberjacks, Flagstaff's team" }
  ];
  var COLLEGE_BB_TEAMS = [
    { label: "Big 12",  league: "basketball/mens-college-basketball", id: 9,    abbr: "ASU",  foot: "Sun Devils hoops on KAZM" },
    { label: "Big 12",  league: "basketball/mens-college-basketball", id: 12,   abbr: "ARIZ", foot: "Wildcats basketball, McKale magic" },
    { label: "Big Sky", league: "basketball/mens-college-basketball", id: 2464, abbr: "NAU",  foot: "Lumberjacks hoops from Flagstaff" }
  ];
  // Division standings (level=3 nests conference -> division). title is for the header.
  var ESPN_STD = "https://site.api.espn.com/apis/v2/sports/";
  var STANDINGS = [
    { league: "baseball/mlb",   abbr: "ARI", title: "NL West" },
    { league: "football/nfl",   abbr: "ARI", title: "NFC West" },
    { league: "basketball/nba", abbr: "PHX", title: "Pacific" }
  ];
  var sbTimer = null;

  function azDateTime(iso) {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch (e) { return ""; }
  }
  function gameDate(iso) {
    if (!iso) return "";
    try { var d = new Date(iso), o = { timeZone: "America/Phoenix", month: "short", day: "numeric" };
      if (d.getFullYear() !== new Date().getFullYear()) o.year = "numeric";
      return d.toLocaleDateString("en-US", o);
    } catch (e) { return ""; }
  }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }
  function compScore(c) { if (!c || c.score == null) return null; return typeof c.score === "object" ? (c.score.displayValue || c.score.value) : String(c.score); }
  function teamLogo(t) { return (t && (t.logo || (t.logos && t.logos[0] && t.logos[0].href))) || ""; }
  function logoImg(t, cls) { return '<img class="' + cls + '" src="' + esc(teamLogo(t)) + '" alt="" onerror="this.style.visibility=\'hidden\'" />'; }

  function teamRow(c, lead) {
    var sc = compScore(c);
    return '<li class="g-row' + (lead ? " is-lead" : "") + '">' + logoImg(c.team, "g-logo") +
      '<span class="g-abbr">' + esc(c.team.abbreviation || "") + '</span>' +
      (sc != null ? '<span class="g-score">' + esc(sc) + '</span>' : '') + '</li>';
  }
  function gameModule(comp) {
    if (!comp) return '<div class="g-state g-state--off">Off the schedule</div><p class="g-note">We carry every game on 780 AM &mdash; check back when the next one is set.</p>';
    var st = (comp.status && comp.status.type) || {};
    var state = st.state, detail = st.shortDetail || "";
    var cs = comp.competitors || [];
    var home = cs.filter(function (c) { return c.homeAway === "home"; })[0] || cs[0];
    var away = cs.filter(function (c) { return c.homeAway === "away"; })[0] || cs[1];
    if (!home || !away) return '<div class="g-state">' + esc(detail) + '</div>';
    if (state === "pre") {
      return '<div class="g-state">' + esc(azDateTime(comp.date) || detail) + '</div>' +
        '<div class="g-matchup">' + logoImg(away.team, "g-mlogo") + '<span>' + esc(away.team.abbreviation) + '</span>' +
          '<em>at</em>' + logoImg(home.team, "g-mlogo") + '<span>' + esc(home.team.abbreviation) + '</span></div>' +
        (comp.venue && comp.venue.fullName ? '<p class="g-note">' + esc(comp.venue.fullName) + '</p>' : '');
    }
    var live = state === "in";
    var hs = parseFloat(compScore(home)), as = parseFloat(compScore(away));
    var head = live
      ? '<div class="g-state g-state--live"><span class="g-live-dot"></span> Live &middot; ' + esc(detail) + '</div>'
      : '<div class="g-state g-state--final">' + esc(detail || "Final") + '</div>';
    var sit = "";
    if (live && comp.situation) {
      var s = comp.situation, bits = [];
      if (s.downDistanceText) bits.push(s.downDistanceText);
      if (s.outs != null) bits.push(s.outs + (s.outs === 1 ? " out" : " outs"));
      if (s.balls != null && s.strikes != null) bits.push(s.balls + "-" + s.strikes);
      if (bits.length) sit = '<p class="g-note">' + esc(bits.join(" · ")) + '</p>';
    } else if (!live && comp.date) {
      sit = '<p class="g-note">' + esc(gameDate(comp.date)) + '</p>';
    }
    return head + '<ul class="g-teams">' + teamRow(away, as > hs) + teamRow(home, hs > as) + '</ul>' + sit;
  }
  // compact "next 5" chip strip from a team schedule
  function azChip(ev, cfg) {
    var c = ev.competitions[0]; if (!c) return "";
    var me = (c.competitors || []).filter(function (x) { return x.team.abbreviation === cfg.abbr; })[0];
    var opp = (c.competitors || []).filter(function (x) { return x !== me; })[0];
    if (!me || !opp) return "";
    var d = new Date(ev.date).toLocaleDateString("en-US", { timeZone: "America/Phoenix", month: "numeric", day: "numeric" });
    return '<span class="g-chip"><b>' + esc(d) + '</b><span>' + (me.homeAway === "home" ? "vs " : "@ ") + esc(opp.team.abbreviation) + '</span></span>';
  }
  function buildStrip(events, cfg) {
    var now = Date.now();
    var fut = (events || []).filter(function (e) { return new Date(e.date).getTime() > now; }).slice(0, 5);
    if (fut.length < 2) return "";
    return '<div class="g-strip" aria-label="Next games">' + fut.map(function (e) { return azChip(e, cfg); }).join("") + '</div>';
  }
  function renderTeamCard(cfg, team, comp, strip) {
    var rec = team && team.record && team.record.items && team.record.items[0] && team.record.items[0].summary;
    var meta = [rec, team && team.standingSummary].filter(Boolean).join(" · ");
    var live = !!(comp && comp.status && comp.status.type && comp.status.type.state === "in");
    return '<article class="team-card' + (live ? " team-card--live" : "") + '">' +
      '<header class="team-card-head">' + logoImg(team, "team-logo") +
        '<div class="team-id"><h3>' + esc((team && team.displayName) || cfg.label) + '</h3>' +
          (meta ? '<p class="team-meta">' + esc(meta) + '</p>' : '') + '</div>' +
        '<span class="team-league">' + esc(cfg.label) + '</span></header>' +
      '<div class="team-game">' + gameModule(comp) + '</div>' +
      (strip || "") +
      '<footer class="team-foot">' + esc(cfg.foot) + '</footer></article>';
  }
  function loadAzTeam(cfg) {
    var teamP = fetch(ESPN + cfg.league + "/teams/" + cfg.id, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { return d.team; });
    var sbP = fetch(ESPN + cfg.league + "/scoreboard", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { return d.events || []; }).catch(function () { return []; });
    var schedP = fetch(ESPN + cfg.league + "/teams/" + cfg.id + "/schedule", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { return d.events || []; }).catch(function () { return []; });
    return Promise.all([teamP, sbP, schedP]).then(function (res) {
      var team = res[0], events = res[1], sched = res[2];
      var ev = events.filter(function (e) { return (e.competitions[0].competitors || []).some(function (c) { return c.team.abbreviation === cfg.abbr; }); })[0];
      var comp = ev ? ev.competitions[0] : (team && team.nextEvent && team.nextEvent[0] && team.nextEvent[0].competitions[0]) || null;
      return renderTeamCard(cfg, team, comp, buildStrip(sched, cfg));
    }).catch(function () {
      return '<article class="team-card"><header class="team-card-head"><div class="team-id"><h3>' + esc(cfg.label) + '</h3></div>' +
        '<span class="team-league">' + esc(cfg.label) + '</span></header><div class="team-game"><div class="g-state g-state--off">Scores unavailable</div></div>' +
        '<footer class="team-foot">' + esc(cfg.foot) + '</footer></article>';
    });
  }
  // Pick the next upcoming game from a schedule (or the most recent completed one).
  function nextFromEvents(evs) {
    var now = Date.now();
    var future = (evs || []).filter(function (e) { return new Date(e.date).getTime() > now; })
      .sort(function (a, b) { return new Date(a.date) - new Date(b.date); });
    if (future[0]) return future[0].competitions[0];
    var past = (evs || []).filter(function (e) { var c = e.competitions[0]; return c && c.status && c.status.type && c.status.type.state === "post"; });
    return past.length ? past[past.length - 1].competitions[0] : null;
  }
  function loadCollegeTeam(cfg) {
    var base = ESPN + cfg.league + "/teams/" + cfg.id;
    var year = new Date().getFullYear();
    var teamP = fetch(base, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { return d.team; });
    var schedP = fetch(base + "/schedule?season=" + year + "&seasontype=2", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) { return d.events || []; }).catch(function () { return []; });
    return Promise.all([teamP, schedP]).then(function (res) {
      var team = res[0], evs = res[1];
      var live = team && team.nextEvent && team.nextEvent[0] && team.nextEvent[0].competitions[0];
      return renderTeamCard(cfg, team, live || nextFromEvents(evs));
    }).catch(function () { return renderTeamCard(cfg, null, null); });
  }

  // ---- Division standings tables (ESPN level=3) ----
  function statVal(entry, name) {
    var s = (entry.stats || []).filter(function (x) { return x.name === name || x.type === name; })[0];
    return s ? (s.displayValue != null ? s.displayValue : s.value) : "";
  }
  function findDivision(node, abbr) {
    if (!node) return null;
    var ents = (node.standings && node.standings.entries) || [];
    if (ents.length && !(node.children && node.children.length) && ents.some(function (e) { return e.team.abbreviation === abbr; })) return node;
    var kids = node.children || [];
    for (var i = 0; i < kids.length; i++) { var f = findDivision(kids[i], abbr); if (f) return f; }
    return null;
  }
  function loadStanding(cfg) {
    return fetch(ESPN_STD + cfg.league + "/standings?level=3", { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var div = findDivision(j, cfg.abbr);
        var ents = ((div && div.standings && div.standings.entries) || []).slice()
          .sort(function (a, b) { return (parseFloat(statVal(b, "winPercent")) || 0) - (parseFloat(statVal(a, "winPercent")) || 0); });
        var rows = ents.map(function (e) {
          var gb = statVal(e, "gamesBehind");
          return '<tr' + (e.team.abbreviation === cfg.abbr ? ' class="is-az"' : '') + '>' +
            '<td class="st-team">' + logoImg(e.team, "st-logo") + '<span>' + esc(e.team.abbreviation) + '</span></td>' +
            '<td>' + esc(statVal(e, "wins")) + '</td><td>' + esc(statVal(e, "losses")) + '</td>' +
            '<td>' + esc(!gb || gb === "0" ? "—" : gb) + '</td></tr>';
        }).join("");
        return '<div class="standings-card"><h3>' + esc(cfg.title) + '</h3>' +
          '<table class="standings-table"><thead><tr><th>Team</th><th>W</th><th>L</th><th>GB</th></tr></thead><tbody>' +
          (rows || '<tr><td colspan="4">Standings unavailable</td></tr>') + '</tbody></table></div>';
      })
      .catch(function () { return '<div class="standings-card"><h3>' + esc(cfg.title) + '</h3><p class="embed-note">Standings unavailable.</p></div>'; });
  }
  function initStandings() {
    var box = doc.querySelector("[data-standings]");
    if (!box) return;
    if (!box.children.length) box.innerHTML = '<p class="rss-loading">Loading standings&hellip;</p>';
    Promise.all(STANDINGS.map(loadStanding)).then(function (cards) { if (box.isConnected) box.innerHTML = cards.join(""); });
  }

  // ---- Marquee events: World Cup, golf majors, March Madness, Olympics ----
  function timeAZ(iso) { try { return new Date(iso).toLocaleTimeString("en-US", { timeZone: "America/Phoenix", hour: "numeric", minute: "2-digit" }); } catch (e) { return ""; } }
  function monthRange(s, e) {
    try {
      var ds = new Date(s), de = new Date(e), o = { timeZone: "UTC", month: "short" };
      var m1 = ds.toLocaleDateString("en-US", o), m2 = de.toLocaleDateString("en-US", o);
      return m1 + " " + ds.getUTCDate() + "–" + (m1 === m2 ? "" : m2 + " ") + de.getUTCDate();
    } catch (x) { return ""; }
  }
  function eventErr(title) { return '<article class="event-card"><header class="event-head"><h3>' + esc(title) + '</h3></header><p class="ev-note">Unavailable right now.</p></article>'; }

  function wcMatch(comp) {
    var st = (comp.status && comp.status.type) || {};
    var live = st.state === "in", post = st.state === "post";
    var cs = comp.competitors || [];
    var home = cs.filter(function (c) { return c.homeAway === "home"; })[0] || cs[0];
    var away = cs.filter(function (c) { return c.homeAway === "away"; })[0] || cs[1];
    if (!home || !away) return "";
    var top = (live || post) ? (esc(compScore(away)) + "–" + esc(compScore(home))) : esc(timeAZ(comp.date));
    var sub = live ? esc(st.shortDetail || "Live") : (post ? "Full time" : "Kickoff");
    return '<li class="wc-match' + (live ? " is-live" : "") + '">' +
      '<span class="wc-side">' + logoImg(away.team, "wc-flag") + '<b>' + esc(away.team.abbreviation) + '</b></span>' +
      '<span class="wc-mid"><b>' + top + '</b><i' + (live ? ' class="is-live"' : '') + '>' + sub + '</i></span>' +
      '<span class="wc-side wc-side--r"><b>' + esc(home.team.abbreviation) + '</b>' + logoImg(home.team, "wc-flag") + '</span></li>';
  }
  function loadWorldCup() {
    return fetch(ESPN + "soccer/fifa.world/scoreboard", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      var evs = d.events || [];
      var live = evs.some(function (e) { var t = e.competitions[0].status; return t && t.type && t.type.state === "in"; });
      var rows = evs.slice(0, 5).map(function (e) { return wcMatch(e.competitions[0]); }).join("");
      var badge = live ? '<span class="ev-live"><span class="g-live-dot"></span>Live</span>' : '<span class="ev-badge">Today</span>';
      return '<article class="event-card' + (live ? " event-card--live" : "") + '"><header class="event-head"><h3>FIFA World Cup</h3>' + badge + '</header>' +
        '<ul class="wc-list">' + (rows || '<li class="ev-note">No matches today &mdash; back tomorrow.</li>') + '</ul>' +
        '<footer class="event-foot">Every match, called on KAZM</footer></article>';
    }).catch(function () { return eventErr("FIFA World Cup"); });
  }
  var golfWinnerCache = {};
  function golfWinner(yyyymmdd) {
    if (golfWinnerCache[yyyymmdd] !== undefined) return Promise.resolve(golfWinnerCache[yyyymmdd]);
    return fetch(ESPN + "golf/pga/scoreboard?dates=" + yyyymmdd, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
      var ev = (j.events || [])[0], comps = (ev && ev.competitions && ev.competitions[0].competitors) || [];
      var w = comps[0], name = (w && w.athlete && w.athlete.displayName) || "";
      golfWinnerCache[yyyymmdd] = name; return name;
    }).catch(function () { return ""; });
  }
  function majorRow(state, name, detail, isChamp) {
    var badge = state === "live" ? '<span class="ev-live"><span class="g-live-dot"></span>Live</span>'
      : '<span class="maj-tag maj-' + state + '">' + (state === "done" ? "Final" : "Next") + '</span>';
    return '<li class="major-row major-row--' + state + '"><span class="maj-name">' + esc(name) + '</span>' +
      '<span class="maj-date' + (isChamp ? " maj-champ" : "") + '">' + esc(detail) + '</span>' + badge + '</li>';
  }
  function loadGolfMajors() {
    return fetch(ESPN + "golf/pga/scoreboard", { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      var cal = (d.leagues && d.leagues[0] && d.leagues[0].calendar) || [];
      var names = ["Masters", "PGA Championship", "U.S. Open", "The Open"], now = Date.now();
      var majors = cal.filter(function (c) { return names.some(function (m) { return (c.label || c.value || "").indexOf(m) >= 0; }); });
      return Promise.all(majors.map(function (c) {
        var s = new Date(c.startDate).getTime(), e = new Date(c.endDate).getTime() + 86400000;
        var state = now > e ? "done" : (now >= s ? "live" : "next");
        var name = (c.label || c.value).replace(" Tournament", "");
        if (state === "done") {
          return golfWinner(c.endDate.slice(0, 10).replace(/-/g, "")).then(function (w) {
            return majorRow(state, name, w || monthRange(c.startDate, c.endDate), !!w);
          });
        }
        return Promise.resolve(majorRow(state, name, monthRange(c.startDate, c.endDate), false));
      })).then(function (rowArr) {
        var rows = rowArr.join(""), live = rows.indexOf("ev-live") >= 0;
        return '<article class="event-card' + (live ? " event-card--live" : "") + '"><header class="event-head"><h3>Golf majors</h3><span class="ev-badge">' + new Date().getFullYear() + '</span></header>' +
          '<ul class="major-list">' + (rows || '<li class="ev-note">Schedule pending.</li>') + '</ul><footer class="event-foot">The four that crown the greats</footer></article>';
      });
    }).catch(function () { return eventErr("Golf majors"); });
  }
  // generic: reigning champion (winner + score) of a postseason game whose notes
  // headline matches `re`. 100% real, fetched from ESPN.
  function champGame(path, range, groups, re) {
    return fetch(ESPN + path + "/scoreboard?dates=" + range + (groups ? "&groups=" + groups : "") + "&limit=200", { cache: "no-store" })
      .then(function (r) { return r.json(); }).then(function (j) {
        var ev = (j.events || []).filter(function (e) { var n = (e.competitions[0].notes || [])[0]; return n && re.test(n.headline || ""); })[0];
        if (!ev) return null;
        var cs = ev.competitions[0].competitors || [];
        var w = cs.filter(function (x) { return x.winner; })[0], l = cs.filter(function (x) { return !x.winner; })[0];
        return w ? { team: w.team, score: compScore(w), opp: l && l.team, oppScore: l && compScore(l) } : null;
      }).catch(function () { return null; });
  }
  var champCache = {};
  function getChamp(key, fn) {
    if (champCache[key] !== undefined) return Promise.resolve(champCache[key]);
    return fn().then(function (d) { champCache[key] = d; return d; });
  }
  function championCard(title, badge, year, foot, d) {
    var body = d
      ? '<div class="champ">' + logoImg(d.team, "champ-logo") +
          '<div class="champ-meta"><span class="champ-label">' + year + ' Champions</span>' +
          '<span class="champ-name">' + esc(d.team.displayName) + '</span>' +
          ((d.opp && d.score != null) ? '<span class="champ-score">def. ' + esc(d.opp.abbreviation) + ' ' + esc(d.score) + '–' + esc(d.oppScore) + '</span>' : "") +
        '</div></div>'
      : '<p class="ev-note">A new champion is crowned each season.</p>';
    return '<article class="event-card"><header class="event-head"><h3>' + esc(title) + '</h3><span class="ev-badge">' + esc(badge) + '</span></header>' +
      body + '<footer class="event-foot">' + esc(foot) + '</footer></article>';
  }
  function loadMarchMadness() {
    var now = new Date(), y = now.getFullYear();
    var cy = (now.getMonth() > 3 || (now.getMonth() === 3 && now.getDate() > 10)) ? y : y - 1;
    return getChamp("mm" + cy, function () { return champGame("basketball/mens-college-basketball", cy + "0401-" + cy + "0410", 100, /National Championship/i); })
      .then(function (d) { return championCard("March Madness", "NCAA", cy, "Bracket coverage on 780", d); });
  }
  function loadCFP() {
    var now = new Date(), y = now.getFullYear();
    var cy = (now.getMonth() === 0 && now.getDate() < 22) ? y - 1 : y;
    return getChamp("cfp" + cy, function () { return champGame("football/college-football", cy + "0101-" + cy + "0131", 80, /National Championship/i); })
      .then(function (d) { return championCard("College Football Playoff", "CFP", cy, "The Playoff, called on 780", d); });
  }
  function loadSuperBowl() {
    var now = new Date(), y = now.getFullYear();
    var cy = (now.getMonth() === 0 || (now.getMonth() === 1 && now.getDate() < 12)) ? y - 1 : y;
    return getChamp("sb" + cy, function () { return champGame("football/nfl", cy + "0201-" + cy + "0215", null, /Super Bowl/i); })
      .then(function (d) { return championCard("Super Bowl", "NFL", cy, "NFL playoffs & the big game on 780", d); });
  }
  function olympicsCard() {
    // Only the officially-confirmed Summer 2028 opening date drives the countdown.
    var now = Date.now();
    var games = [{ type: "Summer", host: "Los Angeles 2028", d: Date.UTC(2028, 6, 14) }, { type: "Winter", host: "French Alps 2030", d: Date.UTC(2030, 1, 1) }];
    var up = games.filter(function (g) { return g.d > now; }).sort(function (a, b) { return a.d - b.d; });
    var next = up[0], then = up[1];
    var days = next ? Math.ceil((next.d - now) / 86400000) : 0;
    var note = next ? ('<b>' + esc(next.host) + '</b>' + (then ? " &middot; then the " + esc(then.type) + " Games, " + esc(then.host) : "")) : "";
    return '<article class="event-card"><header class="event-head"><h3>Olympics</h3><span class="ev-badge">Next: ' + esc(next ? next.type : "") + '</span></header>' +
      '<div class="count"><span class="count-num">' + days + '</span><span class="count-lbl">days to the ' + esc(next ? next.type : "") + ' Games</span></div>' +
      '<p class="ev-note">' + note + '</p><footer class="event-foot">Team USA on the dial</footer></article>';
  }
  function renderEventsGrid(grid) {
    if (!grid || !grid.isConnected) return Promise.resolve(false);
    return Promise.all([loadWorldCup(), loadGolfMajors(), loadCFP(), loadSuperBowl(), loadMarchMadness(), Promise.resolve(olympicsCard())]).then(function (cards) {
      if (!grid.isConnected) return false;
      grid.innerHTML = cards.join("");
      return !!grid.querySelector(".event-card--live");
    });
  }

  function renderGrid(grid, configs, loader) {
    if (!grid || !grid.isConnected) return Promise.resolve(false);
    return Promise.all(configs.map(loader)).then(function (cards) {
      if (!grid.isConnected) return false;
      grid.innerHTML = cards.join("");
      return !!grid.querySelector(".team-card--live");
    });
  }
  function initScoreboards() {
    if (sbTimer) { clearInterval(sbTimer); sbTimer = null; }
    var pro = doc.querySelector("[data-az-scores]");
    var college = doc.querySelector("[data-college-scores]");
    var collegeBb = doc.querySelector("[data-college-bb-scores]");
    var events = doc.querySelector("[data-events]");
    initStandings();
    if (!pro && !college && !collegeBb && !events) return;
    if (pro && !pro.children.length) pro.innerHTML = '<p class="rss-loading">Loading Arizona scores&hellip;</p>';
    if (college && !college.children.length) college.innerHTML = '<p class="rss-loading">Loading Arizona college&hellip;</p>';
    if (collegeBb && !collegeBb.children.length) collegeBb.innerHTML = '<p class="rss-loading">Loading Arizona college&hellip;</p>';
    if (events && !events.children.length) events.innerHTML = '<p class="rss-loading">Loading marquee events&hellip;</p>';
    function cycle() {
      Promise.all([
        renderGrid(pro, AZ_TEAMS, loadAzTeam),
        renderGrid(college, COLLEGE_TEAMS, loadCollegeTeam),
        renderGrid(collegeBb, COLLEGE_BB_TEAMS, loadCollegeTeam),
        renderEventsGrid(events)
      ]).then(function (live) {
        if ((live[0] || live[1] || live[2] || live[3]) && !sbTimer) sbTimer = setInterval(cycle, 30000);
      });
    }
    cycle();
  }

  function stripHtml(str) { if (!str) return ""; var d = doc.createElement("div"); d.innerHTML = str; return (d.textContent || "").replace(/\s+/g, " ").trim(); }
  function feedText(node, tag) { var el = node.getElementsByTagName(tag)[0]; return el ? el.textContent : ""; }
  function feedDate(iso) { if (!iso) return ""; var d = new Date(iso); if (isNaN(d)) return ""; return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  function parseFeed(text) {
    var xml = new DOMParser().parseFromString(text, "text/xml");
    var items = [], entries = xml.getElementsByTagName("entry");
    if (entries.length) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i], link = "", links = e.getElementsByTagName("link");
        if (links.length) link = links[0].getAttribute("href") || "";
        items.push({ title: feedText(e, "title"), link: link, date: feedDate(feedText(e, "updated") || feedText(e, "published")), summary: stripHtml(feedText(e, "summary") || feedText(e, "content")) });
      }
    } else {
      var its = xml.getElementsByTagName("item");
      for (var j = 0; j < its.length; j++) {
        var it = its[j];
        items.push({ title: feedText(it, "title"), link: feedText(it, "link"), date: feedDate(feedText(it, "pubDate")), summary: stripHtml(feedText(it, "description")) });
      }
    }
    return items;
  }
  function fetchText(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); });
  }
  // Try our own n8n proxy first (when keyed), then the source directly, then a
  // public CORS proxy. Each leg falls through on failure, so the feed renders
  // from whichever path is reachable.
  function fetchFeed(url, key) {
    var legs = [];
    if (key && FEED_PROXY) legs.push(FEED_PROXY + "?src=" + encodeURIComponent(key));
    if (url) {
      legs.push(url);
      legs.push("https://corsproxy.io/?url=" + encodeURIComponent(url));
      legs.push("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
    }
    var i = 0;
    function attempt() {
      if (i >= legs.length) return Promise.reject(new Error("feed unavailable"));
      return fetchText(legs[i++]).catch(attempt);
    }
    return attempt().then(parseFeed);
  }
  function renderFeed(el, items, limit) {
    if (!items || !items.length) { el.innerHTML = '<p class="embed-note">No stories posted yet.</p>'; return; }
    var html = "";
    items.slice(0, limit).forEach(function (it) {
      var t = it.title || "Untitled";
      var open = it.link ? '<a href="' + it.link + '" target="_blank" rel="noopener">' : "<span>";
      var close = it.link ? "</a>" : "</span>";
      var sum = it.summary ? it.summary.slice(0, 180) + (it.summary.length > 180 ? "..." : "") : "";
      html += '<article class="rss-item">' + (it.date ? '<span class="rss-date">' + it.date + "</span>" : "") + "<h3>" + open + t + close + "</h3>" + (sum ? '<p class="rss-summary">' + sum + "</p>" : "") + "</article>";
    });
    el.innerHTML = html;
  }
  function initFeeds() {
    doc.querySelectorAll("[data-feed],[data-rss]").forEach(function (el) {
      var key = el.getAttribute("data-feed");
      var url = el.getAttribute("data-rss") || (key && FEEDS[key]) || "";
      var limit = parseInt(el.getAttribute("data-rss-limit") || "8", 10);
      el.innerHTML = '<p class="rss-loading">Loading the latest headlines...</p>';
      fetchFeed(url, key).then(function (items) { renderFeed(el, items, limit); })
        .catch(function () { el.innerHTML = '<p class="embed-note">The news feed is unavailable right now. Tune in for the latest on air.</p>'; });
    });
  }

  var heritageTimer = null;
  function initHeritage() {
    if (heritageTimer) { clearInterval(heritageTimer); heritageTimer = null; }
    var rotator = doc.querySelector("[data-logo-rotator]");
    if (!rotator) return;
    var logos = rotator.querySelectorAll(".heritage-logo");
    var eraLabel = rotator.querySelector("[data-era-label]");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (logos.length > 1 && !reduce) {
      var li = 0;
      logos.forEach(function (l, i) { if (l.classList.contains("is-active")) li = i; });
      heritageTimer = setInterval(function () {
        logos[li].classList.remove("is-active"); li = (li + 1) % logos.length; logos[li].classList.add("is-active");
        if (eraLabel) eraLabel.textContent = logos[li].getAttribute("data-era") || "";
      }, 3200);
    }
  }
  function initSchedule() {
    var lineup = doc.querySelector("[data-schedule]");
    if (!lineup) return;
    var items = lineup.querySelectorAll("li");
    // Real KAZM day-parts: 6a Mellow, 12p Midday, 3p Three Pack, 4p Sports,
    // 10p Coast to Coast (runs to 2a), 2a Overnight (runs to 6a).
    var hour = new Date().getHours(), current;
    if (hour >= 6 && hour < 12) current = 0;
    else if (hour >= 12 && hour < 15) current = 1;
    else if (hour >= 15 && hour < 16) current = 2;
    else if (hour >= 16 && hour < 22) current = 3;
    else if (hour >= 22 || hour < 2) current = 4;
    else current = 5;
    if (items[current]) items[current].classList.add("is-live");
  }

  /* =========================================================
     IN ROTATION — living artist logo wall (+ live "on air" glow)
     ========================================================= */
  var LP = "https://r2.theaudiodb.com/images/media/artist/logo/";
  var ROTATION = [
    { n: "The Doobie Brothers", l: LP + "the-doobie-brothers-4f1b3aaa5a769.png" },
    { n: "Steely Dan", l: LP + "tswxry1363971284.png" },
    { n: "Fleetwood Mac", l: LP + "s3iyxy1759266801.png" },
    { n: "Stevie Nicks", l: LP + "fl8s651713719616.png" },
    { n: "Hall & Oates", l: LP + "hall--oates-56f32c7928fad.png" },
    { n: "Eagles", l: LP + "upttst1522004690.png" },
    { n: "Journey", l: LP + "xtyqxu1536183132.png" },
    { n: "Chicago", l: LP + "chicago-4f4b8acccae16.png" },
    { n: "The Allman Brothers Band", l: LP + "rxpuxw1366209764.png" },
    { n: "Grateful Dead", l: LP + "xrsusr1366778972.png" },
    { n: "Bee Gees", l: LP + "awqd7o1710722890.png" },
    { n: "Orleans", l: null },
    { n: "Boz Scaggs", l: LP + "supuyx1365179899.png" },
    { n: "Bobby Caldwell", l: null },
    { n: "Christopher Cross", l: LP + "vswrxv1445956180.png" },
    { n: "Toto", l: LP + "sypvyx1489314073.png" },
    { n: "America", l: LP + "xvttpq1359113304.png" },
    { n: "Michael Jackson", l: LP + "ruvuxr1471431869.png" },
    { n: "Player", l: LP + "player-5653f025d267b.png" },
    { n: "Ambrosia", l: LP + "ambrosia-4f982a87d9b77.png" },
    { n: "Pablo Cruise", l: null },
    { n: "Little River Band", l: LP + "ysxvvx1474032528.png" }
  ];
  function rotNorm(s) { return (s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "").replace(/^the/, ""); }
  function rotItem(a) {
    var inner = a.l
      ? '<img class="band-logo" src="' + a.l + '" alt="' + esc(a.n) + '" loading="lazy" />'
      : '<span class="band-logo--text">' + esc(a.n) + '</span>';
    return '<a class="rwall-item' + (a.l ? '' : ' rwall-item--text') + '" data-artist="' + esc(a.n) + '" href="https://music.apple.com/us/search?term=' + encodeURIComponent(a.n) + '" target="_blank" rel="noopener" aria-label="Listen to ' + esc(a.n) + '">' +
      inner +
      '<span class="rwall-tag"><span class="rwall-dot"></span>On air now</span>' +
      '</a>';
  }
  function renderRotationWall() {
    var wrap = doc.querySelector("[data-rotation]");
    if (!wrap || wrap.getAttribute("data-built")) return;
    var half = Math.ceil(ROTATION.length / 2);
    var rows = [ROTATION.slice(0, half), ROTATION.slice(half)];
    wrap.innerHTML = rows.map(function (list, i) {
      var items = list.map(rotItem).join("");
      return '<div class="rwall-row rwall-row--' + (i === 0 ? "l" : "r") + '">' +
        '<div class="rwall-track">' + items + '</div>' +
        '<div class="rwall-track" aria-hidden="true">' + items + '</div>' +
        '</div>';
    }).join("");
    wrap.setAttribute("data-built", "1");
    // graceful fallback: if a logo image fails, swap in the artist name
    wrap.querySelectorAll("img.band-logo").forEach(function (img) {
      img.addEventListener("error", function () {
        var link = img.closest(".rwall-item"), span = doc.createElement("span");
        span.className = "band-logo band-logo--text";
        span.textContent = link ? link.getAttribute("data-artist") : "";
        img.replaceWith(span);
      });
    });
    if (lastNow && lastNow.artist) highlightOnAir(lastNow.artist);
  }
  function highlightOnAir(artist) {
    var wrap = doc.querySelector("[data-rotation]");
    if (!wrap) return;
    var cur = rotNorm(artist), any = false;
    wrap.querySelectorAll(".rwall-item").forEach(function (el) {
      var nm = rotNorm(el.getAttribute("data-artist"));
      var on = cur.length > 2 && nm.length > 2 && (cur === nm || cur.indexOf(nm) >= 0 || nm.indexOf(cur) >= 0);
      el.classList.toggle("is-onair", on);
      if (on) any = true;
    });
    wrap.classList.toggle("rwall-live", any);
  }

  /* =========================================================
     WEATHER — live Sedona forecast (Open-Meteo, no key, CORS-open)
     ========================================================= */
  function wxInfo(code, isDay) {
    var m = {
      0: ["Clear", "☀️", "🌑"], 1: ["Mostly clear", "🌤️", "🌑"],
      2: ["Partly cloudy", "⛅", "☁️"], 3: ["Overcast", "☁️", "☁️"],
      45: ["Fog", "🌫️"], 48: ["Rime fog", "🌫️"],
      51: ["Light drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Heavy drizzle", "🌧️"],
      56: ["Freezing drizzle", "🌧️"], 57: ["Freezing drizzle", "🌧️"],
      61: ["Light rain", "🌦️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
      66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
      71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"], 77: ["Snow grains", "🌨️"],
      80: ["Rain showers", "🌦️"], 81: ["Rain showers", "🌧️"], 82: ["Heavy showers", "⛈️"],
      85: ["Snow showers", "🌨️"], 86: ["Snow showers", "❄️"],
      95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"]
    };
    var e = m[code] || ["—", "🌡️"];
    return { label: e[0], icon: (isDay === 0 && e[2]) ? e[2] : e[1] };
  }
  function aqiInfo(v) {
    if (v == null) return null;
    var c = v <= 50 ? ["Good", "Good", "g"] : v <= 100 ? ["Moderate", "Moderate", "m"] : v <= 150 ? ["Unhealthy for sensitive groups", "Sensitive", "u1"]
      : v <= 200 ? ["Unhealthy", "Unhealthy", "u2"] : v <= 300 ? ["Very unhealthy", "V. unhealthy", "u3"] : ["Hazardous", "Hazardous", "hz"];
    return { v: Math.round(v), label: c[0], short: c[1], cls: c[2] };
  }
  function renderWeather(box, cur, daily, aqi) {
    var now = wxInfo(cur.weather_code, cur.is_day);
    var aq = aqiInfo(aqi);
    var aqBadge = aq ? '<span class="wx-aqi wx-aqi--' + aq.cls + '"><span class="wx-aqi-n">' + aq.v + '</span> AQI · ' + esc(aq.label) + '</span>' : '';
    var hero = '<div class="wx-now">' +
      '<div class="wx-now-main"><span class="wx-now-ic">' + now.icon + '</span>' +
        '<span class="wx-now-block"><span class="wx-now-temp">' + Math.round(cur.temperature_2m) + '°</span>' +
        '<span class="wx-now-cond">' + esc(now.label) + '</span>' + aqBadge + '</span></div>' +
      '<div class="wx-now-meta"><span class="wx-place">Sedona, AZ</span>' +
        '<span>Feels like ' + Math.round(cur.apparent_temperature) + '°</span>' +
        '<span>Humidity ' + cur.relative_humidity_2m + '%</span>' +
        '<span>Wind ' + Math.round(cur.wind_speed_10m) + ' mph</span></div></div>';
    var days = daily.time.map(function (t, i) {
      var d = new Date(t + "T12:00:00");
      var name = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
      var w = wxInfo(daily.weather_code[i], 1);
      var p = daily.precipitation_probability_max[i];
      return '<div class="wx-day">' +
        '<span class="wx-day-name">' + esc(name) + '</span>' +
        '<span class="wx-day-ic">' + w.icon + '</span>' +
        '<span class="wx-day-precip' + (p != null && p >= 20 ? '' : ' wx-day-precip--none') + '">💧 ' + (p != null ? p : 0) + '%</span>' +
        '<span class="wx-day-temps"><span class="wx-day-hi">' + Math.round(daily.temperature_2m_max[i]) + '°</span>' +
        '<span class="wx-day-lo">' + Math.round(daily.temperature_2m_min[i]) + '°</span></span>' +
        '</div>';
    }).join("");
    box.innerHTML = hero + '<div class="wx-days">' + days + '</div>' +
      '<p class="wx-credit">Live conditions for Sedona &middot; data by Open-Meteo &middot; Cathedral Rock photo via Wikimedia Commons</p>';
  }
  function renderWeatherMini(el, cur) {
    var w = wxInfo(cur.weather_code, cur.is_day);
    el.innerHTML = '<span class="wx-chip-ic">' + w.icon + '</span>' +
      '<span class="wx-chip-temp">' + Math.round(cur.temperature_2m) + '°</span>' +
      '<span class="wx-chip-meta"><span class="wx-chip-cond">' + esc(w.label) + '</span>' +
      '<span class="wx-chip-place">Sedona now</span></span>';
    el.classList.add("is-ready");
  }
  function initWeather() {
    var box = doc.querySelector("[data-weather]"), mini = doc.querySelector("[data-weather-mini]");
    if (!box && !mini) return;
    if (box) box.innerHTML = '<p class="rss-loading">Reading the sky over Sedona&hellip;</p>';
    var url = "https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610" +
      "&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day,apparent_temperature" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Phoenix&forecast_days=7";
    var aqUrl = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=34.8697&longitude=-111.7610&current=us_aqi&timezone=America/Phoenix";
    var aqP = fetch(aqUrl, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    Promise.all([fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }), aqP]).then(function (res) {
      var d = res[0], aqi = res[1] && res[1].current ? res[1].current.us_aqi : null;
      if (!d || !d.current || !d.daily) { if (box) box.innerHTML = '<p class="embed-note">Live weather is unavailable right now.</p>'; return; }
      if (box && box.isConnected) renderWeather(box, d.current, d.daily, aqi);
      if (mini && mini.isConnected) renderWeatherMini(mini, d.current);
    }).catch(function () { if (box) box.innerHTML = '<p class="embed-note">Live weather is unavailable right now.</p>'; });
  }

  /* =========================================================
     FIRE RESTRICTIONS — current Coconino NF stage (CI relay -> fire.json)
     ========================================================= */
  function fireClass(stage) { return stage === 0 ? "s0" : stage === 1 ? "s1" : stage === 2 ? "s2" : stage >= 3 ? "s3" : "unk"; }
  function fireLabel(d) { return d.stage === 0 ? "No fire restrictions" : (d.level || "Fire restrictions") + " fire restrictions"; }
  function initFire() {
    var card = doc.querySelector("[data-fire]"), mini = doc.querySelector("[data-fire-mini]");
    if (!card && !mini) return;
    fetch("fire.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || d.stage == null) { if (card) card.style.display = "none"; if (mini) mini.style.display = "none"; return; }
      var cls = fireClass(d.stage), emoji = d.stage === 0 ? "🌲" : "🔥", label = fireLabel(d);
      if (card && card.isConnected) {
        var sub = [d.agency, d.effective ? "in effect since " + d.effective : "", d.order ? "Order " + d.order : ""].filter(Boolean).join(" · ");
        card.innerHTML = '<a class="fire-card fire-card--' + cls + '" href="' + esc(d.source || "#") + '" target="_blank" rel="noopener">' +
          '<span class="fire-ic" aria-hidden="true">' + emoji + '</span>' +
          '<span class="fire-body"><span class="fire-level">' + esc(label) + '</span>' +
          '<span class="fire-sub">' + esc(sub) + '</span></span>' +
          '<span class="fire-cta">Official details &rarr;</span></a>';
      }
      if (mini && mini.isConnected) {
        mini.className = "fire-chip fire-chip--" + cls + " is-ready";
        mini.innerHTML = '<span class="fire-chip-ic" aria-hidden="true">' + emoji + '</span><span>' + esc(label) + '</span>';
      }
    }).catch(function () { if (card) card.style.display = "none"; if (mini) mini.style.display = "none"; });
  }

  /* =========================================================
     ADVENTURES — live hiking / biking / ski conditions (Open-Meteo)
     ========================================================= */
  function advErr() { return '<p class="embed-note">Live conditions are unavailable right now.</p>'; }
  function advStat(k, v) { return '<div class="adv-stat"><span class="adv-stat-k">' + esc(k) + '</span><span class="adv-stat-v">' + esc(v) + '</span></div>'; }
  function advTime(iso) { return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(" ", "").toLowerCase(); }
  function trailDry(daily) {
    var p = daily.precipitation_sum || [], recent = p.reduce(function (a, b) { return a + (b || 0); }, 0);
    if (recent >= 0.25) return { k: "wet", surface: "Wet — let it dry", tip: "Red-rock dirt holds water; riding or hiking it wet leaves ruts that last all season. Give the trails a day to firm up." };
    if (recent > 0.03) return { k: "tacky", surface: "Tacky in spots", tip: "A little recent moisture — most trails are good, but shaded and low sections may still be soft." };
    return { k: "dry", surface: "Dry & firm", tip: "" };
  }
  function renderHike(box, d, fire, aqi) {
    var c = d.current, day = d.daily, w = wxInfo(c.weather_code, c.is_day), i = day.sunrise.length - 1;
    var temp = Math.round(c.temperature_2m), uv = Math.round((day.uv_index_max || [])[i] || 0), dry = trailDry(day), aq = aqiInfo(aqi);
    var hot = temp >= 95, title = hot ? "Hot — hike at sunrise" : (temp <= 40 ? "Cold up high — layer up" : "Good hiking weather");
    var uvWord = uv >= 8 ? "very high" : uv >= 6 ? "high" : uv >= 3 ? "moderate" : "low";
    var fireV = fire && fire.level ? (fire.stage === 0 ? "None" : fire.level) : "Check";
    var tip = (hot ? "It's hot and exposed out there — start at first light, carry more water than you think, and be off the open rock by midday. " : "") +
      "Daylight runs " + advTime(day.sunrise[i]) + "–" + advTime(day.sunset[i]) + "; turn back with time to spare." + (dry.tip ? " " + dry.tip : "");
    box.innerHTML =
      '<div class="adv-live-head"><span class="adv-live-ic">' + w.icon + '</span>' +
        '<span class="adv-live-block"><span class="adv-live-title">' + esc(title) + '</span>' +
        '<span class="adv-live-sub">' + temp + '° and ' + esc(w.label.toLowerCase()) + ' in Sedona right now</span></span></div>' +
      '<div class="adv-stats">' + advStat("Trails", dry.surface) +
        advStat("Daylight", advTime(day.sunrise[i]) + " – " + advTime(day.sunset[i])) +
        advStat("UV index", uv + " · " + uvWord) +
        (aq ? advStat("Air quality", aq.v + " · " + aq.short) : "") +
        advStat("Fire", fireV) + '</div>' +
      '<p class="adv-tip">' + esc(tip) + '</p>';
  }
  function renderBike(box, d) {
    var c = d.current, day = d.daily, w = wxInfo(c.weather_code, c.is_day), dry = trailDry(day), temp = Math.round(c.temperature_2m);
    var title = dry.k === "wet" ? "Hold off — trails are wet" : dry.k === "tacky" ? "Mostly good — a few soft spots" : "Prime — dry and fast";
    var best = temp >= 90 ? "Before ~9am or near sunset" : "Most of the day — cooler up high";
    var tip = (dry.tip || "No recent rain, so the slickrock and dirt are firm and fast.") +
      (temp >= 90 ? " In this heat, ride early, carry plenty of water, and respect the exposure on the rock." : "");
    box.innerHTML =
      '<div class="adv-live-head adv-live-head--' + dry.k + '"><span class="adv-live-ic">🚵</span>' +
        '<span class="adv-live-block"><span class="adv-live-title">' + esc(title) + '</span>' +
        '<span class="adv-live-sub">' + temp + '° · ' + esc(w.label.toLowerCase()) + ' in Sedona</span></span></div>' +
      '<div class="adv-stats">' + advStat("Trail surface", dry.surface) + advStat("Temp", temp + "°") +
        advStat("Best window", best) + '</div>' +
      '<p class="adv-tip">' + esc(tip) + '</p>';
  }
  function renderSki(box, d) {
    var c = d.current, depthIn = Math.round((c.snow_depth || 0) * 39.3701);
    var newSnow = Math.round((d.daily.snowfall_sum || []).reduce(function (a, b) { return a + (b || 0); }, 0));
    var temp = Math.round(c.temperature_2m), month = new Date().getMonth(), inSeason = (month >= 10 || month <= 3), skiable = depthIn >= 4;
    var title, tip;
    if (skiable) { title = "Snow on the mountain"; tip = "There's a measurable base up top. Lifts and grooming change daily — check Snowbowl's official report before heading up, and carry chains for the drive north."; }
    else if (inSeason) { title = "Thin — waiting on snow"; tip = "Not enough base to ski right now. Snowbowl needs a good storm cycle; keep an eye on the forecast and the official report."; }
    else { title = "Off-season"; tip = "The lifts spin again with winter snow, usually by mid-November. Through summer and fall the Arizona Gondola runs for scenic rides to 11,500 ft."; }
    box.innerHTML =
      '<div class="adv-live-head"><span class="adv-live-ic">' + (skiable ? "⛷️" : "🏔️") + '</span>' +
        '<span class="adv-live-block"><span class="adv-live-title">' + esc(title) + '</span>' +
        '<span class="adv-live-sub">Arizona Snowbowl · summit area</span></span></div>' +
      '<div class="adv-stats">' + advStat("Snow depth", depthIn > 0 ? depthIn + '"' : "None") +
        advStat("New (7 days)", newSnow + '"') + advStat("Summit temp", temp + "°") +
        advStat("Season", inSeason ? "Nov–Apr" : "Off-season") + '</div>' +
      '<p class="adv-tip">' + esc(tip) + ' <a class="adv-link" href="https://www.snowbowl.ski/" target="_blank" rel="noopener">Official Snowbowl report &rarr;</a></p>';
  }
  function initAdventures() {
    var hike = doc.querySelector("[data-adv-hike]"), bike = doc.querySelector("[data-adv-bike]"), ski = doc.querySelector("[data-adv-ski]");
    if (!hike && !bike && !ski) return;
    [hike, bike, ski].forEach(function (b) { if (b) b.innerHTML = '<p class="rss-loading">Checking conditions&hellip;</p>'; });
    if (hike || bike) {
      var u = "https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610" +
        "&current=temperature_2m,weather_code,is_day,apparent_temperature&daily=sunrise,sunset,precipitation_sum,uv_index_max" +
        "&past_days=2&forecast_days=1&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America/Phoenix";
      var fp = fetch("fire.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      var aq = fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=34.8697&longitude=-111.7610&current=us_aqi&timezone=America/Phoenix", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
      Promise.all([fetch(u, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }), fp, aq]).then(function (res) {
        var d = res[0], aqi = res[2] && res[2].current ? res[2].current.us_aqi : null;
        if (!d || !d.current) { if (hike) hike.innerHTML = advErr(); if (bike) bike.innerHTML = advErr(); return; }
        if (hike && hike.isConnected) renderHike(hike, d, res[1], aqi);
        if (bike && bike.isConnected) renderBike(bike, d);
      }).catch(function () { if (hike) hike.innerHTML = advErr(); if (bike) bike.innerHTML = advErr(); });
    }
    if (ski) {
      var su = "https://api.open-meteo.com/v1/forecast?latitude=35.3306&longitude=-111.7110" +
        "&current=temperature_2m,weather_code,snow_depth&daily=snowfall_sum&past_days=7&forecast_days=1" +
        "&temperature_unit=fahrenheit&snowfall_unit=inch&timezone=America/Phoenix&elevation=2804";
      fetch(su, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !d.current) { ski.innerHTML = advErr(); return; }
        if (ski.isConnected) renderSki(ski, d);
      }).catch(function () { ski.innerHTML = advErr(); });
    }
  }

  /* =========================================================
     MELLOW METER — KAZM's own easy→epic scale (trails, water, spots)
     ========================================================= */
  var MM_LEVELS = {
    1: { name: "Easygoing", cls: "e", desc: "Great for everyone" },
    2: { name: "Adventure", cls: "a", desc: "A little effort, big reward" },
    3: { name: "Challenge", cls: "c", desc: "Bring water and good shoes" },
    4: { name: "Epic", cls: "x", desc: "Experienced hikers and riders" }
  };
  function mmBadge(level) {
    var l = MM_LEVELS[level] || MM_LEVELS[1];
    return '<span class="mm-badge mm-badge--' + l.cls + '" title="Mellow Meter: ' + l.name + ' — ' + l.desc + '">' +
      '<span class="mm-dot" aria-hidden="true"></span><span class="mm-k">Mellow Meter</span>' + l.name + '</span>';
  }

  /* =========================================================
     NWS ACTIVE ALERTS — real EAS-style watches/warnings for Sedona
     (api.weather.gov, keyless, CORS-open). Shared by the site banner
     and Oak Creek's flash-flood read.
     ========================================================= */
  var NWS_ALERTS = "https://api.weather.gov/alerts/active?point=34.8697,-111.7610";
  var _alertsPromise = null;
  function getAlerts() {
    if (_alertsPromise) return _alertsPromise;
    _alertsPromise = fetch(NWS_ALERTS, { cache: "no-store", headers: { "Accept": "application/geo+json" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { return (j && j.features) ? j.features.map(function (f) { return f.properties; }) : []; })
      .catch(function () { return []; });
    return _alertsPromise;
  }
  var ALERT_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1, Unknown: 0 };
  function initAlerts() {
    var el = doc.querySelector("[data-alerts]");
    if (!el) return;
    getAlerts().then(function (alerts) {
      if (!el.isConnected || !alerts || !alerts.length) { el.innerHTML = ""; return; }
      alerts = alerts.slice().sort(function (a, b) { return (ALERT_RANK[b.severity] || 0) - (ALERT_RANK[a.severity] || 0); });
      var top = alerts[0], rank = ALERT_RANK[top.severity] || 0;
      var more = alerts.length > 1 ? (alerts.length - 1) : 0;
      // Minor / Unknown advisories (e.g. Air Quality) -> small unobtrusive chip.
      // Only real Moderate+ warnings (flash flood, severe storm) get the big banner.
      if (rank <= 1) {
        el.innerHTML =
          '<a class="wx-alert-chip" href="https://www.weather.gov/fgz/" target="_blank" rel="noopener" title="' + esc(top.headline || top.event) + '">' +
            '<span class="wx-alert-chip-ic" aria-hidden="true">&#9888;</span>' + esc(top.event) +
            (more ? '<span class="wx-alert-chip-more">+' + more + '</span>' : '') +
          '</a>';
        return;
      }
      var sev = rank >= 3 ? "sev" : "mod";
      var moreTag = more ? ' <span class="alert-more">+' + more + ' more</span>' : "";
      var head = top.headline || (top.event + (top.areaDesc ? " — " + top.areaDesc : ""));
      el.innerHTML =
        '<a class="wx-alert wx-alert--' + sev + '" href="https://www.weather.gov/fgz/" target="_blank" rel="noopener">' +
          '<span class="wx-alert-ic" aria-hidden="true">&#9888;</span>' +
          '<span class="wx-alert-body"><b>' + esc(top.event) + moreTag + '</b><span>' + esc(head) + '</span></span>' +
          '<span class="wx-alert-src">NWS</span>' +
        '</a>';
    });
  }

  /* =========================================================
     OAK CREEK — live USGS gauge 09504420 + Open-Meteo rain + NWS floods.
     Everything below is derived from real live data; recommendations are
     advisories that change with conditions.
     ========================================================= */
  var CREEK_API = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=09504420&parameterCd=00010,00045,00060,00065,63680&siteStatus=active";
  // upper Oak Creek Canyon (near Slide Rock) — rain up here feeds the creek
  var CREEK_WX = "https://api.open-meteo.com/v1/forecast?latitude=34.9436&longitude=-111.7527&daily=precipitation_sum,precipitation_probability_max&past_days=3&forecast_days=1&precipitation_unit=inch&timezone=America/Phoenix";

  function creekFlow(cfs) {
    if (cfs == null) return { k: "na", label: "Flow unavailable", note: "" };
    if (cfs < 15) return { k: "low", label: "Low &amp; lazy", note: "Gentle and clear &mdash; easy wading and warm, quiet pools." };
    if (cfs < 60) return { k: "good", label: "Just right", note: "Classic Oak Creek &mdash; the swimming holes are prime." };
    if (cfs < 150) return { k: "strong", label: "Running strong", note: "Lively current. Fun for strong swimmers; keep an eye on kids." };
    if (cfs < 400) return { k: "high", label: "High &amp; pushy", note: "Fast and cold. Pick calm edges and skip the deep channels." };
    return { k: "flood", label: "Flooding &mdash; stay out", note: "Dangerous flow. Do not cross, wade, or swim." };
  }
  function creekMM(cfs) { if (cfs == null) return 1; if (cfs < 60) return 1; if (cfs < 150) return 2; if (cfs < 400) return 3; return 4; }
  function creekTemp(f) { if (f == null) return ""; if (f < 55) return "Bracing"; if (f < 68) return "Refreshing"; if (f < 78) return "Perfect for a dip"; return "Bath-warm"; }
  function creekClarity(ntu) {
    if (ntu == null) return null;
    if (ntu < 3) return { label: "Crystal clear", cls: "good", ntu: ntu };
    if (ntu < 10) return { label: "Clear", cls: "good", ntu: ntu };
    if (ntu < 25) return { label: "Slightly stained", cls: "ok", ntu: ntu };
    if (ntu < 75) return { label: "Murky", cls: "warn", ntu: ntu };
    return { label: "Muddy &mdash; runoff", cls: "bad", ntu: ntu };
  }
  function creekTubing(cfs) {
    if (cfs == null) return "—";
    if (cfs < 20) return "Too low &mdash; you'll scrape bottom";
    if (cfs < 80) return "Good &mdash; mellow float";
    if (cfs < 200) return "Fast &mdash; strong swimmers only";
    return "Skip it &mdash; dangerous flow";
  }
  function creekWading(cfs, ft) {
    if (cfs == null) return "—";
    if (cfs < 60 && (ft == null || ft < 2.6)) return "Easy &mdash; ankle to knee deep";
    if (cfs < 150) return "Wade with care &mdash; stick to calm edges";
    return "Too high to wade safely";
  }
  function creekKids(cfs, flood) {
    if (flood.k === "extreme" || flood.k === "high" || (cfs != null && cfs >= 150)) return { label: "Not right now", cls: "warn" };
    if (cfs != null && cfs >= 60) return { label: "Older kids, close watch", cls: "ok" };
    return { label: "Good with supervision", cls: "good" };
  }
  function creekFlood(alerts, fcst, prob, recentUp, cfs) {
    var warn = alerts.some(function (a) { return /flash flood warning|flood warning/i.test(a.event); });
    var watch = alerts.some(function (a) { return /flash flood watch|flood watch|flood advisory/i.test(a.event); });
    var monsoon = (function () { var m = new Date().getMonth(); return m >= 6 && m <= 8; })();
    if (warn) return { k: "extreme", label: "Flood Warning in effect", note: "The National Weather Service has a flood warning out. Get to high ground and stay out of washes and the creek." };
    if (watch) return { k: "high", label: "Flood watch in effect", note: "Conditions favor flooding. Oak Creek can rise several feet in minutes &mdash; don't wade or camp in the wash." };
    if ((fcst != null && fcst >= 0.5) || (prob != null && prob >= 60)) return { k: "elevated", label: "Elevated", note: "Rain in the forecast" + (monsoon ? " during monsoon season" : "") + ". Watch the sky upstream &mdash; flash floods reach here fast under blue skies." };
    if ((recentUp != null && recentUp >= 0.3) || (fcst != null && fcst >= 0.1)) return { k: "moderate", label: "Low to moderate", note: "Some recent or possible rain up the canyon. Stay aware near the water." };
    return { k: "low", label: "Low", note: "Dry pattern and steady flow." + (monsoon ? " Still &mdash; this is monsoon country; a storm you can't see can flood the creek." : "") };
  }
  function creekFishing(tf) {
    var win = "Dawn &amp; dusk";
    try {
      var g = goldenTimes(new Date()), m = g.morning.b, e = g.evening.b, T = function (d) { return skyTime(d, g.tz); };
      win = "Dawn " + T(m.sunrise) + "&ndash;" + T(new Date(+m.sunrise + 7200000)) + " &middot; Dusk " + T(new Date(+e.sunset - 7200000)) + "&ndash;" + T(e.sunset);
    } catch (err) {}
    if (tf != null && tf >= 70) win += " (trout sluggish in warm water)";
    return win;
  }
  function creekAgo(dt) {
    var t = new Date(dt).getTime(); if (isNaN(t)) return "";
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 60) return "updated " + m + " min ago";
    var h = Math.round(m / 60); return "updated " + h + " hr ago";
  }
  function creekStat(val, label, cls) { return '<div class="creek-stat' + (cls ? " creek-stat--" + cls : "") + '"><b>' + val + '</b><span>' + label + '</span></div>'; }
  function creekAct(ic, label, val, cls) { return '<div class="creek-act' + (cls ? " act-" + cls : "") + '"><span class="creek-act-k">' + ic + " " + label + '</span><b>' + val + '</b></div>'; }

  // parse USGS + Open-Meteo + NWS into one normalized snapshot (shared by
  // the Oak Creek panel and the Slide Rock attraction)
  function parseCreek(data, wx, alerts) {
    var vals = {};
    (data && data.value && data.value.timeSeries || []).forEach(function (t) {
      var code = t.variable.variableCode[0].value;
      var v = t.values[0] && t.values[0].value[0];
      if (v && v.value !== "" && v.value != null && parseFloat(v.value) > -999998) vals[code] = { v: parseFloat(v.value), dt: v.dateTime };
    });
    var cfs = vals["00060"] ? vals["00060"].v : null;
    var ft = vals["00065"] ? vals["00065"].v : null;
    var tc = vals["00010"] ? vals["00010"].v : null;
    var ntu = vals["63680"] ? vals["63680"].v : null;
    var tf = tc != null ? Math.round(tc * 9 / 5 + 32) : null;
    if (cfs == null && ft == null && tf == null) return null;
    var recentUp = null, fcst = null, prob = null;
    if (wx && wx.daily && wx.daily.precipitation_sum) {
      var ps = wx.daily.precipitation_sum, n = ps.length;
      recentUp = 0; for (var i = 0; i < n - 1; i++) recentUp += (ps[i] || 0);
      recentUp = Math.round(recentUp * 100) / 100;
      fcst = ps[n - 1];
      var pp = wx.daily.precipitation_probability_max || [];
      prob = pp[n - 1] != null ? pp[n - 1] : null;
    }
    alerts = alerts || [];
    var flood = creekFlood(alerts, fcst, prob, recentUp, cfs);
    return {
      cfs: cfs, ft: ft, tc: tc, ntu: ntu, tf: tf, recentUp: recentUp, fcst: fcst, prob: prob,
      fl: creekFlow(cfs), mm: creekMM(cfs), flood: flood,
      clarity: creekClarity(ntu), kids: creekKids(cfs, flood),
      stamp: vals["00060"] ? creekAgo(vals["00060"].dt) : (vals["00065"] ? creekAgo(vals["00065"].dt) : "")
    };
  }

  var _creekPromise = null;
  function getCreekData() {
    if (_creekPromise) return _creekPromise;
    var usgs = fetch(CREEK_API, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var wx = fetch(CREEK_WX, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    _creekPromise = Promise.all([usgs, wx, getAlerts()]).then(function (res) {
      return res[0] ? parseCreek(res[0], res[1], res[2]) : null;
    }).catch(function () { return null; });
    return _creekPromise;
  }

  function renderCreek(el, c) {
    var fl = c.fl, flood = c.flood, clarity = c.clarity, kids = c.kids, tf = c.tf, cfs = c.cfs, ft = c.ft;
    var stats = "";
    if (cfs != null) stats += creekStat((cfs >= 100 ? Math.round(cfs) : cfs), "cu ft / sec");
    if (ft != null) stats += creekStat(ft.toFixed(2) + " ft", "gage height");
    if (tf != null) stats += creekStat(tf + "&deg;F", "water &middot; " + creekTemp(tf));
    if (clarity) stats += creekStat(clarity.label, clarity.ntu.toFixed(1) + " NTU turbidity", clarity.cls);
    if (c.recentUp != null) stats += creekStat(c.recentUp.toFixed(2) + '"', "rain upstream, 72 hr");
    var swimCls = fl.k === "flood" || flood.k === "extreme" ? "warn" : fl.k === "high" ? "ok" : "good";
    var swimRec = fl.k === "flood" ? "Closed &mdash; too dangerous" : fl.k === "high" ? "Strong swimmers, calm pools only" : "Good &mdash; find your hole";
    var acts =
      creekAct("🏊", "Swimming", swimRec, swimCls) +
      creekAct("🛟", "Tubing", creekTubing(cfs)) +
      creekAct("🥾", "Wading", creekWading(cfs, ft)) +
      creekAct("🧒", "Safe for kids?", kids.label, kids.cls) +
      creekAct("🎣", "Best fishing", creekFishing(tf)) +
      creekAct("💧", "Water quality", clarity ? clarity.label + (tf != null && tf < 70 ? " &amp; cool" : "") : (tf != null ? tf + "&deg;F" : "—"), clarity ? clarity.cls : "");
    el.innerHTML =
      '<div class="creek-card creek-' + fl.k + '">' +
        '<div class="creek-hero">' +
          '<span class="creek-wave" aria-hidden="true"></span>' +
          '<div><span class="creek-status">' + fl.label + '</span><p class="creek-note">' + fl.note + '</p>' +
            '<div class="creek-badges">' + mmBadge(c.mm) + (tf != null ? '<span class="creek-tempbadge">' + tf + '&deg;F &middot; ' + creekTemp(tf) + '</span>' : "") + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="creek-floodstrip flood-' + flood.k + '">' +
          '<span class="creek-flood-ic" aria-hidden="true">' + (flood.k === "extreme" || flood.k === "high" ? "&#9888;" : "💧") + '</span>' +
          '<div><b>Flash-flood risk: ' + flood.label + '</b><span>' + flood.note + '</span></div>' +
        '</div>' +
        '<div class="creek-stats">' + stats + '</div>' +
        '<div class="creek-acts">' + acts + '</div>' +
        '<div class="creek-foot"><span class="creek-live-dot" aria-hidden="true"></span>Flow, height, temp &amp; clarity: USGS 09504420 &middot; rain: Open-Meteo &middot; alerts: NWS' + (c.stamp ? ' &middot; ' + c.stamp : '') + '</div>' +
      '</div>';
  }
  function initCreek() {
    var el = doc.querySelector("[data-creek]");
    if (!el) return;
    el.innerHTML = '<p class="rss-loading">Reading the creek&hellip;</p>';
    getCreekData().then(function (c) {
      if (!el.isConnected) return;
      if (!c) { el.innerHTML = advErr(); return; }
      renderCreek(el, c);
    });
  }

  /* =========================================================
     SLIDE ROCK STATE PARK — its own attraction, same live creek feed
     ========================================================= */
  function slideCond(cfs) {
    if (cfs == null) return { label: "Conditions unavailable", note: "", cls: "ok" };
    if (cfs < 15) return { label: "Low &amp; shallow", note: "Thin water over the rock &mdash; slow, scrapey slides, but warm pools to soak in.", cls: "good" };
    if (cfs < 60) return { label: "Prime sliding", note: "The chute's running just right &mdash; mellow, fun, and swimmable. Classic Slide Rock.", cls: "good" };
    if (cfs < 150) return { label: "Running quick", note: "Flow's up. The slide is fast and cold &mdash; fine for confident swimmers, hold onto the kids.", cls: "ok" };
    if (cfs < 400) return { label: "Fast &amp; cold", note: "High water. Strong current in the chute and pools &mdash; experienced swimmers only.", cls: "warn" };
    return { label: "Closed conditions", note: "Dangerous flow. The creek and chute are not safe today &mdash; stay out.", cls: "warn" };
  }
  function renderSlide(el, c) {
    var tf = c.tf, cfs = c.cfs, clarity = c.clarity, flood = c.flood, cond = slideCond(cfs);
    var mm = c.fl.k === "flood" ? 3 : (cfs != null && cfs >= 150 ? 2 : 1);
    var stats = "";
    if (tf != null) stats += creekStat(tf + "&deg;F", "water &middot; " + creekTemp(tf));
    if (clarity) stats += creekStat(clarity.label, clarity.ntu.toFixed(1) + " NTU turbidity", clarity.cls);
    if (cfs != null) stats += creekStat((cfs >= 100 ? Math.round(cfs) : cfs), "creek flow, cfs");
    el.innerHTML =
      '<div class="creek-card slide-card creek-' + c.fl.k + '">' +
        '<div class="creek-hero">' +
          '<span class="creek-wave" aria-hidden="true"></span>' +
          '<div><span class="creek-status">' + cond.label + '</span><p class="creek-note">' + cond.note + '</p>' +
            '<div class="creek-badges">' + mmBadge(mm) + (tf != null ? '<span class="creek-tempbadge">' + tf + '&deg;F &middot; ' + creekTemp(tf) + '</span>' : "") + '</div>' +
          '</div>' +
        '</div>' +
        (flood.k === "extreme" || flood.k === "high" ?
          '<div class="creek-floodstrip flood-' + flood.k + '"><span class="creek-flood-ic" aria-hidden="true">&#9888;</span>' +
            '<div><b>Flash-flood risk: ' + flood.label + '</b><span>' + flood.note + '</span></div></div>' : "") +
        '<div class="creek-stats">' + stats + '</div>' +
        '<div class="slide-about">' +
          '<p>Slide Rock is a natural 80-foot sandstone chute worn into Oak Creek, on the historic Pendley Homestead apple farm about 7 miles up SR&nbsp;89A. Bring water shoes for the slick rock, expect cold water, and know it&rsquo;s a day-use Arizona State Park with an entry fee.</p>' +
          '<div class="slide-facts">' +
            '<div class="slide-fact"><b>~7 mi</b><span>north of Sedona</span></div>' +
            '<div class="slide-fact"><b>80 ft</b><span>natural slide</span></div>' +
            '<div class="slide-fact"><b>State park</b><span>fee &amp; gate hours</span></div>' +
            '<div class="slide-fact"><b>Fills early</b><span>summer weekends</span></div>' +
          '</div>' +
          '<a class="adv-link" href="https://azstateparks.com/slide-rock" target="_blank" rel="noopener">Park hours, fees &amp; closures &rarr;</a>' +
        '</div>' +
        '<div class="creek-foot"><span class="creek-live-dot" aria-hidden="true"></span>Water conditions from the live Oak Creek gauge, USGS 09504420' + (c.stamp ? ' &middot; ' + c.stamp : '') + '</div>' +
      '</div>';
  }
  function initSlide() {
    var el = doc.querySelector("[data-slide]");
    if (!el) return;
    el.innerHTML = '<p class="rss-loading">Checking the chute&hellip;</p>';
    getCreekData().then(function (c) {
      if (!el.isConnected) return;
      if (!c) { el.innerHTML = advErr(); return; }
      renderSlide(el, c);
    });
  }

  /* =========================================================
     TRAFFIC — live ADOT AZ511 congestion heat map (Leaflet, no key)
     ========================================================= */
  var TRAFFIC_TILE = "https://tiles.ibi511.com/Geoservice/GetTrafficTile?x={x}&y={y}&z={z}";
  function loadLeaflet(cb) {
    if (window.L) { cb(window.L); return; }
    if (!doc.querySelector('link[data-leaflet]')) {
      var css = doc.createElement("link");
      css.rel = "stylesheet"; css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"; css.setAttribute("data-leaflet", "1");
      doc.head.appendChild(css);
    }
    var js = doc.createElement("script");
    js.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    js.onload = function () { cb(window.L); };
    js.onerror = function () { cb(null); };
    doc.head.appendChild(js);
  }

  /* =========================================================
     TRAIL ROUTE MAPS — flip a trail card to see its real OSM route
     drawn on a USGS topo basemap. Geometry from trails.json (baked
     from OpenStreetMap), loaded lazily on first flip.
     ========================================================= */
  var TOPO_TILE = "https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}";
  var _trailsPromise = null;
  function getTrails() {
    if (_trailsPromise) return _trailsPromise;
    _trailsPromise = fetch("trails.json", { cache: "force-cache" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    return _trailsPromise;
  }
  function fitTrail(card) {
    if (!card._map) return;
    card._map.invalidateSize();
    if (card._bounds) card._map.fitBounds(card._bounds, { padding: [18, 18] });
  }
  function buildTrailMap(card) {
    var mapEl = card.querySelector("[data-trail-map]");
    var slug = card.getAttribute("data-trail");
    if (!mapEl || card._mapDone) return;
    card._mapDone = true;
    mapEl.innerHTML = '<div class="trail-map-load">Loading route&hellip;</div>';
    Promise.all([new Promise(function (res) { loadLeaflet(res); }), getTrails()]).then(function (r) {
      var L = r[0], trails = r[1], data = trails && trails[slug];
      if (!L || !data || !data.lines) { mapEl.innerHTML = '<div class="trail-map-load">Route unavailable</div>'; return; }
      mapEl.innerHTML = "";
      var map = L.map(mapEl, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, dragging: true, tap: false });
      L.tileLayer(TOPO_TILE, { maxZoom: 16, attribution: "USGS · The National Map" }).addTo(map);
      var all = [];
      data.lines.forEach(function (seg) {
        L.polyline(seg, { color: "#7a2f10", weight: 6, opacity: .5 }).addTo(map);    // casing
        L.polyline(seg, { color: "#ff8a3d", weight: 3, opacity: 1 }).addTo(map);     // core
        all = all.concat(seg);
      });
      var b = data.bbox; // [minlat,minlon,maxlat,maxlon]
      card._bounds = b ? [[b[0], b[1]], [b[2], b[3]]] : (all.length ? all : null);
      if (card._bounds) map.fitBounds(card._bounds, { padding: [18, 18] });
      if (all.length) {
        L.circleMarker(all[0], { radius: 5, color: "#fff", weight: 2, fillColor: "#2fae6a", fillOpacity: 1 }).addTo(map).bindTooltip("Start");
        L.circleMarker(all[all.length - 1], { radius: 5, color: "#fff", weight: 2, fillColor: "#d24b3a", fillOpacity: 1 }).addTo(map).bindTooltip("End");
      }
      card._map = map;
      // the card is mid-flip when the map is born — resize + refit once it settles
      requestAnimationFrame(function () { fitTrail(card); });
      setTimeout(function () { fitTrail(card); }, 350);
      setTimeout(function () { fitTrail(card); }, 750);
    });
  }
  function initTrailMaps() {
    var cards = doc.querySelectorAll(".trail-flip");
    if (!cards.length) return;
    cards.forEach(function (card) {
      if (card._wired) return; card._wired = true;
      var inner = card.querySelector(".trail-flip-inner");
      var routeBtn = card.querySelector(".trail-route-btn"), backBtn = card.querySelector(".trail-back-btn");
      if (inner) inner.addEventListener("transitionend", function (e) { if (e.propertyName === "transform" && card.classList.contains("flipped")) fitTrail(card); });
      if (routeBtn) routeBtn.addEventListener("click", function () {
        card.classList.add("flipped");
        buildTrailMap(card);
        setTimeout(function () { fitTrail(card); }, 700);
      });
      if (backBtn) backBtn.addEventListener("click", function () { card.classList.remove("flipped"); });
    });
  }
  function initTraffic() {
    var el = doc.querySelector("[data-traffic]");
    if (!el || el.getAttribute("data-init")) return;
    el.setAttribute("data-init", "1");
    loadLeaflet(function (L) {
      if (!L || !el.isConnected) { if (el.isConnected) el.innerHTML = '<p class="embed-note">The traffic map is unavailable right now.</p>'; return; }
      var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true }).setView([34.8675, -111.794], 14);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 19, subdomains: "abcd", attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);
      var traffic = L.tileLayer(TRAFFIC_TILE, { maxZoom: 19, opacity: 1, attribution: "Traffic &copy; ADOT AZ511" }).addTo(map);
      // ADOT tiles cache ~60s; nudge a redraw each minute to keep it live
      setInterval(function () { if (el.isConnected) traffic.setUrl(TRAFFIC_TILE + "&t=" + Date.now()); }, 60000);
      // re-measure once layout settles
      setTimeout(function () { map.invalidateSize(); }, 250);
    });
  }
  // compact, non-interactive homepage preview — lazy-loaded on scroll
  function initTrafficMini() {
    var el = doc.querySelector("[data-traffic-mini]");
    if (!el || el.getAttribute("data-init")) return;
    function build() {
      if (el.getAttribute("data-init")) return;
      el.setAttribute("data-init", "1");
      loadLeaflet(function (L) {
        if (!L || !el.isConnected) return;
        var map = L.map(el, { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false, tap: false }).setView([34.8662, -111.793], 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(map);
        L.tileLayer(TRAFFIC_TILE, { maxZoom: 18, opacity: .9 }).addTo(map);
        setTimeout(function () { map.invalidateSize(); }, 250);
      });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); build(); } }); }, { rootMargin: "250px" });
      io.observe(el);
    } else { build(); }
  }

  /* =========================================================
     SCHUMANN RESONANCE — Earth's frequency (Zero Trust Radio -> schumann.json)
     ========================================================= */
  function schCls(a) { return ({ "Very calm": "vc", "Calm": "c", "Moderate": "m", "Elevated": "e", "High": "h" })[a] || "c"; }
  function srStat(k, v) { return '<div class="sr-stat"><span class="sr-stat-k">' + esc(k) + '</span><span class="sr-stat-v">' + esc(v) + '</span></div>'; }
  function srWavePath(w, amp, base, period) {
    var d = "M0 " + base.toFixed(1);
    for (var x = 0; x <= w; x += 12) { d += " L" + x + " " + (base + amp * Math.sin(2 * Math.PI * x / period)).toFixed(1); }
    return d;
  }
  function renderSchumann(box, d) {
    var cls = schCls(d.activity);
    var when = d.observed_at ? new Date(d.observed_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
    var e = d.energy_score != null ? Math.max(0, Math.min(100, d.energy_score)) : 20;
    var amp = 10 + e / 100 * 26; // calmer wave when calm, livelier when energetic
    var wFill = srWavePath(2400, amp, 66, 300) + " L2400 130 L0 130 Z";
    var wLine = srWavePath(2400, amp * 0.72, 60, 240);
    var specSrc = d.spectrogram ? esc(d.spectrogram) + (d.spectrogram.indexOf("?") > -1 ? "&" : "?") + "_=" + Date.now() : "";
    box.innerHTML =
      '<div class="sr-grid">' +
        '<div class="sr-hero sr-hero--' + cls + '">' +
          '<svg class="sr-wave" viewBox="0 0 1200 130" preserveAspectRatio="none" aria-hidden="true">' +
            '<g class="sr-wave-g1"><path class="sr-fill" d="' + wFill + '"/></g>' +
            '<g class="sr-wave-g2"><path class="sr-line" d="' + wLine + '"/></g>' +
          '</svg>' +
          '<div class="sr-hero-in"><span class="sr-score">' + (d.energy_score != null ? d.energy_score : "—") + '</span>' +
            '<span class="sr-activity">' + esc(d.activity) + ' activity</span>' +
            '<span class="sr-freq"><b>' + (d.detected_hz != null ? d.detected_hz : "—") + ' Hz</b> detected &middot; 7.83 Hz nominal</span></div>' +
        '</div>' +
        '<div class="sr-body">' +
          '<div class="sr-viz-panel">' +
            '<div class="sr-viz-head"><span class="sr-viz-k"><span class="sr-viz-dot" aria-hidden="true"></span>Live resonance spectrum</span>' +
              '<span class="sr-viz-hz">' + (d.detected_hz != null ? d.detected_hz + ' Hz peak' : '7.83 Hz fundamental') + '</span></div>' +
            '<canvas class="sr-viz" data-sr-viz aria-label="Live Schumann resonance spectrum"></canvas>' +
          '</div>' +
          '<div class="sr-stats">' +
            srStat("Peaks", d.peaks != null ? d.peaks : "—") +
            srStat("Band density", d.density != null ? d.density + "%" : "—") +
            srStat("Cavity", d.cavity_state || "—") +
            srStat("Station", (d.station || "").toUpperCase() || "—") +
          '</div>' +
          (d.spectrogram ?
          '<figure class="sr-spec">' +
            '<div class="sr-spec-frame">' +
              '<img class="sr-spec-img" src="' + specSrc + '" alt="Live Schumann resonance spectrogram from the Tomsk observatory" onerror="this.closest(\'.sr-spec\').style.display=\'none\'" />' +
              '<span class="sr-spec-tint" aria-hidden="true"></span>' +
              '<span class="sr-spec-vignette" aria-hidden="true"></span>' +
              '<span class="sr-spec-scan" aria-hidden="true"></span>' +
              '<i class="sr-corner sr-corner--tl" aria-hidden="true"></i><i class="sr-corner sr-corner--tr" aria-hidden="true"></i><i class="sr-corner sr-corner--bl" aria-hidden="true"></i><i class="sr-corner sr-corner--br" aria-hidden="true"></i>' +
              '<span class="sr-spec-live"><span class="sr-spec-live-dot" aria-hidden="true"></span>LIVE</span>' +
            '</div>' +
            '<figcaption class="sr-spec-cap"><span class="sr-spec-cap-k">SIGNAL</span>Schumann resonance spectrogram<span class="sr-spec-cap-src">Tomsk Space Observing System &middot; 56&deg;N</span></figcaption>' +
          '</figure>' : "") +
          '<p class="sr-note">The Schumann resonance is the electromagnetic hum in the cavity between Earth&rsquo;s surface and the ionosphere, driven by worldwide lightning &mdash; the planet&rsquo;s ~7.83&nbsp;Hz &ldquo;heartbeat.&rdquo; Meditators and sound healers watch its energy and peaks. Read via Zero Trust Radio' + (when ? ' &middot; updated ' + esc(when) : '') + '.</p>' +
        '</div>' +
      '</div>';
    // build the live spectrum from the real modes + energy, then animate it
    var modes = [7.83, 14.31, 20.8, 27.3, 33.8], amps = [1, 0.62, 0.46, 0.34, 0.26];
    var harm = modes.map(function (hz, i) { return { hz: hz, amp: amps[i] }; });
    if (d.detected_hz != null && d.detected_hz > 0 && d.detected_hz < 45) {
      // emphasise today's detected peak
      var near = harm.reduce(function (b, h) { return Math.abs(h.hz - d.detected_hz) < Math.abs(b.hz - d.detected_hz) ? h : b; }, harm[0]);
      if (Math.abs(near.hz - d.detected_hz) < 1.5) near.amp = Math.max(near.amp, 0.85);
      else harm.push({ hz: d.detected_hz, amp: 0.7, detected: true });
    }
    var canvas = box.querySelector("[data-sr-viz]");
    if (canvas) initSchumannViz(canvas, e, harm);
  }
  var _srVizRAF = null, _srVizResize = null;
  function initSchumannViz(canvas, energy, harm) {
    if (_srVizRAF) { cancelAnimationFrame(_srVizRAF); _srVizRAF = null; }
    if (_srVizResize) { window.removeEventListener("resize", _srVizResize); _srVizResize = null; }
    var ctx = canvas.getContext("2d"); if (!ctx) return;
    var W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() {
      var r = canvas.getBoundingClientRect(); W = r.width || 600; H = r.height || 190;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    _srVizResize = function () { if (canvas.isConnected) size(); };
    window.addEventListener("resize", _srVizResize, { passive: true });
    var en = Math.max(0, Math.min(100, energy)) / 100, maxHz = 40, t0 = performance.now();
    // FIXED ceiling so energy actually drives peak height (low energy = flat, high = towering).
    // Motion + glow also intensify with energy: calm hum vs. agitated storm.
    var top = 1.8, gain = 0.16 + en * 1.25, labels = [7.83, 14.3, 20.8, 27.3, 33.8];
    var brAmp = 0.1 + en * 0.26, brSpd = 0.6 + en * 0.9, jtAmp = 0.05 + en * 0.14, jtSpd = 5 + en * 8, sigE = 0.9 - en * 0.24;
    function ampAt(hz, t) {
      var a = 0;
      for (var i = 0; i < harm.length; i++) {
        var h = harm[i], breathe = 1 + brAmp * Math.sin(t * brSpd + i * 1.7), jit = 1 + jtAmp * Math.sin(t * jtSpd + i * 3.1 + hz);
        var peak = h.amp * gain * breathe * jit, sig = sigE + i * 0.12;
        a += peak * Math.exp(-((hz - h.hz) * (hz - h.hz)) / (2 * sig * sig));
      }
      return a + 0.03 + 0.022 * Math.abs(Math.sin(hz * 2.1 + t * 1.3));
    }
    function xOf(hz) { var p = 10; return p + hz / maxHz * (W - 2 * p); }
    function yOf(a) { var b = H - 16; return b - Math.min(1, a / top) * (b - 14); }
    function frame(now) {
      if (!canvas.isConnected) { _srVizRAF = null; return; }
      var t = (now - t0) / 1000, baseY = H - 16, i, hz;
      ctx.clearRect(0, 0, W, H);
      // faint harmonic guide lines
      for (i = 0; i < labels.length; i++) { var gx = xOf(labels[i]); ctx.strokeStyle = "rgba(150,180,255,.12)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(gx, 12); ctx.lineTo(gx, baseY); ctx.stroke(); }
      // spectrum fill
      ctx.beginPath(); ctx.moveTo(xOf(0), baseY);
      for (hz = 0; hz <= maxHz; hz += 0.3) ctx.lineTo(xOf(hz), yOf(ampAt(hz, t)));
      ctx.lineTo(xOf(maxHz), baseY); ctx.closePath();
      var g = ctx.createLinearGradient(0, 12, 0, baseY);
      g.addColorStop(0, "rgba(130,245,255,.6)"); g.addColorStop(.5, "rgba(150,120,255,.32)"); g.addColorStop(1, "rgba(110,80,220,.04)");
      ctx.fillStyle = g; ctx.fill();
      // glowing curve
      ctx.beginPath();
      for (hz = 0; hz <= maxHz; hz += 0.3) { var x = xOf(hz), y = yOf(ampAt(hz, t)); hz === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.lineWidth = 2 + en * 1.2; ctx.strokeStyle = "#c9f4ff"; ctx.shadowColor = "#6fe0ff"; ctx.shadowBlur = 12 + en * 16; ctx.stroke(); ctx.shadowBlur = 0;
      // peak dots + labels
      ctx.textAlign = "center"; ctx.font = "600 9px ui-sans-serif,system-ui,sans-serif";
      for (i = 0; i < labels.length; i++) {
        var px = xOf(labels[i]), py = yOf(ampAt(labels[i], t));
        ctx.fillStyle = "#eafcff"; ctx.shadowColor = "#8fefff"; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(px, py, 2.6, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
        ctx.fillStyle = "rgba(200,215,255,.5)"; ctx.fillText(labels[i] + "", px, baseY + 12);
      }
      _srVizRAF = requestAnimationFrame(frame);
    }
    _srVizRAF = requestAnimationFrame(frame);
  }
  function renderSchumannMini(el, d) {
    el.className = "sr-chip sr-chip--" + schCls(d.activity) + " is-ready";
    el.innerHTML = '<span class="sr-chip-dot" aria-hidden="true"></span><span>Schumann ' + (d.energy_score != null ? d.energy_score : "—") + ' &middot; ' + esc(d.activity) + '</span>';
  }
  var _srSpecTimer = null;
  function initSchumann() {
    var box = doc.querySelector("[data-schumann]"), mini = doc.querySelector("[data-schumann-mini]");
    if (_srSpecTimer) { clearInterval(_srSpecTimer); _srSpecTimer = null; }
    if (_srVizRAF) { cancelAnimationFrame(_srVizRAF); _srVizRAF = null; }
    if (!box && !mini) return;
    if (box) box.innerHTML = '<p class="rss-loading">Tuning into Earth&rsquo;s frequency&hellip;</p>';
    fetch("schumann.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.available) { if (box) box.innerHTML = '<p class="embed-note">The Schumann reading is offline right now.</p>'; if (mini) mini.style.display = "none"; return; }
      if (box && box.isConnected) renderSchumann(box, d);
      if (mini && mini.isConnected) renderSchumannMini(mini, d);
      // keep the Tomsk spectrogram live — reload the image every 90s
      if (box && d.spectrogram) {
        _srSpecTimer = setInterval(function () {
          var imgs = box.querySelectorAll(".sr-spec-img, .sr-spec-bloom");
          if (!imgs.length || !imgs[0].isConnected) { clearInterval(_srSpecTimer); _srSpecTimer = null; return; }
          var src = d.spectrogram + (d.spectrogram.indexOf("?") > -1 ? "&" : "?") + "_=" + Date.now();
          imgs.forEach(function (im) { im.src = src; });
        }, 90000);
      }
    }).catch(function () { if (box && box.isConnected) box.innerHTML = '<p class="embed-note">The Schumann reading is offline right now.</p>'; });
  }

  /* =========================================================
     COSMIC CONDITIONS — moon phase (computed) + geomagnetic Kp (NOAA)
     ========================================================= */
  function moonInfo() {
    var syn = 29.53058867, ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000, now = Date.now() / 86400000;
    var phase = ((((now - ref) / syn) % 1) + 1) % 1;
    var names = [["New moon", "🌑"], ["Waxing crescent", "🌒"], ["First quarter", "🌓"], ["Waxing gibbous", "🌔"],
      ["Full moon", "🌕"], ["Waning gibbous", "🌖"], ["Last quarter", "🌗"], ["Waning crescent", "🌘"]];
    var idx = Math.round(phase * 8) % 8;
    return { name: names[idx][0], icon: names[idx][1], illum: Math.round((1 - Math.cos(2 * Math.PI * phase)) / 2 * 100) };
  }
  function kpInfo(kp) {
    var c = kp < 3 ? ["Quiet", "q"] : kp < 4 ? ["Unsettled", "u"] : kp < 5 ? ["Active", "a"]
      : kp < 6 ? ["Minor storm", "g1"] : kp < 7 ? ["Moderate storm", "g2"] : ["Strong storm", "g3"];
    return { kp: Math.round(kp * 10) / 10, label: c[0], cls: c[1] };
  }
  function initCosmic() {
    var box = doc.querySelector("[data-cosmic]");
    if (!box) return;
    var m = moonInfo();
    box.innerHTML =
      '<div class="cos-card"><span class="cos-ic">' + m.icon + '</span><span class="cos-k">Moon</span>' +
        '<span class="cos-v">' + esc(m.name) + '</span><span class="cos-sub">' + m.illum + '% illuminated</span></div>' +
      '<div class="cos-card" data-cos-kp><span class="cos-ic">🧲</span><span class="cos-k">Geomagnetic</span>' +
        '<span class="cos-v">…</span><span class="cos-sub">NOAA Kp index</span></div>';
    fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (rows) {
        var el = box.querySelector("[data-cos-kp]");
        if (!el) return;
        var last = rows && rows.length ? rows[rows.length - 1] : null;
        var kp = last ? parseFloat(last.Kp != null ? last.Kp : (Array.isArray(last) ? last[1] : NaN)) : NaN;
        if (isNaN(kp)) { el.innerHTML = '<span class="cos-ic">🧲</span><span class="cos-k">Geomagnetic</span><span class="cos-v">—</span><span class="cos-sub">NOAA Kp index</span>'; return; }
        var info = kpInfo(kp);
        el.className = "cos-card cos-kp--" + info.cls;
        el.innerHTML = '<span class="cos-ic">🧲</span><span class="cos-k">Geomagnetic</span>' +
          '<span class="cos-v">Kp ' + info.kp + '</span><span class="cos-sub">' + esc(info.label) + ' · NOAA</span>';
      }).catch(function () {});
  }

  /* =========================================================
     STARGAZING TONIGHT — real astronomy for Sedona, no keys.
     Twilight window, moon rise/set + illumination, and the Milky Way
     core's altitude, all computed client-side (SunCalc-style algos,
     validated against almanac values for Sedona).
     ========================================================= */
  function computeSky(now) {
    var LAT = 34.8697, LON = -111.7610, TZ = -7;   // Sedona, MST (no DST)
    var rad = Math.PI / 180, deg = 180 / Math.PI, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
    function fromJD(j) { return (j + 0.5 - J1970) * dayMs; }
    function toDays(date) { return date.valueOf() / dayMs - 0.5 + J1970 - J2000; }
    function ra(l, b) { return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)); }
    function dec(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
    function sidereal(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }
    function alt(H, phi, dc) { return Math.asin(Math.sin(phi) * Math.sin(dc) + Math.cos(phi) * Math.cos(dc) * Math.cos(H)); }
    function sma(d) { return rad * (357.5291 + 0.98560028 * d); }
    function eclon(M) { return M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI; }
    function sunDec(d) { return dec(eclon(sma(d)), 0); }
    function sunRA(d) { return ra(eclon(sma(d)), 0); }
    // sun event times for a given altitude h (deg) on the date of `now`
    var lw = rad * -LON, phi = rad * LAT, J0 = 0.0009;
    function transitJ(ds, M, L) { return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L); }
    function sunTimes(date, h) {
      var d = toDays(date), n = Math.round(d - J0 - lw / (2 * Math.PI)),
        ds = J0 + (0 + lw) / (2 * Math.PI) + n, M = sma(ds), L = eclon(M), dc = dec(L, 0),
        Jnoon = transitJ(ds, M, L),
        w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dc)) / (Math.cos(phi) * Math.cos(dc))),
        a = J0 + (w + lw) / (2 * Math.PI) + n, Jset = transitJ(a, M, L);
      return { rise: new Date(fromJD(Jnoon - (Jset - Jnoon))), set: new Date(fromJD(Jset)), noon: new Date(fromJD(Jnoon)) };
    }
    function moonCoords(d) {
      var L = rad * (218.316 + 13.176396 * d), M = rad * (134.963 + 13.064993 * d), F = rad * (93.272 + 13.229350 * d),
        l = L + rad * 6.289 * Math.sin(M), b = rad * 5.128 * Math.sin(F), dt = 385001 - 20905 * Math.cos(M);
      return { ra: ra(l, b), dec: dec(l, b), dist: dt };
    }
    function moonAlt(date) {
      var d = toDays(date), c = moonCoords(d), H = sidereal(d, lw) - c.ra, h = alt(H, phi, c.dec);
      return h + rad * 0.017 / Math.tan(h + rad * 10.26 / (h + rad * 5.114));
    }
    function moonIllum(date) {
      var d = toDays(date), sd = sunDec(d), sr = sunRA(d), m = moonCoords(d), sdist = 149598000,
        p = Math.acos(Math.sin(sd) * Math.sin(m.dec) + Math.cos(sd) * Math.cos(m.dec) * Math.cos(sr - m.ra)),
        inc = Math.atan2(sdist * Math.sin(p), m.dist - sdist * Math.cos(p));
      return (1 + Math.cos(inc)) / 2;
    }
    function moonTimes(date) {
      var t = new Date(date); t.setHours(0, 0, 0, 0);
      var hc = 0.133 * rad, h0 = moonAlt(t) - hc, rise, set, ye;
      for (var i = 1; i <= 24; i++) {
        var h1 = moonAlt(new Date(+t + i * 3600000)) - hc;
        if (h0 < 0 && h1 >= 0) rise = i - h0 / (h0 - h1);
        if (h0 >= 0 && h1 < 0) set = i - h0 / (h0 - h1);
        h0 = h1;
      }
      var r = {};
      if (rise) r.rise = new Date(+t + rise * 3600000);
      if (set) r.set = new Date(+t + set * 3600000);
      return r;
    }
    // Galactic center (Sgr A*): RA 266.405°, Dec -28.936°
    function gcAlt(date) {
      var d = toDays(date), H = sidereal(d, lw) - rad * 266.405;
      return alt(H, phi, rad * -28.936) * deg;
    }
    // reference "tonight": from today's dusk to tomorrow's dawn
    var todaySet = sunTimes(now, -0.833).set, todayRise = sunTimes(now, -0.833).rise;
    var tomorrow = new Date(+now + dayMs);
    var duskAstro = sunTimes(now, -18).set;                // astronomical twilight end
    var dawnAstro = sunTimes(tomorrow, -18).rise;          // next astro dawn
    if (dawnAstro <= duskAstro) dawnAstro = new Date(+dawnAstro + dayMs);
    // scan the dark window: moon-up fraction + GC best altitude
    var steps = 48, moonUp = 0, gcBest = -90, gcBestT = null, span = dawnAstro - duskAstro;
    for (var s = 0; s <= steps; s++) {
      var t = new Date(+duskAstro + span * s / steps);
      if (moonAlt(t) > 0) moonUp++;
      var ga = gcAlt(t);
      if (ga > gcBest) { gcBest = ga; gcBestT = t; }
    }
    var moonUpFrac = moonUp / (steps + 1);
    var illum = moonIllum(now);
    var impact = illum * moonUpFrac;                        // 0 (dark) .. 1 (bright moon all night)
    var mt = moonTimes(now);
    return {
      sunset: todaySet, sunrise: new Date(+sunTimes(tomorrow, -0.833).rise),
      dusk: duskAstro, dawn: dawnAstro,
      moonIllum: Math.round(illum * 100), moonUpFrac: moonUpFrac,
      moonrise: mt.rise, moonset: mt.set,
      gcAlt: Math.round(gcBest), gcBestTime: gcBestT, gcVisible: gcBest > 12,
      impact: impact, tz: TZ
    };
  }
  function skyVerdict(impact) {
    if (impact < 0.10) return { label: "Excellent", cls: "exc", note: "Dark skies &mdash; the Milky Way and faint stuff pop." };
    if (impact < 0.32) return { label: "Good", cls: "good", note: "Mostly dark. Solid night for stars." };
    if (impact < 0.62) return { label: "Fair", cls: "fair", note: "Some moonlight will wash out the faintest stars." };
    return { label: "Bright moon", cls: "bright", note: "The moon owns the sky tonight &mdash; tough for deep-sky." };
  }
  function skyTime(dt, tz) {
    if (!dt || isNaN(dt.valueOf())) return "—";
    var u = new Date(dt.valueOf() + tz * 3600000);
    var h = u.getUTCHours(), m = u.getUTCMinutes(), ap = h < 12 ? "AM" : "PM", h12 = h % 12 || 12;
    return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function initStargaze() {
    var el = doc.querySelector("[data-stargaze]");
    if (!el) return;
    var sky, v;
    try { sky = computeSky(new Date()); v = skyVerdict(sky.impact); }
    catch (err) { el.innerHTML = ""; return; }
    function T(dt) { return skyTime(dt, sky.tz); }
    var mwLine = sky.gcVisible
      ? 'Highest around <b>' + T(sky.gcBestTime) + '</b> at <b>' + sky.gcAlt + '&deg;</b> over the southern horizon.'
      : 'Below the good-viewing line tonight &mdash; the core rides low this time of year.';
    el.innerHTML =
      '<div class="sky-card sky-' + v.cls + '">' +
        '<div class="sky-head"><div><span class="sky-eyebrow">Stargazing tonight</span>' +
          '<span class="sky-verdict">' + v.label + '</span></div>' +
          '<span class="sky-score" aria-hidden="true">' + Math.max(0, 100 - Math.round(sky.impact * 100)) + '</span></div>' +
        '<p class="sky-note">' + v.note + '</p>' +
        '<div class="sky-rows">' +
          '<div class="sky-row"><span class="sky-ic">🌌</span><div><b>Milky Way core</b><span>' + mwLine + '</span></div></div>' +
          '<div class="sky-row"><span class="sky-ic">🌙</span><div><b>Moon &middot; ' + sky.moonIllum + '% lit</b><span>' +
            (sky.moonrise ? 'Rises ' + T(sky.moonrise) : '') +
            (sky.moonrise && sky.moonset ? ' &middot; ' : '') +
            (sky.moonset ? 'Sets ' + T(sky.moonset) : '') + '</span></div></div>' +
          '<div class="sky-row"><span class="sky-ic">🌑</span><div><b>True darkness</b><span>' +
            T(sky.dusk) + ' &ndash; ' + T(sky.dawn) + ' (astronomical twilight)</span></div></div>' +
        '</div>' +
        '<div class="sky-foot">Computed live for Sedona &middot; 34.87&deg;N, 111.76&deg;W</div>' +
      '</div>';
  }

  /* =========================================================
     PHOTOGRAPHER'S LIGHT — golden & blue hour for Sedona, no keys.
     Same validated sun-time solver as the stargazing panel.
     ========================================================= */
  function goldenTimes(now) {
    var LAT = 34.8697, LON = -111.7610, TZ = -7;
    var rad = Math.PI / 180, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397;
    function fromJD(j) { return (j + 0.5 - J1970) * dayMs; }
    function toDays(date) { return date.valueOf() / dayMs - 0.5 + J1970 - J2000; }
    function dec(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
    function sma(d) { return rad * (357.5291 + 0.98560028 * d); }
    function eclon(M) { return M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI; }
    var lw = rad * -LON, phi = rad * LAT, J0 = 0.0009;
    function transitJ(ds, M, L) { return J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L); }
    function sunAt(date, h) {
      var d = toDays(date), n = Math.round(d - J0 - lw / (2 * Math.PI)),
        ds = J0 + lw / (2 * Math.PI) + n, M = sma(ds), L = eclon(M), dc = dec(L, 0),
        Jnoon = transitJ(ds, M, L),
        w = Math.acos((Math.sin(h * rad) - Math.sin(phi) * Math.sin(dc)) / (Math.cos(phi) * Math.cos(dc))),
        a = J0 + (w + lw) / (2 * Math.PI) + n, Jset = transitJ(a, M, L);
      return { rise: new Date(fromJD(Jnoon - (Jset - Jnoon))), set: new Date(fromJD(Jset)) };
    }
    function block(date) {
      var s = sunAt(date, -0.833), g = sunAt(date, 6), b = sunAt(date, -6);
      return { sunrise: s.rise, sunset: s.set, goldMornEnd: g.rise, goldEveStart: g.set, blueDawn: b.rise, blueDusk: b.set };
    }
    var today = block(now), tmr = block(new Date(+now + dayMs));
    var mDay = now < today.goldMornEnd ? { day: now, b: today } : { day: new Date(+now + dayMs), b: tmr };
    var eDay = now < today.blueDusk ? { day: now, b: today } : { day: new Date(+now + dayMs), b: tmr };
    return { morning: mDay, evening: eDay, tz: TZ, now: now };
  }
  function initGolden() {
    var el = doc.querySelector("[data-golden]");
    if (!el) return;
    var g;
    try { g = goldenTimes(new Date()); } catch (err) { el.innerHTML = ""; return; }
    function T(d) { return skyTime(d, g.tz); }
    function localKey(d) { var u = new Date(d.valueOf() + g.tz * 3600000); return u.getUTCFullYear() + "-" + u.getUTCMonth() + "-" + u.getUTCDate(); }
    function lbl(day, part) { return localKey(day) === localKey(g.now) ? ("This " + part) : ("Tomorrow " + part); }
    function row(label, val, hi) { return '<div class="gold-row' + (hi ? " is-key" : "") + '"><span>' + label + '</span><b>' + val + '</b></div>'; }
    var m = g.morning.b, e = g.evening.b;
    el.innerHTML =
      '<div class="gold-card gold-morning">' +
        '<div class="gold-head"><span class="gold-ic">🌅</span><span class="gold-when">' + lbl(g.morning.day, "morning") + '</span></div>' +
        '<div class="gold-rows">' +
          row("Blue hour", T(m.blueDawn) + ' &ndash; ' + T(m.sunrise)) +
          row("Sunrise", T(m.sunrise), true) +
          row("Golden hour", T(m.sunrise) + ' &ndash; ' + T(m.goldMornEnd)) +
        '</div></div>' +
      '<div class="gold-card gold-evening gold-card--hero">' +
        '<div class="gold-head"><span class="gold-ic">🌄</span><span class="gold-when">' + lbl(g.evening.day, "evening") + '</span><span class="gold-tag">Red-rock glow</span></div>' +
        '<div class="gold-rows">' +
          row("Golden hour", T(e.goldEveStart) + ' &ndash; ' + T(e.sunset), true) +
          row("Sunset", T(e.sunset)) +
          row("Blue hour", T(e.sunset) + ' &ndash; ' + T(e.blueDusk)) +
        '</div></div>';
  }

  /* =========================================================
     COSMIC AMBIENT — a generative drone voiced live from the Earth's
     real Schumann resonance + today's geomagnetic (Kp) field. The ~7.83 Hz
     fundamental is below hearing, so we raise the whole real harmonic
     series 5 octaves into the audible range. Kp adds shimmer/detune.
     100% generated client-side from real data — no audio files.
     ========================================================= */
  var OCT_UP = 32;                       // 2^5 — five octaves up into hearing
  var cxCtx = null, cxNodes = [], cxMaster = null, cxComp = null, cxPlaying = false, cxEl = null, cxData = null;
  function kpNum(kp) { return (kp == null || isNaN(kp)) ? 1.5 : kp; }
  function kpField(kp) {
    var k = kpNum(kp);
    if (k < 3) return { label: "Calm", cls: "c" };
    if (k < 5) return { label: "Unsettled", cls: "u" };
    if (k < 6) return { label: "Active field", cls: "a" };
    return { label: "Geomagnetic storm", cls: "s" };
  }
  function cxImpulse(ctx, dur, decay) {
    var rate = ctx.sampleRate, len = Math.floor(rate * dur), buf = ctx.createBuffer(2, len, rate);
    for (var c = 0; c < 2; c++) { var d = buf.getChannelData(c); for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return buf;
  }
  function cxBuild(sr, kp) {
    var Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return false;
    cxCtx = new Ctx();
    cxMaster = cxCtx.createGain(); cxMaster.gain.value = 0;
    cxComp = cxCtx.createDynamicsCompressor();
    cxComp.threshold.value = -14; cxComp.ratio.value = 4; cxComp.attack.value = 0.02; cxComp.release.value = 0.4;
    var lp = cxCtx.createBiquadFilter(); lp.type = "lowpass"; lp.Q.value = 0.6;
    lp.frequency.value = 900 + Math.max(0, Math.min(100, sr.energy_score || 20)) * 9;
    var rev = cxCtx.createConvolver(); rev.buffer = cxImpulse(cxCtx, 3.6, 2.4);
    var wet = cxCtx.createGain(); wet.gain.value = 0.55;
    var dry = cxCtx.createGain(); dry.gain.value = 0.7;
    lp.connect(dry).connect(cxMaster);
    lp.connect(rev); rev.connect(wet).connect(cxMaster);
    cxMaster.connect(cxComp); cxComp.connect(cxCtx.destination);

    var base = sr.nominal_hz || 7.83;
    var modes = (sr.harmonics_hz && sr.harmonics_hz.length > 1) ? sr.harmonics_hz.slice(0, 6) : [7.83, 14.3, 20.8, 27.3, 33.8];
    if (modes.indexOf(base) === -1) modes.unshift(base);
    var detune = kpNum(kp) * 1.6;        // cents of chorus spread, grows with Kp
    modes.forEach(function (m, i) {
      var f = m * OCT_UP; if (f < 40 || f > 6000) return;
      [-1, 1].forEach(function (s) {
        var o = cxCtx.createOscillator(); o.type = "sine"; o.frequency.value = f;
        o.detune.value = s * detune * (1 + i * 0.25);
        var g = cxCtx.createGain(); g.gain.value = i === 0 ? 0.16 : 0.11 / (i + 1);
        o.connect(g); g.connect(lp); o.start(); cxNodes.push(o, g);
      });
    });
    // warmth: sub octave of the fundamental
    var sub = cxCtx.createOscillator(); sub.type = "sine"; sub.frequency.value = base * 16;
    var sg = cxCtx.createGain(); sg.gain.value = 0.13; sub.connect(sg); sg.connect(lp); sub.start(); cxNodes.push(sub, sg);
    // live accent: today's detected peak, level tied to energy_score
    var det = sr.detected_hz || base, df = det * OCT_UP;
    if (df >= 40 && df <= 6000) {
      var da = cxCtx.createOscillator(); da.type = "triangle"; da.frequency.value = df;
      var dg = cxCtx.createGain(); dg.gain.value = 0.04 + Math.max(0, Math.min(100, sr.energy_score || 20)) / 100 * 0.1;
      da.connect(dg); dg.connect(lp); da.start(); cxNodes.push(da, dg);
    }
    // breathing: slow LFOs on filter + level; rate rises with Kp
    var lfo = cxCtx.createOscillator(); lfo.frequency.value = 0.035 + kpNum(kp) * 0.02;
    var lg = cxCtx.createGain(); lg.gain.value = 180 + kpNum(kp) * 70; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(); cxNodes.push(lfo, lg);
    var lfo2 = cxCtx.createOscillator(); lfo2.frequency.value = 0.05;
    var lg2 = cxCtx.createGain(); lg2.gain.value = 0.05; lfo2.connect(lg2); lg2.connect(cxMaster.gain); lfo2.start(); cxNodes.push(lfo2, lg2);
    return true;
  }
  function cxSetUI(on) {
    if (!cxEl) return;
    cxEl.classList.toggle("is-playing", on);
    var b = cxEl.querySelector(".cxa-btn"); if (b) b.setAttribute("aria-pressed", String(on));
    var l = cxEl.querySelector(".cxa-btn-label"); if (l) l.textContent = on ? "Pause" : "Play";
  }
  function cxPlay() {
    if (cxPlaying || !cxData) return;
    if (playing && audio) audio.pause();            // don't fight the live stream
    if (!cxCtx && !cxBuild(cxData.sr, cxData.kp)) return;
    if (cxCtx.state === "suspended") cxCtx.resume();
    cxPlaying = true;
    var t = cxCtx.currentTime;
    cxMaster.gain.cancelScheduledValues(t);
    cxMaster.gain.setValueAtTime(Math.max(0.0001, cxMaster.gain.value), t);
    cxMaster.gain.linearRampToValueAtTime(0.5, t + 3.5);
    cxSetUI(true);
  }
  function cxStop() {
    if (!cxPlaying || !cxCtx) return;
    cxPlaying = false;
    var t = cxCtx.currentTime;
    cxMaster.gain.cancelScheduledValues(t);
    cxMaster.gain.setValueAtTime(cxMaster.gain.value, t);
    cxMaster.gain.linearRampToValueAtTime(0, t + 1.8);
    cxSetUI(false);
  }
  function cxToggle() { cxPlaying ? cxStop() : cxPlay(); }
  function renderCosmicAudio(el, sr, kp) {
    cxEl = el; cxData = { sr: sr, kp: kp };
    var base = sr.nominal_hz || 7.83, root = Math.round(base * OCT_UP);
    var field = kpField(kp), det = sr.detected_hz;
    el.innerHTML =
      '<div class="cxa-card field-' + field.cls + '">' +
        '<button class="cxa-btn" type="button" aria-pressed="false" aria-label="Play or pause Cosmic Ambient">' +
          '<span class="cxa-orb" aria-hidden="true"><i></i><i></i><i></i></span>' +
          '<svg class="cxa-play" viewBox="0 0 256 256" width="22" height="22" aria-hidden="true"><path d="M232.4 114.5 88.3 26.6a16 16 0 0 0-24.3 13.5v175.8a16 16 0 0 0 24.3 13.5l144.1-87.9a15.9 15.9 0 0 0 0-27z"/></svg>' +
          '<svg class="cxa-pause" viewBox="0 0 256 256" width="22" height="22" aria-hidden="true"><path d="M216 48v160a16 16 0 0 1-16 16h-40a16 16 0 0 1-16-16V48a16 16 0 0 1 16-16h40a16 16 0 0 1 16 16ZM96 32H56a16 16 0 0 0-16 16v160a16 16 0 0 0 16 16h40a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16Z"/></svg>' +
        '</button>' +
        '<div class="cxa-info">' +
          '<span class="cxa-title">Cosmic Ambient <span class="cxa-btn-label">Play</span></span>' +
          '<p class="cxa-read">Voiced at <b>' + root + ' Hz</b> &mdash; Earth’s <b>' + base + ' Hz</b> resonance raised 5 octaves into hearing.' +
            (det ? ' Tracking today’s detected peak at <b>' + det + ' Hz</b>.' : '') + '</p>' +
          '<span class="cxa-field">Geomagnetic field: <b>' + field.label + '</b>' + (kp != null && !isNaN(kp) ? ' &middot; Kp ' + (Math.round(kp * 10) / 10) : '') + '</span>' +
        '</div>' +
      '</div>' +
      '<p class="micro-note">Generated live in your browser from the Schumann resonance (Zero Trust Radio &middot; Tomsk observatory) and NOAA space-weather data. Headphones recommended. Not medical or therapeutic &mdash; just the planet, made audible.</p>';
    el.querySelector(".cxa-btn").addEventListener("click", cxToggle);
  }
  function initCosmicAudio() {
    var el = doc.querySelector("[data-cosmic-audio]");
    if (!el) { if (cxPlaying) cxStop(); return; }   // left the Vibe page — stop the drone
    el.innerHTML = '<p class="rss-loading">Tuning to the planet&hellip;</p>';
    var srP = fetch("schumann.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var kpP = fetch("https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    Promise.all([srP, kpP]).then(function (res) {
      if (!el.isConnected) return;
      var sr = res[0] && res[0].available !== false ? res[0] : { nominal_hz: 7.83, detected_hz: null, harmonics_hz: [7.83], energy_score: 20, activity: "Calm" };
      var rows = res[1], kp = null;
      if (rows && rows.length) { var last = rows[rows.length - 1]; kp = parseFloat(last.Kp != null ? last.Kp : (Array.isArray(last) ? last[1] : NaN)); }
      renderCosmicAudio(el, sr, isNaN(kp) ? null : kp);
    });
  }

  /* =========================================================
     GOLDEN HOUR MODE — the site knows the exact minute the red rocks
     catch fire. As golden hour nears it shows a countdown; during it,
     the whole site warms and the badge counts down to the sun's edge.
     ========================================================= */
  function goldenModeState(now) {
    var g, win = null;
    try { g = goldenTimes(now); } catch (e) { return null; }
    var t = now.getTime(), HOUR = 3600000;
    var candidates = [
      { kind: "dawn", start: g.morning.b.sunrise, end: g.morning.b.goldMornEnd, edge: g.morning.b.goldMornEnd, edgeLabel: "climbs" },
      { kind: "dusk", start: g.evening.b.goldEveStart, end: g.evening.b.sunset, edge: g.evening.b.sunset, edgeLabel: "sunset" }
    ];
    candidates.forEach(function (c) {
      if (!c.start || !c.end) return;
      var s = c.start.getTime(), e = c.end.getTime();
      if (t >= s && t <= e) { if (!win || win.state !== "active") win = { state: "active", c: c, until: e }; }
      else if (t < s && s - t <= HOUR) { var cand = { state: "soon", c: c, until: s }; if (!win || (win.state === "soon" && cand.until < win.until)) win = win && win.state === "active" ? win : cand; }
    });
    return win;
  }
  var _goldTimer = null, _goldBadge = null, _goldDismissed = false;
  function goldCountdown(ms) {
    var m = Math.max(0, Math.round(ms / 60000));
    if (m >= 60) return Math.floor(m / 60) + "h " + (m % 60) + "m";
    return m + "m";
  }
  function goldenTick() {
    if (_goldDismissed) return;
    var st = goldenModeState(new Date());
    doc.body.classList.toggle("golden-hour", !!(st && st.state === "active"));
    if (!st) { if (_goldBadge) { _goldBadge.remove(); _goldBadge = null; } return; }
    if (!_goldBadge) {
      _goldBadge = doc.createElement("div");
      _goldBadge.className = "golden-badge";
      doc.body.appendChild(_goldBadge);
    }
    var msg, sub;
    if (st.state === "active") {
      msg = st.c.kind === "dusk" ? "Golden hour &mdash; the red rocks are glowing" : "Golden hour &mdash; first light on the rocks";
      sub = (st.c.kind === "dusk" ? "Sunset in " : "Sun climbs in ") + goldCountdown(st.until - Date.now());
    } else {
      msg = "Golden hour approaching";
      sub = "Starts in " + goldCountdown(st.until - Date.now());
    }
    _goldBadge.className = "golden-badge golden-badge--" + st.state;
    _goldBadge.innerHTML =
      '<span class="golden-badge-ic" aria-hidden="true">🌅</span>' +
      '<span class="golden-badge-body"><b>' + msg + '</b><span>' + sub + '</span></span>' +
      '<button class="golden-badge-x" type="button" aria-label="Dismiss">&times;</button>';
    _goldBadge.querySelector(".golden-badge-x").addEventListener("click", function () {
      _goldDismissed = true; doc.body.classList.remove("golden-hour");
      if (_goldBadge) { _goldBadge.remove(); _goldBadge = null; }
    });
  }
  function initGoldenMode() {
    goldenTick();
    if (_goldTimer) clearInterval(_goldTimer);
    _goldTimer = setInterval(goldenTick, 30000);
  }

  /* =========================================================
     SOLSTICE TRACKER — the wheel of the year. Real solstice/equinox
     moments computed from the sun's ecliptic longitude, the sun's live
     position on the wheel, declination, and the day-length trend.
     ========================================================= */
  function _solRad() { return Math.PI / 180; }
  function sunLon(date) {
    var rad = _solRad(), d = date.valueOf() / 86400000 - 0.5 + 2440588 - 2451545;
    var M = rad * (357.5291 + 0.98560028 * d);
    var L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
    return ((L / rad) % 360 + 360) % 360;
  }
  function sunDecl(date) {
    var rad = _solRad(), lam = sunLon(date) * rad, e = 23.4397 * rad;
    return Math.asin(Math.sin(e) * Math.sin(lam)) / rad;               // degrees
  }
  function dayLengthHrs(date, lat) {
    var rad = _solRad(), d = sunDecl(date) * rad, phi = lat * rad;
    var x = -Math.tan(phi) * Math.tan(d);
    if (x <= -1) return 24; if (x >= 1) return 0;
    return 2 * (Math.acos(x) / rad) / 15;
  }
  var SOL_EVENTS = [
    { lon: 0, name: "Spring Equinox", short: "Ostara" },
    { lon: 90, name: "Summer Solstice", short: "Litha" },
    { lon: 180, name: "Fall Equinox", short: "Mabon" },
    { lon: 270, name: "Winter Solstice", short: "Yule" }
  ];
  function solarEvents(now) {
    // scan forward ~400 days, refine each crossing to the hour
    var out = [], start = new Date(now.getTime()), prev = sunLon(start), pd = start;
    for (var i = 1; i <= 400 && out.length < 5; i++) {
      var d = new Date(+start + i * 86400000), lon = sunLon(d);
      SOL_EVENTS.forEach(function (ev) {
        var a = prev, b = lon, crossed = ev.lon === 0 ? (a > 300 && b < 60) : (a < ev.lon && b >= ev.lon);
        if (!crossed) return;
        // refine to the hour within [pd, d]
        var lo = +pd, hi = +d;
        for (var k = 0; k < 24; k++) {
          var mid = (lo + hi) / 2, lm = sunLon(new Date(mid));
          var target = ev.lon === 0 ? 360 : ev.lon, cur = (ev.lon === 0 && lm < 60) ? lm + 360 : lm;
          if (cur < target) lo = mid; else hi = mid;
        }
        out.push({ name: ev.name, short: ev.short, lon: ev.lon, date: new Date((lo + hi) / 2) });
      });
      prev = lon; pd = d;
    }
    return out;
  }
  function solsticeInfo(now, lat) {
    var events = solarEvents(now);
    if (!events.length) return null;
    var next = events[0], lonNow = sunLon(now);
    var days = Math.max(0, Math.round((next.date - now) / 86400000));
    var dl = dayLengthHrs(now, lat), dlPrev = dayLengthHrs(new Date(+now - 7 * 86400000), lat);
    var trendMin = Math.round((dl - dlPrev) / 7 * 60);                  // avg minutes/day over the last week
    var season = lonNow < 90 ? "Spring" : lonNow < 180 ? "Summer" : lonNow < 270 ? "Autumn" : "Winter";
    return { events: events, next: next, days: days, lonNow: lonNow, decl: sunDecl(now), dayLen: dl, trendMin: trendMin, season: season };
  }
  // map ecliptic longitude to a clockwise wheel angle with Summer at top
  function _wheelXY(lon, cx, cy, r) {
    var th = (lon - 90) * _solRad();
    return { x: cx + r * Math.sin(th), y: cy - r * Math.cos(th) };
  }
  function _arcPath(lonA, lonB, cx, cy, r) {
    var a = _wheelXY(lonA, cx, cy, r), b = _wheelXY(lonB, cx, cy, r);
    var large = ((lonB - lonA + 360) % 360) > 180 ? 1 : 0;
    return "M " + a.x.toFixed(2) + " " + a.y.toFixed(2) + " A " + r + " " + r + " 0 " + large + " 1 " + b.x.toFixed(2) + " " + b.y.toFixed(2);
  }
  var SOL_SEASONS = [
    { a: 0, b: 90, color: "#57b36b" },    // spring  (Ostara → Litha)
    { a: 90, b: 180, color: "#ecb63e" },  // summer  (Litha → Mabon)
    { a: 180, b: 270, color: "#dd7a3a" }, // autumn  (Mabon → Yule)
    { a: 270, b: 360, color: "#6f8fd6" }  // winter  (Yule → Ostara)
  ];
  function renderSolstice(el, s) {
    var cx = 100, cy = 100, r = 74;
    var active = s.lonNow < 90 ? 0 : s.lonNow < 180 ? 1 : s.lonNow < 270 ? 2 : 3;
    var arcs = SOL_SEASONS.map(function (se, i) {
      return '<path d="' + _arcPath(se.a, se.b, cx, cy, r) + '" class="sol-arc' + (i === active ? " sol-arc--on" : "") + '" stroke="' + se.color + '"/>';
    }).join("");
    // comet trail: bright streak of the ~26° the sun just travelled
    var trail = '<path d="' + _arcPath((s.lonNow - 26 + 360) % 360, s.lonNow, cx, cy, r) + '" class="sol-trail"/>';
    var pos = { 0: ["end", 8, 4], 90: ["middle", 0, -9], 180: ["start", -8, 4], 270: ["middle", 0, 17] };
    var nodes = "", labels = "";
    SOL_EVENTS.forEach(function (ev) {
      var p = _wheelXY(ev.lon, cx, cy, r), lp = _wheelXY(ev.lon, cx, cy, r + 16), a = pos[ev.lon];
      var isNext = ev.name === s.next.name;
      nodes += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (isNext ? 6 : 4) + '" class="sol-node' + (isNext ? " sol-node--next" : "") + '"/>';
      labels += '<text x="' + (lp.x + a[1]).toFixed(1) + '" y="' + (lp.y + a[2]).toFixed(1) + '" text-anchor="' + a[0] + '" class="sol-lbl' + (isNext ? " sol-lbl--next" : "") + '">' + ev.short + '</text>';
    });
    var sun = _wheelXY(s.lonNow, cx, cy, r);
    var sx = sun.x.toFixed(1), sy = sun.y.toFixed(1);
    var hrs = Math.floor(s.dayLen), mins = Math.round((s.dayLen - hrs) * 60);
    var dateStr = s.next.date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    var trendWord = Math.abs(s.trendMin) < 1 ? "holding steady" : s.trendMin > 0 ? "gaining light" : "losing light";
    var trendNum = (s.trendMin > 0 ? "+" : s.trendMin < 0 ? "" : "±") + s.trendMin;
    el.innerHTML =
      '<div class="sol-card">' +
        '<div class="sol-wheel">' +
          '<svg viewBox="-48 -4 296 208" aria-hidden="true">' +
            '<defs><radialGradient id="solSunG" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#fff6df"/><stop offset="55%" stop-color="#ffcf7a"/><stop offset="100%" stop-color="#f0993f"/></radialGradient></defs>' +
            '<circle cx="100" cy="100" r="74" class="sol-base"/>' +
            arcs + trail + nodes + labels +
            '<circle cx="' + sx + '" cy="' + sy + '" r="13" class="sol-sun-glow"/>' +
            '<circle cx="' + sx + '" cy="' + sy + '" r="7" class="sol-sun"/>' +
          '</svg>' +
          '<div class="sol-center"><span class="sol-days">' + s.days + '</span><span class="sol-days-k">days to<br>' + esc(s.next.short) + '</span></div>' +
        '</div>' +
        '<div class="sol-info">' +
          '<span class="sol-season">' + s.season + ' &middot; the wheel turns</span>' +
          '<h4 class="sol-next">Next: ' + s.next.name + '</h4>' +
          '<p class="sol-when">' + dateStr + ' &mdash; ' + s.days + ' day' + (s.days === 1 ? "" : "s") + ' away</p>' +
          '<div class="sol-stats">' +
            '<div class="sol-stat"><b>' + hrs + 'h ' + mins + 'm</b><span>daylight today</span></div>' +
            '<div class="sol-stat"><b>' + (s.decl >= 0 ? "+" : "") + s.decl.toFixed(1) + '&deg;</b><span>sun declination</span></div>' +
            '<div class="sol-stat"><b>' + trendNum + ' min</b><span>' + trendWord + '</span></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="micro-note">Solstice and equinox moments computed from the sun’s ecliptic longitude; daylight and declination for Sedona’s latitude. The colored ring is the year&rsquo;s four seasons; the glowing sun is where we are on it right now.</p>';
  }
  function initSolstice() {
    var el = doc.querySelector("[data-solstice]");
    if (!el) return;
    var s;
    try { s = solsticeInfo(new Date(), 34.8697); } catch (e) { el.innerHTML = ""; return; }
    if (!s) { el.innerHTML = ""; return; }
    renderSolstice(el, s);
  }

  /* =========================================================
     CONCERTS (Ticketmaster Discovery API, direct)
     ========================================================= */
  // Paste your free Ticketmaster "Consumer Key" here to go live:
  // developer.ticketmaster.com -> My Apps -> Consumer Key
  var TM_KEY = "H39V0X17gyaXgi9T85ChGhGWsk3gTPdr";
  var CONCERT_ARTISTS = [
    "Eagles", "Don Henley", "Joe Walsh", "Fleetwood Mac", "Stevie Nicks", "Lindsey Buckingham",
    "Steely Dan", "The Doobie Brothers", "Michael McDonald", "Chicago", "Toto", "Boz Scaggs",
    "Christopher Cross", "Kenny Loggins", "Steve Winwood", "Hall & Oates", "Daryl Hall", "John Oates",
    "James Taylor", "Jackson Browne", "Graham Nash", "Stephen Stills", "Bonnie Raitt",
    "America", "Little River Band", "Air Supply", "The Beach Boys", "Seals & Crofts",
    "Earth, Wind & Fire", "Lionel Richie", "The Commodores", "Three Dog Night",
    "Bachman-Turner Overdrive", ".38 Special", "Lynyrd Skynyrd", "The Marshall Tucker Band",
    "Firefall", "Ambrosia", "Pablo Cruise", "Player", "Al Stewart", "Poco", "Orleans",
    "The Guess Who", "Dave Mason", "Gino Vannelli", "Robbie Dupree",
    "Jim Messina", "Loggins & Messina", "England Dan & John Ford Coley", "Stephen Bishop",
    "Rupert Holmes", "Gerry Rafferty", "Atlanta Rhythm Section", "Looking Glass",
    "David Gates", "Climax Blues Band", "Nicolette Larson", "Rita Coolidge",
    "Kim Carnes", "Maria Muldaur", "Carole King", "Linda Ronstadt"
  ];
  // Southwest / Four Corners footprint: searched by geo radius, then state-gated.
  var SW_STATES = { AZ: 1, NM: 1, NV: 1, CA: 1, UT: 1, CO: 1 };
  function tmMatch(e, artist) {
    var a = artist.toLowerCase(), atts = (e._embedded && e._embedded.attractions) || [];
    // exact attraction match keeps tribute bands out; fall back to name only if no attractions
    if (atts.length) return atts.some(function (x) { return (x.name || "").toLowerCase() === a; });
    return (e.name || "").toLowerCase().indexOf(a) >= 0;
  }
  function pickImage(imgs) {
    imgs = imgs || [];
    var w = imgs.filter(function (i) { return i.ratio === "16_9" && i.width >= 600; }).sort(function (a, b) { return a.width - b.width; })[0];
    return ((w || imgs.filter(function (i) { return i.ratio === "16_9"; })[0] || imgs[0]) || {}).url || "";
  }
  function fetchArtistShows(artist) {
    var url = "https://app.ticketmaster.com/discovery/v2/events.json?apikey=" + TM_KEY +
      "&classificationName=Music&latlong=36.0,-110.5&radius=550&unit=miles&sort=date,asc&size=20&keyword=" + encodeURIComponent(artist);
    return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var evs = (d && d._embedded && d._embedded.events) || [];
      return evs.filter(function (e) { return tmMatch(e, artist); }).map(function (e) {
        var v = (e._embedded && e._embedded.venues && e._embedded.venues[0]) || {};
        var st = (e.dates && e.dates.start) || {};
        var pr = (e.priceRanges && e.priceRanges[0]) || null;
        var others = ((e._embedded && e._embedded.attractions) || []).map(function (a) { return a.name; })
          .filter(function (n) { return n && n.toLowerCase() !== artist.toLowerCase(); });
        return {
          id: e.id, artist: artist, date: st.localDate || "", time: st.localTime || "",
          venue: v.name || "", city: (v.city && v.city.name) || "", state: (v.state && v.state.stateCode) || "",
          url: e.url || "", img: pickImage(e.images),
          price: pr ? Math.round(pr.min) : null,
          status: (e.dates && e.dates.status && e.dates.status.code) || "",
          saleStart: (e.sales && e.sales.public && e.sales.public.startDateTime) || "",
          lineup: others.slice(0, 2)
        };
      }).filter(function (x) { return SW_STATES[x.state]; });
    }).catch(function () { return []; });
  }
  function concertWhen(date, time) {
    var d = new Date(date + "T" + (time || "20:00:00"));
    if (isNaN(d)) return "";
    var day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return time ? day + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : day;
  }
  function concertStatus(e) {
    var s = (e.status || "").toLowerCase();
    if (s === "onsale") return '<span class="cstat cstat--on">On sale</span>';
    if (e.saleStart && new Date(e.saleStart).getTime() > Date.now())
      return '<span class="cstat cstat--soon">On sale ' + esc(new Date(e.saleStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })) + '</span>';
    if (s === "offsale") return '<span class="cstat">Off sale</span>';
    if (s) return '<span class="cstat cstat--alert">' + esc(s.charAt(0).toUpperCase() + s.slice(1)) + '</span>';
    return "";
  }
  function renderConcerts(box, items) {
    if (!items.length) { box.innerHTML = '<p class="embed-note">No upcoming shows listed right now &mdash; we\'ll keep watching the wire.</p>'; return; }
    box.innerHTML = items.slice(0, 60).map(function (e) {
      var d = new Date(e.date + "T" + (e.time || "20:00:00"));
      var mo = isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short" });
      var day = isNaN(d) ? "" : d.getDate();
      var place = [e.venue, [e.city, e.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
      var btnLabel = (!e.status || (e.status || "").toLowerCase() === "onsale") ? "Tickets" : "Details";
      return '<article class="concert">' +
        '<div class="concert-date"><span class="cd-mo">' + esc(mo) + '</span><span class="cd-day">' + esc(day) + '</span></div>' +
        (e.img ? '<img class="concert-thumb" src="' + esc(e.img) + '" alt="" loading="lazy" onerror="this.remove()" />' : '') +
        '<div class="concert-info"><h3>' + esc(e.artist) + '</h3>' +
          (e.lineup && e.lineup.length ? '<p class="concert-lineup">with ' + esc(e.lineup.join(", ")) + '</p>' : '') +
          (place ? '<p class="concert-venue">' + esc(place) + '</p>' : '') +
          (concertWhen(e.date, e.time) ? '<p class="concert-when">' + esc(concertWhen(e.date, e.time)) + '</p>' : '') +
        '</div>' +
        '<div class="concert-meta">' + (e.price ? '<span class="concert-price">From $' + e.price + '</span>' : '') + concertStatus(e) + '</div>' +
        (e.url ? '<a class="btn btn-primary concert-btn" href="' + esc(e.url) + '" target="_blank" rel="noopener">' + btnLabel + '</a>' : '') +
        '</article>';
    }).join("");
  }
  // ---- festivals (multi-day music festivals across the Southwest) ----
  // Festivals are built server-side (scripts/fetch-festivals.mjs, refreshed by CI)
  // and read same-origin so the page doesn't spend the Ticketmaster quota per visit.
  function loadFestivals() {
    return fetch("festivals.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return (d && d.festivals) || []; }).catch(function () { return []; });
  }
  function festDateRange(s, e) {
    if (!s) return "";
    var ds = new Date(s + "T12:00:00"), de = e ? new Date(e + "T12:00:00") : ds;
    if (!e || e === s) return ds.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    var o = { month: "short", day: "numeric" };
    return ds.toLocaleDateString("en-US", o) + " – " + de.toLocaleDateString("en-US", o) + ", " + de.getFullYear();
  }
  function festCard(f) {
    var loc = [f.city, f.state].filter(Boolean).join(", ");
    var banner = f.img
      ? '<img class="fest-img" src="' + esc(f.img) + '" alt="" loading="lazy" onerror="this.style.display=\'none\'" />'
      : (f.marquee ? '<div class="fest-img fest-img--name"><span>' + esc(f.name) + '</span></div>' : "");
    var tag = f.marquee ? '<span class="fest-az fest-marquee">Bucket list</span>'
      : (f.state === "AZ" ? '<span class="fest-az">Arizona</span>'
        : (f.genre && f.genre !== "Undefined" && f.genre !== "Other" ? '<span class="fest-genre">' + esc(f.genre) + '</span>' : ""));
    var when = f.marquee ? esc(f.when || "Annual") : esc(festDateRange(f.start, f.end));
    return '<article class="fest-card' + (f.marquee ? " fest-card--marquee" : "") + '">' + banner +
      '<div class="fest-body">' + tag +
        '<h3>' + esc(f.name) + '</h3>' +
        '<p class="fest-when">' + when + '</p>' +
        (loc ? '<p class="fest-loc">' + esc(loc) + '</p>' : '') +
        (f.url ? '<a class="btn btn-primary fest-btn" href="' + esc(f.url) + '" target="_blank" rel="noopener">' + (f.marquee ? "Tickets &amp; info" : "Tickets &amp; lineup") + '</a>' : '') +
      '</div></article>';
  }
  function renderFestivals(box, fests) {
    // Southwest dated festivals first; the bucket-list legends tuck into a
    // collapsible section below so they don't crowd the regional listings.
    var sw = fests.filter(function (f) { return !f.marquee; });
    var bucket = fests.filter(function (f) { return f.marquee; });
    var html = sw.length
      ? '<div class="festival-grid">' + sw.map(festCard).join("") + '</div>'
      : '<p class="embed-note">No Southwest festivals on the calendar right now &mdash; we\'ll surface them as they\'re announced.</p>';
    if (bucket.length) {
      html += '<details class="fest-bucket">' +
        '<summary><span class="fest-bucket-head"><span class="fest-bucket-title">Bucket-list festivals</span>' +
        '<span class="fest-bucket-sub">' + bucket.length + ' legendary events worth the trip &mdash; worldwide</span></span>' +
        '<span class="fest-bucket-chev" aria-hidden="true"></span></summary>' +
        '<div class="festival-grid fest-bucket-grid">' + bucket.map(festCard).join("") + '</div>' +
        '</details>';
    }
    box.innerHTML = html;
  }

  var CONCERT_CACHE = "mmr_concerts_v7", CONCERT_TTL = 6 * 3600 * 1000; // 6h browser cache (eases API quota)
  // Concerts are built server-side too (scripts/fetch-concerts.mjs via CI) so the
  // full list is reliable instead of depending on a throttled per-visitor call.
  function loadConcertsJson() {
    return fetch("concerts.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { return (d && d.concerts) || []; }).catch(function () { return []; });
  }
  // Fallback: fetch live from Ticketmaster in-browser if the relay file is missing.
  function liveConcerts(box) {
    if (!TM_KEY) { box.innerHTML = '<p class="embed-note">Concert listings are tuning in shortly.</p>'; return; }
    try {
      var hit = JSON.parse(localStorage.getItem(CONCERT_CACHE) || "null");
      if (hit && hit.items && hit.items.length && (Date.now() - hit.t) < CONCERT_TTL) { renderConcerts(box, hit.items); return; }
    } catch (e) {}
    Promise.all(CONCERT_ARTISTS.map(fetchArtistShows)).then(function (lists) {
      var all = [], seen = {};
      lists.forEach(function (l) { l.forEach(function (e) { all.push(e); }); });
      all.sort(function (a, b) { return (a.state === "AZ" ? 0 : 1) - (b.state === "AZ" ? 0 : 1) || (a.date + a.time).localeCompare(b.date + b.time); });
      var items = all.filter(function (e) { if (seen[e.id]) return false; seen[e.id] = 1; return true; });
      try { localStorage.setItem(CONCERT_CACHE, JSON.stringify({ t: Date.now(), items: items })); } catch (e) {}
      renderConcerts(box, items);
    }).catch(function () { box.innerHTML = '<p class="embed-note">Concert listings are unavailable right now.</p>'; });
  }
  function initConcerts() {
    var box = doc.querySelector("[data-concerts]"), fbox = doc.querySelector("[data-festivals]");
    if (!box && !fbox) return;
    // Festivals: independent + cheap (served from festivals.json by the CI relay)
    if (fbox) {
      if (!fbox.children.length) fbox.innerHTML = '<p class="rss-loading">Scanning the festival circuit&hellip;</p>';
      loadFestivals().then(function (f) { if (fbox.isConnected) renderFestivals(fbox, f); });
    }
    if (!box) return;
    box.innerHTML = '<p class="rss-loading">Finding shows on the mellow side of the dial&hellip;</p>';
    loadConcertsJson().then(function (items) {
      if (!box.isConnected) return;
      if (items.length) { renderConcerts(box, items); return; }
      liveConcerts(box); // relay file not there yet — fall back to live
    });
  }

  /* =========================================================
     MOVIES (Sedona showtimes via showtimes.json, refreshed by CI)
     ========================================================= */
  function renderShowtimes(box, items) {
    if (!items.length) { box.innerHTML = '<p class="embed-note">No screenings posted right now &mdash; check back soon.</p>'; return; }
    box.innerHTML = items.slice(0, 60).map(function (e) {
      var d = new Date(e.date + "T" + (e.time || "19:00") + ":00");
      var dShort = isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
      var when = isNaN(d) ? "" : d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) + (e.time ? " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
      var place = [e.venue, e.city].filter(Boolean).join(" · ");
      var img = !!e.image;
      return '<article class="film-card' + (img ? "" : " film-card--noimg") + '" tabindex="0" aria-label="' + esc(e.title) + '">' +
        '<div class="film-inner">' +
          '<div class="film-front">' +
            (img ? '<img class="film-poster" src="' + esc(e.image) + '" alt="" loading="lazy" onerror="this.closest(\'.film-card\').classList.add(\'film-card--noimg\')" />' : '') +
            '<span class="film-flip" aria-hidden="true">&#8635;</span>' +
            '<div class="film-front-meta">' + (dShort ? '<span class="film-date">' + esc(dShort) + '</span>' : '') + '<h3>' + esc(e.title) + '</h3></div>' +
          '</div>' +
          '<div class="film-back">' +
            '<h3>' + esc(e.title) + '</h3>' +
            (when ? '<p class="film-when">' + esc(when) + '</p>' : '') +
            (place ? '<p class="film-venue">' + esc(place) + '</p>' : '') +
            (e.summary ? '<p class="film-summary">' + esc(e.summary) + '</p>' : '') +
            (e.url ? '<a class="btn btn-primary" href="' + esc(e.url) + '" target="_blank" rel="noopener">Details &amp; tickets</a>' : '') +
          '</div>' +
        '</div>' +
        '</article>';
    }).join("");
  }
  function initMovies() {
    var box = doc.querySelector("[data-showtimes]");
    if (!box) return;
    if (!box.children.length) box.innerHTML = '<p class="rss-loading">Loading Sedona showtimes&hellip;</p>';
    fetch("showtimes.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("showtimes"); return r.json(); })
      .then(function (d) { renderShowtimes(box, (d && d.showings) || []); })
      .catch(function () { box.innerHTML = '<p class="embed-note">Showtimes are unavailable right now.</p>'; });
  }

  /* =========================================================
     LIBRARY EVENTS (Community Library Sedona via library-events.json)
     ========================================================= */
  function libCatClass(cat) {
    var c = (cat || "").toLowerCase();
    if (/youth|teen|kid|story|steam|camp/.test(c)) return "cat-youth";
    if (/exhibit|art|display|gallery/.test(c)) return "cat-art";
    if (/nonprofit|community|civic/.test(c)) return "cat-comm";
    if (/library|book|author|read|writ|lang|conversation/.test(c)) return "cat-book";
    return "cat-default";
  }
  function renderLibrary(box, items) {
    if (!items.length) { box.innerHTML = '<p class="embed-note">No upcoming events posted right now &mdash; check back soon.</p>'; return; }
    items = items.slice(0, 60);
    var cats = [], seen = {};
    items.forEach(function (e) { var c = e.category || "Other"; if (!seen[c]) { seen[c] = 1; cats.push(c); } });
    cats.sort();
    var chips = '<button class="chip is-active" data-filter="all">All <span>' + items.length + '</span></button>' +
      cats.map(function (c) {
        var n = items.filter(function (e) { return (e.category || "Other") === c; }).length;
        return '<button class="chip ' + libCatClass(c) + '" data-filter="' + esc(c) + '">' + esc(c) + ' <span>' + n + '</span></button>';
      }).join("");
    var cards = items.map(function (e) {
      var d = new Date(e.date + "T" + (e.time || "09:00") + ":00");
      var dow = isNaN(d) ? "" : d.toLocaleDateString("en-US", { weekday: "short" });
      var dnum = isNaN(d) ? "" : d.getDate();
      var mon = isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short" });
      var t = e.time ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "All day";
      var meta = [dow, t, e.location].filter(Boolean).join(" · ");
      var cat = e.category || "Other";
      return '<article class="lev ' + libCatClass(cat) + '" data-cat="' + esc(cat) + '">' +
        '<div class="lev-badge"><span class="lev-dnum">' + esc(dnum) + '</span><span class="lev-mon">' + esc(mon) + '</span></div>' +
        '<div class="lev-body"><span class="lev-cat">' + esc(cat) + '</span>' +
          '<h3>' + esc(e.title) + '</h3>' +
          (meta ? '<p class="lev-meta">' + esc(meta) + '</p>' : '') +
          (e.url ? '<a class="lev-link" href="' + esc(e.url) + '" target="_blank" rel="noopener">Details &#8594;</a>' : '') +
        '</div></article>';
    }).join("");
    box.innerHTML = '<div class="lev-filters">' + chips + '</div><div class="lev-grid">' + cards + '</div>';
    var chipEls = box.querySelectorAll(".chip"), grid = box.querySelector(".lev-grid");
    chipEls.forEach(function (ch) {
      ch.addEventListener("click", function () {
        chipEls.forEach(function (x) { x.classList.remove("is-active"); });
        ch.classList.add("is-active");
        var f = ch.getAttribute("data-filter");
        grid.querySelectorAll(".lev").forEach(function (card) {
          card.style.display = (f === "all" || card.getAttribute("data-cat") === f) ? "" : "none";
        });
      });
    });
  }
  function initLibrary() {
    var box = doc.querySelector("[data-library]");
    if (!box) return;
    if (!box.children.length) box.innerHTML = '<p class="rss-loading">Loading library events&hellip;</p>';
    fetch("library-events.json", { cache: "no-store" }).then(function (r) { if (!r.ok) throw new Error("library"); return r.json(); })
      .then(function (d) { renderLibrary(box, (d && d.events) || []); })
      .catch(function () { box.innerHTML = '<p class="embed-note">Library events are unavailable right now.</p>'; });
  }

  function initPage() {
    initReveal();
    initScoreboards();
    initFeeds();
    initConcerts();
    initMovies();
    initLibrary();
    initHeritage();
    initSchedule();
    initWeather();
    initFire();
    initAlerts();
    initAdventures();
    initCreek();
    initSlide();
    initTrailMaps();
    initTraffic();
    initSchumann();
    initCosmic();
    initStargaze();
    initGolden();
    initCosmicAudio();
    initGoldenMode();
    initSolstice();
    renderRotationWall();
    renderPodcasts();
    syncListenUI();
    renderNow(lastNowData);
    onScroll();
  }

  /* =========================================================
     CLIENT-SIDE ROUTER (audio keeps playing across pages)
     ========================================================= */
  var pageCache = {};
  function cacheKey(href) { try { return new URL(href, location.href).pathname; } catch (e) { return href; } }
  function isInternalPage(pathname) { return pathname === "/" || /\.html$/.test(pathname); }
  function prefetch(href) {
    var k = cacheKey(href);
    if (pageCache[k]) return;
    fetch(href).then(function (r) { return r.ok ? r.text() : null; }).then(function (t) { if (t) pageCache[k] = t; }).catch(function () {});
  }
  function scrollToHash(hash) {
    try { var el = doc.querySelector(hash); if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: "smooth" }); return; } } catch (e) {}
    window.scrollTo(0, 0);
  }
  function swapIn(html, href, push) {
    var main = doc.getElementById("main");
    var dp = new DOMParser().parseFromString(html, "text/html");
    var nm = dp.getElementById("main");
    if (!main || !nm) { location.href = href; return; }
    main.innerHTML = nm.innerHTML;
    var key = dp.body.getAttribute("data-page") || "";
    doc.body.setAttribute("data-page", key);
    DEFAULT_TITLE = dp.title || DEFAULT_TITLE;
    doc.title = DEFAULT_TITLE;
    updateNavActive(key);
    closeMegas(); closeNav();
    if (push) history.pushState({}, "", href);
    main.classList.remove("is-leaving");
    initPage();
    updateTabTitle();
    var u = new URL(href, location.href);
    if (u.hash) scrollToHash(u.hash); else window.scrollTo(0, 0);
  }
  function navigate(href, push) {
    var main = doc.getElementById("main");
    if (!main) { location.href = href; return; }
    main.classList.add("is-leaving");
    var key = cacheKey(href);
    var go = function (html) { setTimeout(function () { swapIn(html, href, push); }, 150); };
    if (pageCache[key]) return go(pageCache[key]);
    fetch(href).then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (html) { pageCache[key] = html; go(html); })
      .catch(function () { location.href = href; });
  }
  doc.addEventListener("click", function (e) {
    if (e.defaultPrevented) return;
    var a = e.target.closest("a");
    if (!a || a.target || a.hasAttribute("download")) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var raw = a.getAttribute("href");
    if (!raw || raw.charAt(0) === "#") return;
    var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (u.origin !== location.origin || !isInternalPage(u.pathname)) return;
    e.preventDefault();
    if (u.pathname === location.pathname) {
      if (u.hash) { history.pushState({}, "", u.href); scrollToHash(u.hash); }
      else window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    navigate(u.href, true);
  });
  doc.addEventListener("mouseover", function (e) {
    var a = e.target.closest("a");
    if (!a || a.target) return;
    var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (u.origin === location.origin && isInternalPage(u.pathname) && u.pathname !== location.pathname) prefetch(u.pathname);
  });
  window.addEventListener("popstate", function () { navigate(location.href, false); });

  /* =========================================================
     PWA — service worker + install prompt
     ========================================================= */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function () {
      var hadController = !!navigator.serviceWorker.controller, reloaded = false;
      navigator.serviceWorker.register("/sw.js").then(function (reg) {
        // proactively check for a newer version on each load
        if (reg.update) reg.update();
      }).catch(function () {});
      // when a new SW takes control (a fresh deploy), reload once to show it —
      // but not on the very first install (nothing to refresh to yet)
      navigator.serviceWorker.addEventListener("controllerchange", function () {
        if (!hadController || reloaded) return;
        reloaded = true; window.location.reload();
      });
    });
  }
  // "Listen Live" app shortcut (/?play=1) — best-effort; if the browser blocks
  // autoplay, togglePlay() cleanly resets, so nothing gets stuck.
  try {
    if (/[?&]play=1\b/.test(location.search) && typeof togglePlay === "function") {
      window.addEventListener("load", function () { setTimeout(togglePlay, 400); });
    }
  } catch (e) {}

  // Install prompt: show a small, dismissible chip only when the browser says
  // the app is installable; hide it on install or dismiss. Remembers dismissal.
  var deferredPrompt = null, installChip = null;
  var INSTALL_DISMISS = "kazm-install-dismissed";
  function removeChip() { if (installChip) { installChip.remove(); installChip = null; } }
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    var dismissed = false;
    try { dismissed = localStorage.getItem(INSTALL_DISMISS) === "1"; } catch (_) {}
    if (dismissed || installChip) return;
    installChip = doc.createElement("div");
    installChip.className = "pwa-install";
    installChip.innerHTML =
      '<button type="button" class="pwa-install-go"><span aria-hidden="true">⬇</span> Install KAZM App</button>' +
      '<button type="button" class="pwa-install-x" aria-label="Dismiss">&times;</button>';
    installChip.querySelector(".pwa-install-go").addEventListener("click", function () {
      var p = deferredPrompt; removeChip();
      if (!p) return;
      p.prompt();
      if (p.userChoice && p.userChoice.finally) p.userChoice.finally(function () { deferredPrompt = null; });
    });
    installChip.querySelector(".pwa-install-x").addEventListener("click", function () {
      try { localStorage.setItem(INSTALL_DISMISS, "1"); } catch (_) {}
      removeChip();
    });
    doc.body.appendChild(installChip);
  });
  window.addEventListener("appinstalled", function () { removeChip(); deferredPrompt = null; });

  /* ---------- first paint ---------- */
  initPage();
})();
