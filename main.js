/* build: astrology-live-2 */
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
        '<img src="Color%20logo%20-%20no%20background.svg" alt="KAZM 106.5 FM and 780 AM, Mellow Mountain Radio" class="brand-logo brand-logo--light" width="109" height="100" />' +
        '<img src="White%20logo%20-%20no%20background.svg" alt="" aria-hidden="true" class="brand-logo brand-logo--dark" width="109" height="100" />' +
      '</a>' +
      '<nav class="primary-nav" aria-label="Primary"><ul class="nav-list">' +
        '<li data-nav="home"><a href="index.html">Home</a></li>' +
        '<li class="has-menu" data-nav="news"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">News &amp; Weather</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="weather.html">Weather &amp; Radar</a><a role="menuitem" href="roads.html">Roads &amp; Traffic</a><a role="menuitem" href="news.html#local">Local News</a><a role="menuitem" href="news.html#national">National News</a><a role="menuitem" href="news.html#world">World News</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="sports"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Sports</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="sports.html#mlb">MLB &middot; Diamondbacks</a><a role="menuitem" href="sports.html#nba">NBA &middot; Suns</a><a role="menuitem" href="sports.html#nfl">NFL &middot; Cardinals</a><a role="menuitem" href="sports.html#college">College &middot; ASU, U of A, NAU</a><a role="menuitem" href="sports.html#ufc">UFC</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="music"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Music &amp; More</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="timemachine.html">Song Time Machine</a><a role="menuitem" href="concerts.html">Concerts</a><a role="menuitem" href="movies.html">Movies</a><a role="menuitem" href="shows.html">Shows</a><a role="menuitem" href="podcasts.html">Podcasts</a><a role="menuitem" href="schedule.html">Program Schedule</a><a role="menuitem" href="contests.html">Contests</a><a role="menuitem" href="music.html">The Sound</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="events"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Events</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="jeeptrails.html">Jeep Trails</a><a role="menuitem" href="library.html">Library Events</a><a role="menuitem" href="events.html#hiking">Hiking</a><a role="menuitem" href="events.html#biking">Mountain Biking</a><a role="menuitem" href="events.html#creek">Oak Creek</a><a role="menuitem" href="events.html#slide-rock">Slide Rock</a><a role="menuitem" href="events.html#ski">Ski Report</a><a role="menuitem" href="photography.html">Photography</a><a role="menuitem" href="events.html#geocaching">Geocaching</a><a role="menuitem" href="events.html">All Adventures</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="vibe"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">The Vibe</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="vibe.html">Cosmic Conditions</a><a role="menuitem" href="horoscope.html">Astrology</a><a role="menuitem" href="chakras.html">Chakras &amp; Tarot</a><a role="menuitem" href="soundhealing.html">Sound Healing</a><a role="menuitem" href="wildlife.html">Seen around Sedona</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="about"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">About</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="about.html">About KAZM</a><a role="menuitem" href="rewind.html">The Listeners&rsquo; Lounge</a><a role="menuitem" href="firstpeoples.html">First Peoples</a><a role="menuitem" href="archives.html">KAZM Archives</a><a role="menuitem" href="ifoughtthelaw.html">I Fought the Law&hellip;</a><a role="menuitem" href="staff.html">Staff</a><a role="menuitem" href="advertising.html">Advertising</a><a role="menuitem" href="contact.html">Contact</a>' +
        '</div></li>' +
      '</ul></nav>' +
      '<div class="header-actions">' +
        '<button class="listen-btn" data-listen aria-pressed="false" aria-label="Listen live"><span class="listen-icon" aria-hidden="true">' + ICON_PLAY + ICON_PAUSE + '</span><span class="listen-label" data-listen-label>Listen Live</span></button>' +
        '<button class="menu-toggle" data-menu-toggle aria-expanded="false" aria-label="Open menu"><span></span><span></span><span></span></button>' +
      '</div>' +
    '</div></header>';

  var FOOTER_HTML =
    '<footer class="site-footer"><div class="wrap footer-grid">' +
      '<div class="footer-brand">' +
        '<img src="White%20logo%20-%20no%20background.svg" alt="KAZM 106.5 FM and 780 AM, Mellow Mountain Radio" class="footer-logo" width="109" height="100" />' +
        '<p class="footer-tag">The sound of Sedona since 1974. Soft oldies, yacht rock, and the news that matters here.</p>' +
        '<div class="social" aria-label="Social media">' +
          '<a href="https://www.facebook.com/profile.php?id=61552335103946" target="_blank" rel="noopener" aria-label="Facebook"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.95.93-1.95 1.89v2.25h3.32l-.53 3.49h-2.79V24C19.61 23.1 24 18.1 24 12.07Z"/></svg></a>' +
          '<a href="https://www.instagram.com/mellowmountainradio/" target="_blank" rel="noopener" aria-label="Instagram"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 3.68A6.16 6.16 0 1 0 18.16 12 6.16 6.16 0 0 0 12 5.84Zm0 10.16A4 4 0 1 1 16 12a4 4 0 0 1-4 4Zm6.41-10.85a1.44 1.44 0 1 0 1.44 1.44 1.44 1.44 0 0 0-1.44-1.44Z"/></svg></a>' +
          '<a href="https://www.youtube.com/channel/UCt3gbxEFSkV8roRdnqBefog" target="_blank" rel="noopener" aria-label="YouTube"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M23.5 6.2a3 3 0 0 0-2.12-2.13C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.52A3 3 0 0 0 .5 6.2 31.4 31.4 0 0 0 0 12a31.4 31.4 0 0 0 .5 5.8 3 3 0 0 0 2.12 2.13c1.88.52 9.38.52 9.38.52s7.5 0 9.38-.52a3 3 0 0 0 2.12-2.13A31.4 31.4 0 0 0 24 12a31.4 31.4 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6Z"/></svg></a>' +
          '<a href="https://twitter.com/mellowmountain1" target="_blank" rel="noopener" aria-label="X"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M18.9 2H22l-7.1 8.1L23.3 22h-6.6l-5.2-6.8L5.6 22H2.5l7.6-8.7L1 2h6.8l4.7 6.2Zm-1.2 18h1.8L7.4 3.8H5.5Z"/></svg></a>' +
        '</div>' +
      '</div>' +
      '<nav class="footer-col" aria-label="Listen"><h4>Listen</h4><a href="index.html">Home</a><a href="concerts.html">Concerts</a><a href="movies.html">Movies</a><a href="shows.html">Shows</a><a href="schedule.html">Program Schedule</a><a href="timemachine.html">Song Time Machine</a><a href="music.html">Music &amp; More</a><a href="podcasts.html">Podcasts</a></nav>' +
      '<nav class="footer-col" aria-label="Community"><h4>Community</h4><a href="news.html">News</a><a href="sports.html">Sports</a><a href="weather.html">Weather</a><a href="roads.html">Roads &amp; Traffic</a><a href="firstpeoples.html">First Peoples</a><a href="library.html">Library Events</a><a href="events.html">Events</a><a href="photography.html">Photography</a><a href="contests.html">Contests</a></nav>' +
      '<nav class="footer-col" aria-label="The Vibe"><h4>The Vibe</h4><a href="vibe.html">Cosmic Conditions</a><a href="horoscope.html">Astrology</a><a href="chakras.html">Chakras &amp; Tarot</a><a href="soundhealing.html">Sound Healing</a><a href="wildlife.html">Seen around Sedona</a></nav>' +
      '<nav class="footer-col" aria-label="Station"><h4>Station</h4><a href="about.html">About</a><a href="rewind.html">Listeners&rsquo; Lounge</a><a href="archives.html">KAZM Archives</a><a href="ifoughtthelaw.html">I Fought the Law&hellip;</a><a href="advertising.html">Advertising</a><a href="staff.html">Staff</a><a href="contact.html">Contact</a><a href="http://tee.pub/lic/XYLqEd6IJr8" target="_blank" rel="noopener">Merch</a></nav>' +
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
        '<img class="player-art" data-now-art src="Color%20logo%20-%20no%20background.svg" alt="" aria-hidden="true" width="100" height="100" />' +
        '<span class="player-eq eq" data-eq aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
        '<span class="player-onair"><span class="onair-dot" aria-hidden="true"></span> On air <span class="player-listeners" data-listeners></span></span>' +
        '<span class="player-track"><span class="player-title" data-now-track>Mellow Mountain Radio</span><span class="player-artist" data-now-artist>106.5 FM &amp; 780 AM</span></span>' +
        '<span class="player-pulse" data-pulse hidden><button class="pp-btn" type="button" data-pulse-love aria-label="Feed the pulse — more like this, nudges the station playlist" title="Feed the pulse — more like this"><svg viewBox="0 0 24 12" width="20" height="11" aria-hidden="true"><polyline points="0,6 6,6 9,1 13,11 16,6 24,6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button><button class="pp-btn pp-btn--nah" type="button" data-pulse-nah aria-label="Flatline — not my vibe, nudges the station playlist" title="Flatline — not my vibe"><svg viewBox="0 0 24 12" width="20" height="11" aria-hidden="true"><line x1="0" y1="6" x2="24" y2="6" stroke="currentColor" stroke-width="2"/></svg></button></span>' +
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
  var sceneEq = null; // lounge-scene spectrum canvas, registered by initLounge()
  var sceneEqPeaks = null; // per-bar peak-hold heights (rise instantly, fall slowly)
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

  function fillRoundTopRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
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
    // big spectrum along the bottom of the lounge scene — glowing,
    // rounded bars with a warm 3-stop gradient and slow-decaying
    // peak-hold caps, the way a real hardware VU meter reads.
    if (sceneEq && sceneEq.isConnected && vizReal) {
      var sc = sceneEq._c || (sceneEq._c = sceneEq.getContext("2d"));
      var sw = sceneEq.width, sh = sceneEq.height;
      sc.clearRect(0, 0, sw, sh);
      var SB = 48, gap = Math.max(1, sw / SB * 0.32), sbw = (sw - gap * (SB - 1)) / SB;
      var barR = Math.min(sbw / 2, sh * 0.05);
      if (!sceneEqPeaks || sceneEqPeaks.length !== SB) sceneEqPeaks = new Array(SB).fill(0);
      for (i = 0; i < SB; i++) {
        var sv = freqData[Math.floor((i + 0.5) / SB * n * 0.72)] / 255;
        var sbh = Math.max(sh * 0.03, sv * sv * sh);
        var x = i * (sbw + gap);

        sceneEqPeaks[i] = sbh > sceneEqPeaks[i] ? sbh : Math.max(sbh, sceneEqPeaks[i] - sh * 0.012);

        sc.save();
        sc.shadowColor = "rgba(255,150,70,0.5)";
        sc.shadowBlur = sbw * 1.1;
        var g = sc.createLinearGradient(0, sh - sbh, 0, sh);
        g.addColorStop(0, "rgba(255,238,205," + (0.8 + sv * 0.2).toFixed(3) + ")");
        g.addColorStop(0.45, "rgba(255,178,90," + (0.6 + sv * 0.4).toFixed(3) + ")");
        g.addColorStop(1, "rgba(214,90,70," + (0.28 + sv * 0.35).toFixed(3) + ")");
        sc.fillStyle = g;
        fillRoundTopRect(sc, x, sh - sbh, sbw, sbh, barR);
        sc.restore();

        var peakY = sh - sceneEqPeaks[i];
        sc.fillStyle = "rgba(255,246,225,0.9)";
        sc.fillRect(x, Math.max(0, peakY - sh * 0.006), sbw, Math.max(1, sh * 0.012));
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
    if (sceneEq && sceneEq._c) sceneEq._c.clearRect(0, 0, sceneEq.width, sceneEq.height);
    if (sceneEqPeaks) sceneEqPeaks.fill(0);
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
      rqOnAir(song);
      pulseSync(song);
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
    "sports-national": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en",
    "native-ict":      "https://ictnews.org/feed",
    "native-nations":  "https://news.google.com/rss/search?q=%22Navajo%20Nation%22%20OR%20%22Hopi%20Tribe%22%20OR%20%22Yavapai-Apache%22%20when%3A14d&hl=en-US&gl=US&ceid=US:en"
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
      legs.push(url);   // rss.app feeds are CORS-open, so this direct hit works in-browser
      // CORS proxies for feeds that aren't (e.g. Google News) — several, so one
      // going down (corsproxy.io now wants a key) never blanks the headlines.
      legs.push("https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(url));
      legs.push("https://api.allorigins.win/raw?url=" + encodeURIComponent(url));
      legs.push("https://corsproxy.io/?url=" + encodeURIComponent(url));
    }
    var i = 0;
    function attempt() {
      if (i >= legs.length) return Promise.reject(new Error("feed unavailable"));
      return fetchText(legs[i++]).then(function (txt) {
        var items = parseFeed(txt);
        if (items && items.length) return items;  // a 200 with no parseable stories is a miss, not a win
        throw new Error("empty feed");
      }).catch(attempt);
    }
    return attempt();
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
  function renderWeather(box, cur, daily, aqi, src) {
    var now = wxInfo(cur.weather_code, cur.is_day);
    var aq = aqiInfo(aqi);
    var aqBadge = aq ? '<span class="wx-aqi wx-aqi--' + aq.cls + '"><span class="wx-aqi-n">' + aq.v + '</span> AQI · ' + esc(aq.label) + '</span>' : '';
    var hero = '<div class="wx-now">' +
      '<div class="wx-now-main"><span class="wx-now-ic">' + now.icon + '</span>' +
        '<span class="wx-now-block"><span class="wx-now-temp">' + Math.round(cur.temperature_2m) + '°</span>' +
        '<span class="wx-now-cond">' + esc(now.label) + '</span>' + aqBadge + '</span></div>' +
      '<div class="wx-now-meta"><span class="wx-place">Sedona, AZ</span>' +
        '<span>Feels like ' + Math.round(cur.apparent_temperature) + '°</span>' +
        (cur.relative_humidity_2m != null ? '<span>Humidity ' + Math.round(cur.relative_humidity_2m) + '%</span>' : '') +
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
      '<p class="wx-credit">Live conditions for Sedona &middot; data by ' + (src || "Open-Meteo") + ' &middot; Cathedral Rock photo via Wikimedia Commons</p>';
  }
  function renderWeatherMini(el, cur) {
    var w = wxInfo(cur.weather_code, cur.is_day);
    el.innerHTML = '<span class="wx-chip-ic">' + w.icon + '</span>' +
      '<span class="wx-chip-temp">' + Math.round(cur.temperature_2m) + '°</span>' +
      '<span class="wx-chip-meta"><span class="wx-chip-cond">' + esc(w.label) + '</span>' +
      '<span class="wx-chip-place">Sedona now</span></span>';
    el.classList.add("is-ready");
  }
  // ---- NWS fallback: keep the panel live if Open-Meteo ever blips ----
  var NWS_FORECAST = "https://api.weather.gov/gridpoints/FGZ/68,75/forecast"; // Sedona gridpoint
  function nwsCode(t) {
    t = (t || "").toLowerCase();
    if (/thunder/.test(t)) return 95; if (/snow|flurr/.test(t)) return 71; if (/shower/.test(t)) return 80;
    if (/rain|drizzle/.test(t)) return 61; if (/smoke|haze|fog/.test(t)) return 45;
    if (/overcast/.test(t)) return 3; if (/mostly cloudy/.test(t)) return 3; if (/partly|mostly sunny|mostly clear|partly cloudy/.test(t)) return 2;
    if (/sunny|clear/.test(t)) return 0; return 2;
  }
  function nwsWind(s) { var m = (s || "").match(/(\d+)\s*mph/) || (s || "").match(/(\d+)/); return m ? parseInt(m[1], 10) : 0; }
  function nwsAdapt(periods) {
    if (!periods || !periods.length) return null;
    var p0 = periods[0];
    var cur = { temperature_2m: p0.temperature, apparent_temperature: p0.temperature, weather_code: nwsCode(p0.shortForecast),
      wind_speed_10m: nwsWind(p0.windSpeed), relative_humidity_2m: (p0.relativeHumidity && p0.relativeHumidity.value != null) ? p0.relativeHumidity.value : null, is_day: p0.isDaytime ? 1 : 0 };
    var byDate = {};
    periods.forEach(function (p) {
      var day = (p.startTime || "").slice(0, 10); if (!day) return; byDate[day] = byDate[day] || {};
      if (p.isDaytime) { byDate[day].hi = p.temperature; byDate[day].code = nwsCode(p.shortForecast); byDate[day].pp = (p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value) || 0; }
      else { byDate[day].lo = p.temperature; }
    });
    var time = [], code = [], hi = [], lo = [], pp = [];
    Object.keys(byDate).sort().slice(0, 7).forEach(function (day) {
      var b = byDate[day]; time.push(day); code.push(b.code != null ? b.code : 2);
      hi.push(b.hi != null ? b.hi : (b.lo != null ? b.lo : 0)); lo.push(b.lo != null ? b.lo : b.hi); pp.push(b.pp || 0);
    });
    return { current: cur, daily: { time: time, weather_code: code, temperature_2m_max: hi, temperature_2m_min: lo, precipitation_probability_max: pp } };
  }
  function weatherFallback(box, mini, aqi) {
    fetch(NWS_FORECAST, { cache: "no-store", headers: { "Accept": "application/geo+json" } }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        var om = j && j.properties && nwsAdapt(j.properties.periods);
        if (!om) { if (box && box.isConnected) box.innerHTML = '<p class="embed-note">Live weather is unavailable right now.</p>'; return; }
        if (box && box.isConnected) renderWeather(box, om.current, om.daily, aqi, "National Weather Service");
        if (mini && mini.isConnected) renderWeatherMini(mini, om.current);
      }).catch(function () { if (box && box.isConnected) box.innerHTML = '<p class="embed-note">Live weather is unavailable right now.</p>'; });
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
    Promise.all([fetch(url, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }), aqP]).then(function (res) {
      var d = res[0], aqi = res[1] && res[1].current ? res[1].current.us_aqi : null;
      if (!d || !d.current || !d.daily) { weatherFallback(box, mini, aqi); return; }  // Open-Meteo down -> NWS
      if (box && box.isConnected) renderWeather(box, d.current, d.daily, aqi);
      if (mini && mini.isConnected) renderWeatherMini(mini, d.current);
    }).catch(function () { weatherFallback(box, mini, null); });
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
     SEEN AROUND SEDONA — live wildlife + blooming plants from the
     iNaturalist community (real observations, photos, dates; no key).
     ========================================================= */
  var INAT_BASE = "https://api.inaturalist.org/v1/observations?lat=34.8697&lng=-111.7610&radius=40&quality_grade=research&photos=true&order_by=observed_on&order=desc&locale=en";
  var WILD_API = INAT_BASE + "&iconic_taxa=Aves,Mammalia,Reptilia,Amphibia,Insecta&per_page=60";
  var BLOOM_API = INAT_BASE + "&iconic_taxa=Plantae&term_id=12&term_value_id=13&per_page=45";
  function inatPhoto(o) { var p = o.photos && o.photos[0]; return (p && p.url) ? p.url.replace("square", "medium") : null; }
  function wildCap(s) { s = String(s || ""); return s.charAt(0).toUpperCase() + s.slice(1); }
  function wildWhen(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr + "T12:00:00"), t = d.getTime(); if (isNaN(t)) return "";
    var days = Math.round((Date.now() - t) / 86400000);
    if (days <= 0) return "Seen today"; if (days === 1) return "Yesterday";
    if (days < 14) return days + " days ago";
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  }
  function dAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
  var _wildData = null;
  function getWildData() {
    if (_wildData) return _wildData;
    var a = fetch(WILD_API, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var p = fetch(BLOOM_API, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    _wildData = Promise.all([a, p]).then(function (res) { return { animals: (res[0] && res[0].results) || [], plants: (res[1] && res[1].results) || [] }; }).catch(function () { return { animals: [], plants: [] }; });
    return _wildData;
  }
  function wildCards(results) {
    var seen = {}, out = [];
    (results || []).forEach(function (o) {
      var t = o.taxon; if (!t || seen[t.id]) return; var ph = inatPhoto(o); if (!ph) return; seen[t.id] = 1;
      out.push({ name: wildCap(t.preferred_common_name || t.name), sci: t.name, photo: ph, when: o.observed_on,
        cat: t.iconic_taxon_name || "", loc: o.location, uri: o.uri || ("https://www.inaturalist.org/observations/" + o.id),
        place: (o.place_guess || "").split(",")[0], user: (o.user && (o.user.name || o.user.login)) || "",
        faves: o.faves_count || 0, research: o.quality_grade === "research" });
    });
    return out;
  }
  var WILD_ICON = { Aves: "🐦", Mammalia: "🦌", Reptilia: "🦎", Amphibia: "🐸", Insecta: "🦋", Plantae: "🌸", Arachnida: "🕷" };
  function wildCardHTML(c) {
    return '<a class="wild-card" href="' + esc(c.uri) + '" target="_blank" rel="noopener" style="background-image:url(\'' + esc(c.photo) + '\')">' +
      '<span class="wild-shade"></span>' +
      '<span class="wild-cat-ic">' + (WILD_ICON[c.cat] || "🌿") + '</span>' +
      (c.research ? '<span class="wild-rg" title="Research grade — community verified">✓</span>' : '') +
      '<span class="wild-info"><span class="wild-name">' + esc(c.name) + '</span>' +
        '<span class="wild-meta">' + esc(wildWhen(c.when)) + (c.place ? ' &middot; ' + esc(c.place) : '') + '</span>' +
        (c.user ? '<span class="wild-obs">📷 ' + esc(c.user) + '</span>' : '') +
      '</span></a>';
  }
  // the one sighting that owns the week — most loved, verified, freshest
  function wildSpotHTML(c) {
    return '<a class="wild-spot" href="' + esc(c.uri) + '" target="_blank" rel="noopener">' +
      '<span class="wild-spot-img" style="background-image:url(\'' + esc(c.photo.replace("medium", "large")) + '\')"></span>' +
      '<span class="wild-spot-body"><span class="wild-spot-eyebrow">✦ Sighting of the week</span>' +
        '<span class="wild-spot-name">' + (WILD_ICON[c.cat] || "🌿") + ' ' + esc(c.name) + '</span>' +
        '<span class="wild-spot-sci">' + esc(c.sci) + '</span>' +
        '<span class="wild-spot-meta">' + esc(wildWhen(c.when)) + (c.place ? ' &middot; ' + esc(c.place) : '') +
          (c.user ? ' &middot; spotted by <b>' + esc(c.user) + '</b>' : '') +
          (c.research ? ' &middot; <i class="wild-rg-tag">✓ research grade</i>' : '') + '</span>' +
        '<span class="wild-spot-cta">See the observation &rarr;</span>' +
      '</span></a>';
  }
  // the wild hour — dawn & dusk are when the desert actually moves
  function initWildPulse() {
    var el = doc.querySelector("[data-wild-pulse]"); if (!el) return;
    var g = null; try { g = goldenTimes(new Date()); } catch (e) {}
    var hour = "";
    if (g) {
      var now = Date.now(), H = 5400000;   // ±90 min around sunrise / sunset
      var wins = [[+g.morning.b.sunrise - H, +g.morning.b.sunrise + H], [+g.evening.b.sunset - H, +g.evening.b.sunset + H]];
      var live = wins.some(function (w) { return now >= w[0] && now <= w[1]; });
      if (live) hour = '<span class="wp-hour is-live"><i></i>THE WILD HOUR — dawn &amp; dusk are when the desert moves. It&rsquo;s moving now.</span>';
      else {
        var next = wins.map(function (w) { return w[0]; }).filter(function (t) { return t > now; })[0] || (+g.morning.b.sunrise - H + 86400000);
        var m = Math.round((next - now) / 60000);
        hour = '<span class="wp-hour">🌗 Next wild hour in <b>' + (m >= 60 ? Math.floor(m / 60) + "h " + (m % 60) + "m" : m + "m") + '</b> — the desert wakes at dawn and dusk</span>';
      }
    }
    el.innerHTML = '<div class="wp-stats">' +
      '<span class="wp-stat"><b data-wp-sight>&hellip;</b>sightings this fortnight</span>' +
      '<span class="wp-stat"><b data-wp-species>&hellip;</b>species</span>' +
      '<span class="wp-stat"><b data-wp-bloom>&hellip;</b>in bloom</span>' +
    '</div>' + hour;
    getWildData().then(function (d) {
      if (!el.isConnected) return;
      var s = el.querySelector("[data-wp-sight]"), sp = el.querySelector("[data-wp-species]"), b = el.querySelector("[data-wp-bloom]");
      if (s) s.textContent = d.animals.length + d.plants.length;
      if (sp) sp.textContent = wildCards(d.animals).length + wildCards(d.plants).length;
      if (b) b.textContent = wildCards(d.plants).length;
    });
  }
  // who's running Sedona — most-seen species, last 30 days, live from iNat
  function initWildBoard() {
    var el = doc.querySelector("[data-wild-board]"); if (!el) return;
    var d1 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    fetch("https://api.inaturalist.org/v1/observations/species_counts?nelat=35.05&nelng=-111.55&swlat=34.70&swlng=-112.0&d1=" + d1 + "&per_page=7&hrank=species", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!el.isConnected || !j || !j.results || !j.results.length) { el.innerHTML = ""; return; }
        var max = j.results[0].count;
        el.innerHTML = j.results.map(function (r, i) {
          var t = r.taxon, ph = t.default_photo && (t.default_photo.medium_url || t.default_photo.square_url);
          return '<a class="wb-row" href="https://www.inaturalist.org/taxa/' + t.id + '" target="_blank" rel="noopener">' +
            '<span class="wb-rank">' + (i + 1) + '</span>' +
            (ph ? '<img class="wb-ph" src="' + esc(ph) + '" alt="" loading="lazy" />' : '<span class="wb-ph wb-ph--ic">' + (WILD_ICON[t.iconic_taxon_name] || "🌿") + '</span>') +
            '<span class="wb-t"><b>' + esc(wildCap(t.preferred_common_name || t.name)) + '</b><span>' + esc(t.name) + '</span></span>' +
            '<span class="wb-barwrap"><i style="width:' + Math.max(8, Math.round(r.count / max * 100)) + '%"></i></span>' +
            '<span class="wb-n">×' + r.count + '</span></a>';
        }).join("") +
        '<p class="micro-note">' + j.total_results.toLocaleString() + ' species logged around Sedona in the last 30 days &middot; live from the iNaturalist community</p>';
      }).catch(function () { el.innerHTML = ""; });
  }
  function initWildlife() {
    var w = doc.querySelector("[data-wildlife]"), b = doc.querySelector("[data-blooming]"), tabs = doc.querySelector("[data-wild-tabs]");
    if (!w && !b) return;
    if (w) w.innerHTML = '<p class="rss-loading">Scanning the trails&hellip;</p>';
    if (b) b.innerHTML = '<p class="rss-loading">Looking for blooms&hellip;</p>';
    var spot = doc.querySelector("[data-wild-spot]");
    getWildData().then(function (d) {
      if (w && w.isConnected) {
        var cards = wildCards(d.animals);
        // the spotlight: most-loved of the fortnight; verified beats not; fresh beats stale
        if (spot && cards.length) {
          var best = cards.slice().sort(function (x, y) { return (y.faves - x.faves) || (y.research - x.research) || String(y.when).localeCompare(String(x.when)); })[0];
          spot.innerHTML = wildSpotHTML(best);
        }
        if (tabs) {
          var cats = [["All", ""], ["Birds", "Aves"], ["Mammals", "Mammalia"], ["Reptiles", "Reptilia"], ["Insects", "Insecta"]];
          tabs.innerHTML = cats.map(function (c, i) {
            var n = c[1] ? cards.filter(function (x) { return x.cat === c[1]; }).length : cards.length;
            return '<button class="wild-tab' + (i === 0 ? " is-on" : "") + '" type="button" data-cat="' + c[1] + '">' + c[0] + ' <i>' + n + '</i></button>';
          }).join("");
          var paint = function (cat) { var f = cat ? cards.filter(function (x) { return x.cat === cat; }) : cards; w.innerHTML = f.length ? f.slice(0, 12).map(wildCardHTML).join("") : '<p class="embed-note">Nothing in this group logged in the last couple of weeks.</p>'; };
          tabs.querySelectorAll(".wild-tab").forEach(function (btn) { btn.addEventListener("click", function () { tabs.querySelectorAll(".wild-tab").forEach(function (x) { x.classList.remove("is-on"); }); btn.classList.add("is-on"); paint(btn.getAttribute("data-cat")); }); });
          paint("");
        } else { w.innerHTML = cards.length ? cards.slice(0, 8).map(wildCardHTML).join("") : '<p class="embed-note">No recent sightings logged nearby.</p>'; }
      }
      if (b && b.isConnected) { var bc = wildCards(d.plants); b.innerHTML = bc.length ? bc.slice(0, 8).map(wildCardHTML).join("") : '<p class="embed-note">Nothing logged in bloom right now.</p>'; }
    });
  }

  /* ---- This Week in Nature dashboard ---- */
  function natSeason(m) { if (m === 11 || m <= 1) return "winter"; if (m <= 4) return "spring"; if (m <= 7) return "summer"; return "fall"; }
  var NAT_PROFILE = {
    spring: { wildlife: "Active", flowers: "Wildflower peak", pollinators: "Excellent", birds: "Very high &middot; migration" },
    summer: { wildlife: "Very active", flowers: "Peak summer bloom", pollinators: "Excellent", birds: "High" },
    fall: { wildlife: "Active", flowers: "Late-season bloom", pollinators: "Good", birds: "High &middot; migration" },
    winter: { wildlife: "Moderate", flowers: "Sparse", pollinators: "Low", birds: "Moderate" }
  };
  function reptileLabel(tf, season) {
    if (season === "winter") return "Mostly dormant";
    if (tf == null) return "Active";
    if (tf >= 95) return "Active &middot; dawn &amp; dusk";
    if (tf >= 75) return "Active &middot; warm afternoons";
    if (tf >= 58) return "Basking out";
    return "Low &middot; cool";
  }
  function ndCard(ic, k, v, sub, cls) { return '<div class="ndash-card' + (cls ? " nd-" + cls : "") + '"><span class="ndash-ic">' + ic + '</span><span class="ndash-k">' + k + '</span><span class="ndash-v">' + v + '</span>' + (sub ? '<span class="ndash-sub">' + sub + '</span>' : '') + '</div>'; }
  function initNatureDash() {
    var el = doc.querySelector("[data-nature-dash]"); if (!el) return;
    el.innerHTML = '<p class="rss-loading">Reading the land&hellip;</p>';
    var season = natSeason(new Date().getMonth()), prof = NAT_PROFILE[season], d14 = dAgo(14);
    var wx = fetch("https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610&current=temperature_2m&daily=precipitation_probability_max&forecast_days=1&temperature_unit=fahrenheit&timezone=America/Phoenix", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    function cnt(taxa, extra) { return fetch(INAT_BASE + "&iconic_taxa=" + taxa + (extra || "") + "&d1=" + d14 + "&per_page=0", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return j ? j.total_results : null; }).catch(function () { return null; }); }
    Promise.all([wx, cnt("Aves"), cnt("Aves,Mammalia,Reptilia,Amphibia,Insecta"), cnt("Insecta"), cnt("Plantae", "&term_id=12&term_value_id=13")]).then(function (r) {
      if (!el.isConnected) return;
      var c = r[0] && r[0].current, tf = c ? Math.round(c.temperature_2m) : null;
      var pp = r[0] && r[0].daily && r[0].daily.precipitation_probability_max ? r[0].daily.precipitation_probability_max[0] : null;
      var mon = pp == null ? "&mdash;" : pp + "% chance &middot; " + (pp >= 50 ? "likely" : pp >= 20 ? "possible" : "unlikely");
      el.innerHTML =
        ndCard("🦌", "Wildlife activity", prof.wildlife, r[2] != null ? r[2] + " logged this week" : "", "a") +
        ndCard("🌸", "Wildflowers", prof.flowers, r[4] != null ? r[4] + " in bloom logged" : "", "p") +
        ndCard("🦋", "Pollinators", prof.pollinators, r[3] != null ? r[3] + " insects logged" : "", "i") +
        ndCard("🐦", "Bird activity", prof.birds, r[1] != null ? r[1] + " logged this week" : "", "b") +
        ndCard("🦎", "Reptiles", reptileLabel(tf, season), tf != null ? tf + "&deg;F right now" : "", "r") +
        ndCard("🌧️", "Monsoon watch", mon, season === "summer" ? "Jul&ndash;Sep monsoon season" : "Live NWS-fed forecast", "m");
    });
  }

  /* ---- Nature Almanac (today) ---- */
  function almTime(dt) { return (dt && !isNaN(dt.valueOf())) ? skyTime(dt, -7) : "—"; }
  function initAlmanac() {
    var el = doc.querySelector("[data-almanac]"); if (!el) return;
    el.innerHTML = '<p class="rss-loading">Reading today&rsquo;s sky&hellip;</p>';
    var m = moonInfo(), g = null; try { g = goldenTimes(new Date()); } catch (e) {}
    var wx = fetch("https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610&current=temperature_2m,relative_humidity_2m,wind_speed_10m,uv_index&daily=uv_index_max&forecast_days=1&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America/Phoenix", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var aq = fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=34.8697&longitude=-111.7610&current=us_aqi&timezone=America/Phoenix", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    Promise.all([wx, aq]).then(function (r) {
      if (!el.isConnected) return;
      var c = r[0] && r[0].current, uv = c && c.uv_index != null ? Math.round(c.uv_index) : null;
      var aqi = r[1] && r[1].current ? r[1].current.us_aqi : null, ai = aqiInfo ? aqiInfo(aqi) : null;
      function tile(ic, k, v) { return '<div class="alm-tile"><span class="alm-ic">' + ic + '</span><div><b>' + v + '</b><span>' + k + '</span></div></div>'; }
      el.innerHTML =
        tile("🌅", "Sunrise", g ? almTime(g.morning.b.sunrise) : "—") +
        tile("🌇", "Sunset", g ? almTime(g.evening.b.sunset) : "—") +
        tile("🌙", "Moon", m.icon + " " + m.illum + "%") +
        tile("🌡️", "Temperature", c ? Math.round(c.temperature_2m) + "&deg;F" : "—") +
        tile("☀️", "UV index", uv != null ? uv + " &middot; " + (uv >= 8 ? "very high" : uv >= 6 ? "high" : uv >= 3 ? "moderate" : "low") : "—") +
        tile("💨", "Wind", c && c.wind_speed_10m != null ? Math.round(c.wind_speed_10m) + " mph" : "—") +
        tile("💧", "Humidity", c && c.relative_humidity_2m != null ? Math.round(c.relative_humidity_2m) + "%" : "—") +
        tile("🌫️", "Air quality", (aqi != null ? aqi : "—") + (ai ? " &middot; " + ai.short : ""));
    });
  }

  /* ---- Best photo subjects this week ---- */
  var PHOTO_SUBJECTS = {
    spring: ["🌼 Desert wildflowers", "🐦 Hummingbirds at feeders", "🦋 Butterflies on blooms", "🌵 Cactus buds swelling", "🌌 Milky Way returning", "🦅 Hawks nesting"],
    summer: ["🌵 Cactus &amp; wildflower blooms", "⛈️ Monsoon clouds &amp; lightning", "🦎 Lizards basking on rock", "🦋 Pollinators at work", "🌌 Milky Way core, high &amp; bright", "🐦 Ravens riding the thermals"],
    fall: ["🍂 Cottonwood &amp; oak fall color", "🦌 Deer &amp; elk more active", "🦅 Migrating raptors", "🌾 Golden grasses at low light", "🌌 Crisp dark skies", "🕸️ Tarantulas on the move"],
    winter: ["❄️ Snow on the red rocks", "🦅 Bald eagles along the creek", "🌲 Junipers &amp; frost", "🌅 Long golden light all day", "🌙 Bright winter moon", "🐦 Juncos &amp; winter sparrows"]
  };
  function initPhotoSubjects() {
    var el = doc.querySelector("[data-photo-subjects]"); if (!el) return;
    var season = natSeason(new Date().getMonth()), base = (PHOTO_SUBJECTS[season] || PHOTO_SUBJECTS.summer).slice();
    var g = null; try { g = goldenTimes(new Date()); } catch (e) {}
    var gt = g ? "Best light this evening: golden hour " + almTime(g.evening.b.goldEveStart) + "&ndash;" + almTime(g.evening.b.sunset) : "";
    var day = Math.floor(Date.now() / 86400000), i = day % base.length;
    var subs = base.slice(i).concat(base.slice(0, i)).slice(0, 6);   // rotate the seasonal picks daily
    var onPhotoPage = !!doc.querySelector("[data-photo-light]");   // no circular self-link on the photography page
    el.innerHTML = '<div class="psub-grid">' + subs.map(function (s) { return '<span class="psub">' + s + '</span>'; }).join("") + '</div>' +
      (gt ? '<p class="psub-note">' + gt + (onPhotoPage ? '' : ' &middot; <a href="photography.html">full photographer&rsquo;s guide &rarr;</a>') + '</p>' : '');
  }
  /* ---- Wildlife sounds — rotate the featured calls daily ---- */
  var SOUND_POOL = {
    morning: ["Canyon &amp; rock wrens tumbling down the cliffs", "Gambel's quail calling from the brush", "Hummingbirds buzzing the feeders", "Woodpeckers drumming on juniper", "Cactus wrens rattling at first light", "Mourning doves cooing low", "Curve-billed thrashers running their song", "Bewick's wrens chattering in the scrub"],
    evening: ["Coyotes starting up across the hills", "Crickets rising with the dark", "Great horned owls trading hoots", "Common poorwills on warm nights", "Western screech-owls trilling", "Common nighthawks booming overhead", "Bats clicking over the creek", "Elk bugling up on the rim (in fall)"],
    monsoon: ["Spadefoot &amp; canyon treefrogs after the rain", "Thunder rolling up the Verde Valley", "Cicadas at full volume in the heat", "Runoff moving through the washes", "Red-spotted toads calling from fresh pools", "Rain drumming on the slickrock"]
  };
  function initSounds() {
    var el = doc.querySelector("[data-sounds]"); if (!el) return;
    var day = Math.floor(Date.now() / 86400000);
    function pick(arr, n, seed) { var a = arr.slice(), out = [], s = seed; while (out.length < n && a.length) { s = (s * 9301 + 49297) % 233280; out.push(a.splice(Math.floor(s / 233280 * a.length), 1)[0]); } return out; }
    var cols = [["🌅 Morning", "morning"], ["🌇 Evening", "evening"], ["⛈️ Monsoon", "monsoon"]];
    el.innerHTML = cols.map(function (c, k) {
      var items = pick(SOUND_POOL[c[1]], 4, day + k * 31);
      return '<article class="sound-card"><h3>' + c[0] + '</h3><ul>' + items.map(function (x) { return '<li>' + x + '</li>'; }).join("") + '</ul></article>';
    }).join("");
  }

  /* ---- KAZM Mountain Notes (rotating field notes from the towers) ---- */
  var MOUNTAIN_NOTES = [
    "The mule deer at our transmitter site always loved rubbing their antlers on the weather station &mdash; the interference rode right onto the signal, like they'd found their own little antenna.",
    "Signal Watch volunteers spent as much time logging the ravens riding thermals around the towers as they did watching meters. Those birds knew the wind before we did.",
    "Monsoon season meant watching the lightning as carefully as the transmitters. You learn to read a wall of cloud coming up the Verde like a second gauge.",
    "One winter a pair of bald eagles worked the creek below the hill for weeks. We kept the studio window clear just to watch them fish between songs.",
    "On the stillest summer nights you could hear the coyotes start up right as the crickets peaked &mdash; the whole hillside tuning up while the AM signal reached for Alaska.",
    "Come first light the canyon wrens would run their falling song down the rocks, and that was the real sign the day had started &mdash; earlier than any clock in the building."
  ];
  var _mnTimer = null;
  function initMountainNotes() {
    var el = doc.querySelector("[data-mountain-notes]"); if (!el) return;
    if (_mnTimer) { clearInterval(_mnTimer); _mnTimer = null; }
    var i = Math.floor(Date.now() / 86400000) % MOUNTAIN_NOTES.length;
    function show() { el.innerHTML = '<span class="mnote-mark" aria-hidden="true">&ldquo;</span><p class="mnote-text">' + MOUNTAIN_NOTES[i % MOUNTAIN_NOTES.length] + '</p><span class="mnote-by">&mdash; from the KAZM Archives</span>'; el.classList.remove("is-fade"); }
    show();
    _mnTimer = setInterval(function () { if (!el.isConnected) { clearInterval(_mnTimer); _mnTimer = null; return; } el.classList.add("is-fade"); setTimeout(function () { i++; show(); }, 400); }, 11000);
  }

  /* ---- Did You Know (rotating facts) ---- */
  var NATURE_FACTS = [
    "Ravens are among the smartest birds alive &mdash; they use tools, remember faces, and can mimic sounds, including human speech.",
    "Saguaro cactus don't naturally grow up around Sedona &mdash; it's too high and cold. That iconic silhouette lives in the lower Sonoran Desert to the south.",
    "Prickly pear fruit &mdash; the \"tunas\" &mdash; ripen deep red in late summer and have fed people here for thousands of years.",
    "A single monsoon storm can green up a hillside overnight; desert plants are built to seize a day's rain and run with it.",
    "Javelina aren't pigs at all &mdash; they're peccaries, a New World family, and they travel the washes in tight-knit family squadrons.",
    "The Greater Short-horned Lizard can squirt a jet of blood from the corner of its eye to startle predators.",
    "Black-chinned and broad-tailed hummingbirds beat their wings around 50 times a second and can drop into torpor on cold nights to survive.",
    "Oak Creek is one of only a handful of permanent streams in Arizona &mdash; a green ribbon of life through the red rock."
  ];
  var _dykTimer = null;
  function initDidYouKnow() {
    var el = doc.querySelector("[data-did-you-know]"); if (!el) return;
    if (_dykTimer) { clearInterval(_dykTimer); _dykTimer = null; }
    var i = Math.floor(Date.now() / 3600000) % NATURE_FACTS.length;
    function show() { el.innerHTML = '<span class="dyk-k">Did you know?</span><p class="dyk-text">' + NATURE_FACTS[i % NATURE_FACTS.length] + '</p>'; el.classList.remove("is-fade"); }
    show();
    _dykTimer = setInterval(function () { if (!el.isConnected) { clearInterval(_dykTimer); _dykTimer = null; return; } el.classList.add("is-fade"); setTimeout(function () { i++; show(); }, 400); }, 9000);
  }

  /* ---- Kids: Can you spot these? (checklist, remembered) ---- */
  var KIDS_SPOT = [["🦌", "Mule deer"], ["🐦‍⬛", "Raven"], ["🦎", "Lizard"], ["🌵", "Prickly pear"], ["🦅", "Hawk"], ["🐿️", "Rock squirrel"]];
  function initKidsSpot() {
    var el = doc.querySelector("[data-kids-spot]"); if (!el) return;
    var got = {}; try { got = JSON.parse(localStorage.getItem("kazm-spot") || "{}") || {}; } catch (e) {}
    el.innerHTML = KIDS_SPOT.map(function (s, i) { return '<button class="spot-item' + (got[i] ? " is-got" : "") + '" type="button" data-i="' + i + '"><span class="spot-emoji">' + s[0] + '</span><span class="spot-label">' + s[1] + '</span><span class="spot-check" aria-hidden="true">✓</span></button>'; }).join("");
    el.querySelectorAll(".spot-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = btn.getAttribute("data-i"); got[i] = !got[i]; btn.classList.toggle("is-got", !!got[i]);
        try { localStorage.setItem("kazm-spot", JSON.stringify(got)); } catch (e) {}
      });
    });
  }

  /* ---- Interactive nature map (live sightings + trails on topo) ---- */
  var _natMap = null;
  function initNatureMap() {
    var el = doc.querySelector("[data-nature-map]"); if (!el || el._done) return;
    el._done = true;
    el.innerHTML = '<div class="trail-map-load">Mapping the sightings&hellip;</div>';
    Promise.all([new Promise(function (res) { loadLeaflet(res); }), getWildData(), getTrails()]).then(function (r) {
      var L = r[0], d = r[1], trails = r[2];
      if (!L || !el.isConnected) { el.innerHTML = '<div class="trail-map-load">Map unavailable</div>'; return; }
      el.innerHTML = "";
      var map = L.map(el, { zoomControl: true, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false }).setView([34.8697, -111.7610], 11);
      L.tileLayer(TOPO_TILE, { maxZoom: 16, attribution: "USGS · The National Map" }).addTo(map);
      if (trails) Object.keys(trails).forEach(function (k) { (trails[k].lines || []).forEach(function (seg) { L.polyline(seg, { color: "#c85a1e", weight: 2, opacity: .45 }).addTo(map); }); });
      var col = { Aves: "#3a7bd5", Mammalia: "#b5651d", Reptilia: "#2f9e6a", Insecta: "#d59a1e", Amphibia: "#7a5ad5", Plantae: "#c0398a" };
      function plot(list) {
        list.forEach(function (o) {
          if (!o.location) return; var p = o.location.split(","), la = parseFloat(p[0]), ln = parseFloat(p[1]); if (isNaN(la) || isNaN(ln)) return;
          var t = o.taxon || {}, cat = t.iconic_taxon_name || "", name = wildCap(t.preferred_common_name || t.name || "Sighting");
          L.circleMarker([la, ln], { radius: 5, color: "#fff", weight: 1.5, fillColor: col[cat] || "#888", fillOpacity: .95 })
            .addTo(map).bindPopup('<b>' + esc(name) + '</b><br>' + esc(wildWhen(o.observed_on)) + ' &middot; <a href="' + esc(o.uri || ("https://www.inaturalist.org/observations/" + o.id)) + '" target="_blank" rel="noopener">iNaturalist</a>');
        });
      }
      plot(d.animals.slice(0, 40)); plot(d.plants.slice(0, 25));
      _natMap = map;
      setTimeout(function () { map.invalidateSize(); }, 300);
    });
  }

  /* =========================================================
     TRAFFIC — live ADOT AZ511 congestion heat map (Leaflet, no key)
     ========================================================= */
  var TRAFFIC_TILE = "https://tiles.ibi511.com/Geoservice/GetTrafficTile?x={x}&y={y}&z={z}";
  function loadLeaflet(cb) {
    if (window.L) { cb(window.L); return; }
    // Vendored locally (vendor/leaflet/) rather than pulled from a CDN --
    // an unpkg.com hiccup, ad-blocker, or slow network used to silently
    // kill every map on the site (weather, roads, jeep trails) with zero
    // visible error, since a script tag that never fires onload/onerror
    // just hangs the whole loadLeaflet callback forever. Same-origin now,
    // so it loads exactly as reliably as the rest of the page, plus a
    // timeout fallback in case a future load attempt ever hangs anyway.
    var done = false;
    function finish(L) { if (done) return; done = true; cb(L); }
    if (!doc.querySelector('link[data-leaflet]')) {
      var css = doc.createElement("link");
      css.rel = "stylesheet"; css.href = "vendor/leaflet/leaflet.css"; css.setAttribute("data-leaflet", "1");
      doc.head.appendChild(css);
    }
    var js = doc.createElement("script");
    js.src = "vendor/leaflet/leaflet.js";
    js.onload = function () { finish(window.L); };
    js.onerror = function () { finish(null); };
    doc.head.appendChild(js);
    setTimeout(function () { finish(window.L || null); }, 8000);
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
      var map = L.map(mapEl, { zoomControl: true, attributionControl: true, scrollWheelZoom: false, dragging: true, tap: false, touchZoom: false, doubleClickZoom: false });
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
  /* =========================================================
     SEDONA ROADS — the local obsession, with receipts. Live ADOT
     cameras (direct az511 images, refreshed every minute), real-time
     incidents/closures via the n8n roads relay (AZ511 official API,
     key server-side), corridor status for the three ways in and out,
     and weather-aware canyon caution. Incident board hides itself if
     the relay is offline — cameras and the flow map never depend on it.
     ========================================================= */
  var ROADS_RELAY = "https://n8n.mellowmountainradio.com/webhook/kazm-roads";
  var ROAD_CAMS = [
    { img: 704, n: "SR-89A — Oak Creek Canyon, lower switchbacks (MP 375)", c: "canyon" },
    { img: 706, n: "SR-89A — Oak Creek Canyon, top (Flagstaff side)", c: "canyon" },
    { img: 777, n: "SR-89A @ Airport Rd — West Sedona", c: "town" },
    { img: 778, n: "SR-89A @ Andante Dr — West Sedona", c: "town" },
    { img: 779, n: "SR-89A @ Cultural Park / Upper Red Rock Loop", c: "town" },
    { img: 780, n: "SR-89A @ Mountain Shadow / Northview", c: "town" },
    { img: 688, n: "SR-89A @ SR-260 — Cottonwood", c: "west" },
    { img: 687, n: "SR-89A @ Main St — Cottonwood", c: "west" },
    { img: 1487, n: "I-17 @ McGuireville — the Sedona exit corridor", c: "south" },
    { img: 686, n: "SR-260 @ Rodeo Dr — Camp Verde", c: "south" },
    { img: 1485, n: "I-17 @ Flagstaff — canyon bypass north end", c: "canyon" }
  ];
  function roadsAgo(ts) {
    if (ts == null) return "";
    var ms = typeof ts === "number" ? (ts < 1e12 ? ts * 1000 : ts) : new Date(ts).getTime();
    var s = (Date.now() - ms) / 1000;
    if (!(s >= 0)) return "";
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 129600) return Math.round(s / 3600) + " hr ago";
    return Math.round(s / 86400) + " days ago";
  }
  function roadCorridorOf(ev) {
    var r = (ev.road || "").toUpperCase(), lat = ev.lat || 0, lon = ev.lon || 0;
    if (r.indexOf("179") !== -1) return "south";
    if (r.indexOf("I-17") !== -1 || r.indexOf("I17") !== -1) return lat >= 35.0 ? "canyon" : "south";
    if (r.indexOf("89A") !== -1) { if (lat >= 34.878) return "canyon"; if (lon <= -111.85) return "west"; return "town"; }
    if (r.indexOf("260") !== -1) return lon <= -111.9 ? "west" : "south";
    return "";
  }
  function initRoads() {
    var root = doc.querySelector("[data-roads]"); if (!root) return;

    // live cameras — direct ADOT images, no middleman
    var camGrid = root.querySelector("[data-road-cams]");
    if (camGrid) {
      camGrid.innerHTML = ROAD_CAMS.map(function (c, i) {
        return '<figure class="roadcam" data-c="' + c.c + '"><img src="https://az511.com/map/Cctv/' + c.img + '" alt="Live ADOT traffic camera: ' + esc(c.n) + '" loading="lazy" width="640" height="360" data-cam="' + c.img + '"><figcaption>' + esc(c.n) + '</figcaption></figure>';
      }).join("");
      var camTimer = setInterval(function () {
        if (!camGrid.isConnected) { clearInterval(camTimer); return; }
        camGrid.querySelectorAll("img[data-cam]").forEach(function (im) {
          im.src = "https://az511.com/map/Cctv/" + im.getAttribute("data-cam") + "?t=" + Date.now();
        });
      }, 60000);
    }

    // canyon weather caution — the sky decides whether the switchbacks are spicy
    fetch("https://api.open-meteo.com/v1/forecast?latitude=34.9673&longitude=-111.7396&current=temperature_2m,weather_code,wind_gusts_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FPhoenix", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || !d.current) return;
        var t = Math.round(d.current.temperature_2m), code = d.current.weather_code, gust = Math.round(d.current.wind_gusts_10m || 0);
        root.querySelectorAll("[data-corridor]").forEach(function (card) {
          var wx = card.querySelector("[data-corridor-wx]"); if (!wx) return;
          var canyon = card.getAttribute("data-corridor") === "canyon";
          var bits = [];
          if (canyon) {
            if (code >= 71 && code <= 86) bits.push("❄️ Snow falling in the canyon — expect closure risk on the switchbacks");
            else if (code >= 51 && t <= 38) bits.push("🧊 Precip at " + t + "° — ice risk in the shaded curves");
            else if (code >= 51) bits.push("🌧️ Wet canyon — " + t + "°, slow down through the switchbacks");
            else bits.push(t + "° and dry at canyon elevation");
            if (gust >= 35) bits.push("💨 gusts to " + gust + " mph");
          } else {
            if (code >= 51) bits.push("🌧️ Wet roads — " + t + "°");
            else bits.push(t + "° and dry");
          }
          wx.hidden = false; wx.textContent = bits.join(" · ");
        });
      }).catch(function () {});

    // incidents + closures via the roads relay
    var wrap = root.querySelector("[data-road-events-wrap]"), board = root.querySelector("[data-road-events]"),
        note = root.querySelector("[data-road-events-note]"), alertEl = root.querySelector("[data-roads-alert]");
    function drawEvents() {
      fetch(ROADS_RELAY, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        if (!d || d.ok !== true || !wrap) return; // relay offline — board stays hidden
        var evs = d.events || [];
        wrap.hidden = false;
        // full closures get the red banner up top
        var full = evs.filter(function (e) { return e.full; });
        if (alertEl) {
          if (full.length) {
            alertEl.hidden = false;
            alertEl.innerHTML = "🚧 <b>FULL CLOSURE" + (full.length > 1 ? "S" : "") + ":</b> " + full.slice(0, 2).map(function (e) { return esc(e.road) + " — " + esc(e.desc.slice(0, 140)); }).join(" &nbsp;·&nbsp; ");
          } else alertEl.hidden = true;
        }
        if (!evs.length) {
          board.innerHTML = '<p class="roadev-quiet">🟢 Quiet out there — AZ511 reports no incidents, closures, or work zones anywhere in the Verde Valley right now. Enjoy it.</p>';
        } else {
          board.innerHTML = evs.map(function (e) {
            var ic = e.full ? "🚧" : (/closure|restriction/i.test(e.type + e.sub) ? "🚧" : (/construction|roadwork|maintenance/i.test(e.type + e.sub) ? "🦺" : "⚠️"));
            return '<div class="roadev-row' + (e.full ? " roadev-row--full" : "") + '"><span class="roadev-ic">' + ic + '</span><span class="roadev-body"><b>' + esc(e.road || "Local road") + (e.dir ? " " + esc(e.dir) : "") + '</b> <i>' + e.mi + ' mi from Sedona</i><span>' + esc(e.desc) + '</span><em>' + (e.updated ? "updated " + roadsAgo(e.updated) : "") + '</em></span></div>';
          }).join("");
        }
        if (note) note.textContent = "Source: AZ511 (ADOT) · refreshed " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) + " · re-checks every 2 minutes.";
        // corridor status lines
        root.querySelectorAll("[data-corridor]").forEach(function (card) {
          var key = card.getAttribute("data-corridor"), st = card.querySelector("[data-corridor-status]"); if (!st) return;
          var mine = evs.filter(function (e) { return roadCorridorOf(e) === key; });
          st.hidden = false;
          if (!mine.length) { st.className = "corridor-status corridor-status--ok"; st.textContent = "🟢 No incidents reported on this corridor"; }
          else {
            var worst = mine.find(function (e) { return e.full; }) || mine[0];
            st.className = "corridor-status " + (worst.full ? "corridor-status--full" : "corridor-status--warn");
            st.textContent = (worst.full ? "🚧 " : "⚠️ ") + mine.length + " report" + (mine.length > 1 ? "s" : "") + " — " + worst.desc.slice(0, 110);
          }
        });
      }).catch(function () {});
    }
    drawEvents();
    var evTimer = setInterval(function () { if (!root.isConnected) { clearInterval(evTimer); return; } drawEvents(); }, 120000);
  }

  /* =========================================================
     THE SEDONA SKY — the dedicated weather center. Big-board current
     conditions with dewpoint/pressure/UV/AQI, RainViewer animated
     radar (last hour + 30-min nowcast), a 24-hour canvas chart, the
     five-elevation strip (Camp Verde -> Flagstaff, one API call),
     7-day outlook with sun times, and a monsoon storm-fuel meter
     (CAPE) during the season. NWS alerts + fire restrictions reuse
     the existing site modules via their selectors. All live, always.
     ========================================================= */
  function skyDewpoint(tF, rh) {
    if (tF == null || !rh) return null;
    var tC = (tF - 32) * 5 / 9, g = Math.log(rh / 100) + (17.27 * tC) / (237.7 + tC);
    var td = (237.7 * g) / (17.27 - g);
    return Math.round(td * 9 / 5 + 32);
  }
  function skyUvLabel(u) { return u == null ? null : u < 3 ? "Low" : u < 6 ? "Moderate" : u < 8 ? "High" : u < 11 ? "Very high" : "Extreme"; }
  function skyDir(deg) { return ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(deg / 22.5) % 16]; }
  var SKY_SPOTS = [
    { n: "Flagstaff", e: "6,909′", lat: 35.1983, lon: -111.6513 },
    { n: "Oak Creek Canyon", e: "5,200′", lat: 34.9673, lon: -111.7396 },
    { n: "Sedona", e: "4,350′", lat: 34.8697, lon: -111.7610 },
    { n: "Cottonwood", e: "3,314′", lat: 34.7390, lon: -112.0116 },
    { n: "Camp Verde", e: "3,147′", lat: 34.5636, lon: -111.8543 }
  ];
  function initSkyPage() {
    var root = doc.querySelector("[data-sky]"); if (!root) return;
    var wx = "https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610" +
      "&current=temperature_2m,apparent_temperature,weather_code,is_day,relative_humidity_2m,cloud_cover,pressure_msl,wind_speed_10m,wind_gusts_10m,wind_direction_10m,uv_index,precipitation" +
      "&hourly=temperature_2m,precipitation_probability,weather_code,cape&forecast_hours=25" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&forecast_days=7" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FPhoenix";
    var lats = SKY_SPOTS.map(function (s) { return s.lat; }).join(","), lons = SKY_SPOTS.map(function (s) { return s.lon; }).join(",");
    var multi = "https://api.open-meteo.com/v1/forecast?latitude=" + lats + "&longitude=" + lons +
      "&current=temperature_2m,weather_code,is_day,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FPhoenix";
    var aq = "https://air-quality-api.open-meteo.com/v1/air-quality?latitude=34.8697&longitude=-111.7610&current=us_aqi&timezone=America/Phoenix";
    Promise.all([
      fetch(wx, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(aq, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(multi, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var d = res[0], aqi = res[1] && res[1].current && isFinite(res[1].current.us_aqi) ? Math.round(res[1].current.us_aqi) : null, spots = res[2];
      if (d && d.current) skyBoard(root, d.current, aqi);
      if (d && d.hourly) { skyHourly(root, d.hourly, d.daily); skyMonsoon(root, d.hourly); }
      if (d && d.daily) skyWeek(root, d.daily);
      if (spots && spots.length === SKY_SPOTS.length) skyElev(root, spots);
    });
    skyRadar(root);
  }
  function skyBoard(root, c, aqi) {
    var el = root.querySelector("[data-sky-now]") || doc.querySelector("[data-sky-now]");
    var tag = doc.querySelector("[data-sky-tag]");
    if (!el) return;
    var info = wxInfo(c.weather_code, c.is_day), aq = aqiInfo(aqi);
    var dew = skyDewpoint(c.temperature_2m, c.relative_humidity_2m);
    var uv = c.uv_index != null ? Math.round(c.uv_index) : null;
    if (tag) tag.textContent = "Measured over the red rocks moments ago — refreshed while you read.";
    function tile(v, lab, sub) { return '<div class="skg"><b>' + v + '</b><span>' + lab + '</span>' + (sub ? '<i>' + sub + '</i>' : '') + '</div>'; }
    el.innerHTML =
      '<div class="skyhero-main"><span class="skyhero-ic">' + info.icon + '</span>' +
      '<span class="skyhero-t">' + Math.round(c.temperature_2m) + '°</span>' +
      '<span class="skyhero-cond"><b>' + esc(info.label) + '</b><i>feels like ' + Math.round(c.apparent_temperature) + '°</i></span></div>' +
      '<div class="skyhero-grid">' +
      tile(Math.round(c.wind_speed_10m) + '<small> mph ' + skyDir(c.wind_direction_10m) + '</small>', 'wind', c.wind_gusts_10m ? 'gusts ' + Math.round(c.wind_gusts_10m) + ' mph' : 'steady') +
      tile(c.relative_humidity_2m + '<small>%</small>', 'humidity', dew != null ? 'dewpoint ' + dew + '°' : '') +
      (uv != null ? tile(uv, 'uv index', skyUvLabel(uv)) : '') +
      (aq ? tile(aq.v, 'air quality', aq.label) : '') +
      tile(c.cloud_cover + '<small>%</small>', 'cloud cover', c.cloud_cover <= 20 ? 'photographers rejoice' : c.cloud_cover >= 75 ? 'full deck' : 'mixed sky') +
      tile(Math.round(c.pressure_msl) + '<small> hPa</small>', 'pressure', c.pressure_msl < 1005 ? 'stormy side' : c.pressure_msl > 1020 ? 'high & steady' : 'seasonal') +
      '</div>';
  }
  function skyHourly(root, h, daily) {
    var cv = root.querySelector("[data-sky-hourly]"); if (!cv || !h.time) return;
    var n = Math.min(25, h.time.length);
    var W = cv.clientWidth || cv.parentNode.clientWidth || 900, H = 270, dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
    var x = cv.getContext("2d"); x.scale(dpr, dpr);
    var temps = h.temperature_2m.slice(0, n), pp = (h.precipitation_probability || []).slice(0, n);
    var tMin = Math.min.apply(null, temps), tMax = Math.max.apply(null, temps), pad = 36;
    function X(i) { return pad + (W - pad * 2) * i / (n - 1); }
    function Y(t) { return 42 + (H - 118) * (1 - (t - tMin) / Math.max(1, tMax - tMin)); }
    x.clearRect(0, 0, W, H);
    // night shading from real sunrise/sunset
    var suns = [];
    if (daily && daily.sunrise) for (var k = 0; k < daily.sunrise.length; k++) suns.push([new Date(daily.sunrise[k]).getTime(), new Date(daily.sunset[k]).getTime()]);
    function isNight(t) {
      var ms = new Date(t).getTime();
      for (var k = 0; k < suns.length; k++) { if (ms >= suns[k][0] && ms <= suns[k][1]) return false; }
      return suns.length > 0;
    }
    var half = (W - pad * 2) / (n - 1) / 2;
    for (var i = 0; i < n; i++) {
      if (!isNight(h.time[i])) continue;
      x.fillStyle = "rgba(4,8,24,.5)";
      x.fillRect(X(i) - half, 14, half * 2, H - 76);
    }
    // gradient under the temp curve
    var grad = x.createLinearGradient(0, 42, 0, H - 76);
    grad.addColorStop(0, "rgba(217,165,63,.34)"); grad.addColorStop(1, "rgba(217,165,63,0)");
    x.beginPath(); x.moveTo(X(0), H - 62);
    for (var i = 0; i < n; i++) x.lineTo(X(i), Y(temps[i]));
    x.lineTo(X(n - 1), H - 62); x.closePath(); x.fillStyle = grad; x.fill();
    // precip probability bars
    for (var i = 0; i < n; i++) {
      var p = pp[i] || 0; if (!p) continue;
      var bh = (H - 118) * p / 100;
      x.fillStyle = "rgba(120,180,255," + (0.25 + p / 220) + ")";
      x.fillRect(X(i) - 5, H - 62 - bh, 10, bh);
      if (p >= 30) { x.fillStyle = "#9ecbff"; x.font = "700 10px Lato,sans-serif"; x.textAlign = "center"; x.fillText(p + "%", X(i), H - 68 - bh); }
    }
    // temp line
    x.beginPath(); x.lineWidth = 3; x.strokeStyle = "#ffd88a"; x.lineJoin = "round";
    for (var i = 0; i < n; i++) { i ? x.lineTo(X(i), Y(temps[i])) : x.moveTo(X(i), Y(temps[i])); }
    x.stroke();
    // hi / lo callouts
    var hiI = temps.indexOf(tMax), loI = temps.indexOf(tMin);
    x.font = "900 13px Lato,sans-serif"; x.textAlign = "center";
    x.fillStyle = "#ffe9a8"; x.fillText(Math.round(tMax) + "°", X(hiI), Y(tMax) - 12);
    x.fillStyle = "#9aa4c9"; x.fillText(Math.round(tMin) + "°", X(loI), Y(tMin) + 20);
    x.font = "800 11.5px Lato,sans-serif"; x.fillStyle = "rgba(233,237,255,.85)";
    for (var i = 4; i < n - 1; i += 4) { if (i !== hiI && i !== loI) x.fillText(Math.round(temps[i]) + "°", X(i), Y(temps[i]) - 10); }
    // now dot
    x.beginPath(); x.arc(X(0), Y(temps[0]), 5.5, 0, 7); x.fillStyle = "#ff9a7a"; x.fill();
    x.font = "900 10px Lato,sans-serif"; x.fillStyle = "#ff9a7a"; x.fillText("NOW", X(0), Y(temps[0]) - 12);
    // hour labels
    x.fillStyle = "rgba(203,214,255,.65)"; x.font = "700 10.5px Lato,sans-serif";
    for (var i = 0; i < n; i += 4) {
      var hh = new Date(h.time[i]).getHours(), lab = i === 0 ? "now" : ((hh % 12) || 12) + (hh < 12 ? "am" : "pm");
      x.fillText(lab, X(i), H - 42);
    }
    x.fillStyle = "rgba(203,214,255,.5)"; x.textAlign = "left";
    x.fillText("— temperature    ▮ chance of rain    ▓ night", pad, H - 16);
  }
  function skyMonsoon(root, h) {
    var el = root.querySelector("[data-sky-monsoon]"); if (!el) return;
    var m = new Date(Date.now() - 7 * 3600000).getUTCMonth() + 1;
    if (m < 6 || m > 9 || !h.cape) return; // monsoon season only — no theater off-season
    var peak = 0, peakP = 0;
    for (var i = 0; i < Math.min(25, h.cape.length); i++) { if (h.cape[i] > peak) peak = h.cape[i]; if ((h.precipitation_probability || [])[i] > peakP) peakP = h.precipitation_probability[i]; }
    peak = Math.round(peak);
    var verdict = peak < 300 ? ["quiet", "Not enough fuel for storms today — the sky is off duty."]
      : peak < 1000 ? ["stirring", "Some fuel in the column — isolated buildups over the rim are possible."]
      : peak < 2000 ? ["primed", "Real storm fuel out there — watch the radar from early afternoon."]
      : ["loaded", "The atmosphere is loaded — expect cells to fire and check the radar before any canyon plans."];
    el.hidden = false;
    el.innerHTML = '<span class="sky-mon-badge sky-mon--' + verdict[0] + '">&#9889; Monsoon meter: ' + verdict[0].toUpperCase() + '</span>' +
      '<span class="sky-mon-body"><b>Storm fuel (CAPE) peaks near ' + peak + ' J/kg in the next 24h' + (peakP ? ' · rain odds top out at ' + peakP + '%' : '') + '.</b> ' + verdict[1] + '</span>';
  }
  var SKY_FT = [6909, 5200, 4350, 3314, 3147];
  function skyElev(root, spots) {
    var el = root.querySelector("[data-sky-elev]"), note = root.querySelector("[data-sky-elevnote]");
    if (!el) return;
    var topFt = SKY_FT[0], botFt = SKY_FT[SKY_FT.length - 1];
    el.innerHTML = spots.map(function (d, i) {
      var s = SKY_SPOTS[i], c = d.current, info = wxInfo(c.weather_code, c.is_day);
      var drop = Math.round((topFt - SKY_FT[i]) / (topFt - botFt) * 84);
      return '<div class="sky-spot' + (s.n === "Sedona" ? " sky-spot--home" : "") + '" style="--drop:' + drop + 'px"><b>' + esc(s.n) + '</b><i>' + s.e + '</i>' +
        '<span class="sky-spot-ic">' + info.icon + '</span><span class="sky-spot-t">' + Math.round(c.temperature_2m) + '°</span>' +
        '<em>' + Math.round(c.wind_speed_10m) + ' mph</em></div>';
    }).join("");
    var ts = spots.map(function (d) { return d.current.temperature_2m; });
    var spread = Math.round(Math.max.apply(null, ts) - Math.min.apply(null, ts));
    if (note) note.innerHTML = 'The elevator is running <b>' + spread + '&deg; top to bottom</b> right now.';
  }
  function skyWeek(root, dl) {
    var el = root.querySelector("[data-sky-week]"); if (!el || !dl.time) return;
    var days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    var wkMin = Math.min.apply(null, dl.temperature_2m_min), wkMax = Math.max.apply(null, dl.temperature_2m_max), rng = Math.max(1, wkMax - wkMin);
    function tm(s) { var d = new Date(s); var h = d.getHours(), mn = d.getMinutes(); return ((h % 12) || 12) + ":" + (mn < 10 ? "0" : "") + mn + (h < 12 ? "a" : "p"); }
    el.innerHTML = dl.time.map(function (t, i) {
      var info = wxInfo(dl.weather_code[i], 1);
      var d = new Date(t + "T12:00:00");
      var lo = dl.temperature_2m_min[i], hi = dl.temperature_2m_max[i];
      var left = Math.round((lo - wkMin) / rng * 100), width = Math.max(6, Math.round((hi - lo) / rng * 100));
      return '<div class="sky-day' + (i === 0 ? " sky-day--today" : "") + '"><b>' + (i === 0 ? "Today" : days[d.getDay()]) + '</b>' +
        '<span class="sky-day-ic">' + info.icon + '</span>' +
        '<span class="sky-day-t"><em>' + Math.round(hi) + '°</em> / ' + Math.round(lo) + '°</span>' +
        '<span class="sky-day-bar"><i style="left:' + left + '%;width:' + width + '%"></i></span>' +
        (dl.precipitation_probability_max[i] ? '<span class="sky-day-p">💧 ' + dl.precipitation_probability_max[i] + '%</span>' : '<span class="sky-day-p sky-day-p--dry">dry</span>') +
        '<i>☀︎ ' + tm(dl.sunrise[i]) + ' · ' + tm(dl.sunset[i]) + '</i></div>';
    }).join("");
  }
  function skyRadar(root) {
    var el = root.querySelector("[data-radar]"); if (!el || el.getAttribute("data-init")) return;
    el.setAttribute("data-init", "1");
    var timeEl = root.querySelector("[data-radar-time]"), playBtn = root.querySelector("[data-radar-play]");
    Promise.all([
      new Promise(function (res) { loadLeaflet(res); }),
      fetch("https://api.rainviewer.com/public/weather-maps.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var L = res[0], rv = res[1];
      if (!L || !el.isConnected) { el.innerHTML = '<p class="embed-note">The radar map is unavailable right now.</p>'; return; }
      var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, touchZoom: false, doubleClickZoom: false, minZoom: 6 }).setView([34.8697, -111.761], 7);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", { maxZoom: 12, subdomains: "abcd", attribution: "&copy; OpenStreetMap &copy; CARTO" }).addTo(map);
      L.circleMarker([34.8697, -111.761], { radius: 6, color: "#ffd88a", fillColor: "#ffd88a", fillOpacity: .9 }).addTo(map).bindTooltip("Sedona");
      setTimeout(function () { map.invalidateSize(); }, 250);
      if (!rv || !rv.radar) { if (timeEl) timeEl.textContent = "radar feed unavailable"; return; }
      var frames = (rv.radar.past || []).slice(-8).concat(rv.radar.nowcast || []);
      if (!frames.length) { if (timeEl) timeEl.textContent = "no precipitation frames"; return; }
      var layers = frames.map(function (f) {
        return L.tileLayer(rv.host + f.path + "/256/{z}/{x}/{y}/2/1_1.png", { opacity: 0, maxZoom: 12, attribution: "Radar &copy; RainViewer" }).addTo(map);
      });
      var idx = 0, playing = true, nowSec = rv.generated || Math.floor(Date.now() / 1000);
      function show(i) {
        layers.forEach(function (l, k) { l.setOpacity(k === i ? 0.72 : 0); });
        if (timeEl) {
          var f = frames[i], dt = new Date(f.time * 1000);
          var lab = dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
          timeEl.textContent = lab + (f.time > nowSec ? " · forecast" : "");
        }
      }
      show(idx);
      var timer = setInterval(function () {
        if (!el.isConnected) { clearInterval(timer); return; }
        if (!playing) return;
        idx = (idx + 1) % frames.length; show(idx);
      }, 750);
      if (playBtn) playBtn.addEventListener("click", function () { playing = !playing; playBtn.innerHTML = playing ? "&#10074;&#10074;" : "&#9654;"; });
      if (playBtn) playBtn.innerHTML = "&#10074;&#10074;";
    });
  }

  /* =========================================================
     JEEP TRAILS — Sedona's signature sport with a live brain. Eight
     real routes (the pink-Jeep legends and the locals' backroads),
     each judged RIGHT NOW from real inputs: 48-hour rain (slickrock
     turns to grease), monsoon storm fuel (CAPE), heat, ridge gusts,
     the actual USFS fire order, winter ice at rim elevation, and a
     last-safe-start clock computed from tonight's real sunset. Plus
     every trailhead pinned on Esri satellite imagery. Verdicts carry
     receipts; the trail always gets the final vote.
     ========================================================= */
  var JEEP_TRAILS = [
    { id: "broken-arrow", n: "Broken Arrow", fr: "FR 179F", d: 3, len: "2.5 mi", hrs: 2, climb: "≈500 ft",
      lat: 34.8443, lon: -111.7454, slick: true,
      sights: "Submarine Rock · Chicken Point · Devil's Dining Room",
      note: "The one that made Sedona famous — slickrock staircases, off-camber ledges, and the Devil's Staircase drop. 4-Lo, real clearance, and a spotter you trust." },
    { id: "schnebly", n: "Schnebly Hill Road", fr: "FR 153", d: 2, len: "12.7 mi", hrs: 3, climb: "≈2,000 ft",
      lat: 34.8654, lon: -111.7492, winter: true, top: { lat: 34.9060, lon: -111.6800 },
      sights: "Merry-Go-Round Rock · Schnebly Hill Vista · the Mogollon Rim",
      note: "The 1902 cattle road to the rim, and the rockiest 'road' you'll ever love. Passenger cars are banned past the first mile for good reason. Gated in winter above the vista." },
    { id: "soldier-pass", n: "Soldier Pass", fr: "", d: 2, len: "1.5 mi", hrs: 1.5, climb: "≈300 ft",
      lat: 34.8880, lon: -111.7850, slick: true, gate: "Gate open 8am–6pm — tiny daily capacity, arrive early",
      sights: "Devil's Kitchen sinkhole · Seven Sacred Pools · Soldier Pass Arches",
      note: "Short, gorgeous, and gated — the Forest Service meters entries through a combination gate with limited daily slots. The payoff-per-mile champion." },
    { id: "vultee", n: "Dry Creek / Vultee Arch Road", fr: "FR 152", d: 2, len: "4.3 mi", hrs: 2, climb: "≈400 ft",
      lat: 34.9037, lon: -111.7947,
      sights: "Devils Bridge trailhead · Van Deren Cabin · Vultee Arch",
      note: "The washboard-and-boulder artery of Dry Creek — how the tours reach Devils Bridge. Rockier every year; high clearance is not optional past the cabin." },
    { id: "diamondback", n: "Diamondback Gulch", fr: "FR 152A · 9513", d: 2, len: "4 mi", hrs: 2, climb: "≈450 ft",
      lat: 34.8990, lon: -111.8650,
      sights: "Bear Mountain views · the red gulches · Secret Canyon country",
      note: "The west-side tour favorite — twisty descents into wine-red gulches with ledgy climbs out. Feels remote fast, gets slick even faster after rain." },
    { id: "sycamore", n: "Sycamore Pass / Red Canyon", fr: "FR 525 · 525C", d: 1, len: "12 mi", hrs: 2.5, climb: "≈700 ft",
      lat: 34.8330, lon: -111.9020,
      sights: "Sycamore Canyon overlook · Robbers Roost turnoff · big empty country",
      note: "The gentle giant — long graded dirt through open range to the edge of Arizona's other great canyon. Any high-clearance SUV runs it dry; washboard is the toll." },
    { id: "robbers-roost", n: "Robbers Roost", fr: "FR 9530", d: 2, len: "3 mi", hrs: 1.5, climb: "≈350 ft",
      lat: 34.9304, lon: -111.9678,
      sights: "The Roost cave · Casner Mountain views · outlaw country",
      note: "A rough little spur off 525C to a hideout cave with a window view outlaws allegedly used to watch for posses. Rocky enough to be fun, short enough to be casual." },
    { id: "casner", n: "Casner Mountain", fr: "FR 761", d: 3, len: "6 mi", hrs: 3, climb: "≈2,000 ft", exposed: true,
      lat: 34.8710, lon: -111.9480, top: { lat: 34.9280, lon: -111.9260 }, winter: true,
      sights: "The powerline ridge · Sycamore Canyon from above · the whole Verde Valley",
      note: "The expert's ridgeline — a narrow powerline track climbing 2,000 feet with real exposure and zero guardrails. Wind matters up here. Views that make you forget to breathe, which is also a hazard." }
  ];
  function jeepFmtTime(dt) { return skyTime(dt, -7); } // always Sedona clock, wherever the reader is
  function initJeep() {
    var root = doc.querySelector("[data-jeep]"); if (!root) return;
    var grid = root.querySelector("[data-jeep-trails]"), desk = root.querySelector("[data-jeep-desk]");
    var wxUrl = "https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610" +
      "&current=temperature_2m,weather_code,wind_gusts_10m&hourly=cape,precipitation_probability&forecast_hours=25" +
      "&daily=precipitation_sum,temperature_2m_max&past_days=2&forecast_days=1" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=America%2FPhoenix";
    var rimUrl = "https://api.open-meteo.com/v1/forecast?latitude=34.906&longitude=-111.68&elevation=1830" +
      "&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FPhoenix";
    Promise.all([
      fetch(wxUrl, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(rimUrl, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch("fire.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch("jeeptrails-geo.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var d = res[0], rim = res[1], fire = res[2], geo = res[3] || {};
      var sunset = null; try { sunset = goldenTimes(new Date()).evening.b.sunset; } catch (e) {}
      var sig = {
        temp: d && d.current ? Math.round(d.current.temperature_2m) : null,
        hiToday: d && d.daily ? Math.round(d.daily.temperature_2m_max[d.daily.temperature_2m_max.length - 1]) : null,
        gusts: d && d.current ? Math.round(d.current.wind_gusts_10m || 0) : 0,
        rain48: 0, cape: 0, popMax: 0,
        rimTemp: rim && rim.current ? Math.round(rim.current.temperature_2m) : null,
        rimSnow: rim && rim.current ? (rim.current.weather_code >= 71 && rim.current.weather_code <= 86) : false,
        fireStage: fire && fire.stage != null ? fire.stage : null,
        sunset: sunset,
        month: new Date(Date.now() - 7 * 3600000).getUTCMonth() + 1
      };
      if (d && d.daily && d.daily.precipitation_sum) d.daily.precipitation_sum.forEach(function (v) { sig.rain48 += (v || 0); });
      if (d && d.hourly) for (var i = 0; i < Math.min(25, (d.hourly.cape || []).length); i++) {
        if (d.hourly.cape[i] > sig.cape) sig.cape = d.hourly.cape[i];
        if ((d.hourly.precipitation_probability || [])[i] > sig.popMax) sig.popMax = d.hourly.precipitation_probability[i];
      }
      sig.rain48 = Math.round(sig.rain48 * 100) / 100; sig.cape = Math.round(sig.cape);
      if (desk) jeepDesk(desk, sig);
      if (grid) jeepGrid(grid, sig, geo);
      jeepMellow(root, sig);
      jeepMap(root, geo);
    });
  }
  /* THE MELLOW METER™ — the official KAZM measurement of how mellow the
     mountain is right now. 100 minus everything the desert is doing to
     un-mellow it, receipts itemized. */
  function jeepMellow(root, s) {
    var el = root.querySelector("[data-mellow]"); if (!el) return;
    var score = 100, why = [];
    if (s.gusts > 15) { var w1 = Math.min(20, Math.round((s.gusts - 15) * 1.2)); score -= w1; why.push("wind −" + w1); }
    if (s.month >= 6 && s.month <= 9 && s.cape >= 300) { var w2 = Math.min(25, Math.round(s.cape / 100)); score -= w2; why.push("storm fuel −" + w2); }
    if (s.rain48 > 0.05) { var w3 = Math.min(20, Math.round(s.rain48 * 30)); score -= w3; why.push("wet rock −" + w3); }
    if (s.hiToday != null && s.hiToday >= 95) { var w4 = Math.min(20, (s.hiToday - 95) * 2); score -= w4; why.push("heat −" + w4); }
    if (s.temp != null && s.temp < 45) { var w5 = Math.min(15, 45 - s.temp); score -= w5; why.push("cold −" + w5); }
    if (s.fireStage) { var w6 = s.fireStage * 5; score -= w6; why.push("fire order −" + w6); }
    var dow = new Date(Date.now() - 7 * 3600000).getUTCDay();
    if (dow === 0 || dow === 5 || dow === 6) { score -= 10; why.push("weekend crowds −10"); }
    score = Math.max(5, Math.min(100, Math.round(score)));
    var label = score >= 85 ? "FULL MELLOW" : score >= 65 ? "MOSTLY MELLOW" : score >= 45 ? "SLIGHTLY SPICY" : "NOT MELLOW TODAY";
    el.hidden = false;
    el.innerHTML = '<div class="mm-head"><span class="mm-tm">THE MELLOW METER&trade;</span><span class="mm-sub">the official KAZM measurement of how mellow the mountain is right now</span></div>' +
      '<div class="mm-body"><canvas class="mm-gauge" width="240" height="140" aria-label="Mellow Meter gauge reading ' + score + ' out of 100"></canvas>' +
      '<div class="mm-read"><b>' + score + '</b><span class="mm-label">' + label + '</span>' +
      '<i>' + (why.length ? "docked for: " + why.join(" · ") : "the desert has no complaints") + '</i></div></div>';
    var cv = el.querySelector(".mm-gauge"), x = cv.getContext("2d");
    var cx = 120, cy = 124, R = 96;
    function arc(a0, a1, color) {
      x.beginPath(); x.lineWidth = 17; x.strokeStyle = color; x.lineCap = "butt";
      x.arc(cx, cy, R, Math.PI * (1 + a0), Math.PI * (1 + a1)); x.stroke();
    }
    arc(0, .45, "rgba(200,74,58,.85)"); arc(.45, .65, "rgba(217,165,63,.9)"); arc(.65, .85, "rgba(140,190,110,.9)"); arc(.85, 1, "rgba(72,160,90,.95)");
    var ang = Math.PI * (1 + score / 100);
    x.beginPath(); x.lineWidth = 4; x.strokeStyle = "#fdf3e7"; x.lineCap = "round";
    x.moveTo(cx, cy); x.lineTo(cx + Math.cos(ang) * (R - 24), cy + Math.sin(ang) * (R - 24)); x.stroke();
    x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fillStyle = "#fdf3e7"; x.fill();
  }
  function jeepVerdict(t, s) {
    // returns [level 0 green | 1 gold | 2 red, short verdict, receipt]
    if (s.fireStage != null && s.fireStage >= 3) return [2, "CLOSED-LEVEL RESTRICTIONS", "Stage " + s.fireStage + " fire order — forest access is restricted, check USFS before burning a drop of fuel"];
    if (t.winter && s.rimSnow) return [2, "SNOW UP TOP", "snow falling at rim elevation right now" + (s.rimTemp != null ? " (" + s.rimTemp + "° up there)" : "")];
    if (t.winter && s.rimTemp != null && s.rimTemp <= 34 && s.rain48 > 0.05) return [2, "ICE RISK ON TOP", s.rimTemp + "° at the rim with " + s.rain48 + "\" of recent moisture — the upper gate may be shut"];
    if (t.slick && s.rain48 >= 0.3) return [2, "GREASED SLICKROCK", s.rain48 + "\" of rain in 48h — wet sandstone is ice with better scenery; give it a dry day"];
    if (s.rain48 >= 0.6) return [1, "MUDDY — RUN CAREFUL", s.rain48 + "\" in 48h — expect slop in the low spots and ruts that want your sidewalls"];
    if (t.exposed && s.gusts >= 35) return [2, "RIDGE WINDS", "gusting " + s.gusts + " mph right now — not the day for an exposed powerline climb"];
    if (s.month >= 6 && s.month <= 9 && s.cape >= 1200) return [1, "STORMS BREWING — GO EARLY", "storm fuel at " + s.cape + " J/kg" + (s.popMax ? ", rain odds to " + s.popMax + "%" : "") + " — be off open rock by noon"];
    if (s.hiToday != null && s.hiToday >= 100) return [1, "DAWN PATROL ONLY", "headed for " + s.hiToday + "° — run it at first light, carry double water"];
    if (t.exposed && s.gusts >= 25) return [1, "BREEZY ON THE RIDGE", "gusts " + s.gusts + " mph — fine, but keep the speed honest up top"];
    var why = [];
    why.push(s.rain48 <= 0.02 ? "dry 48 hours" : "only " + s.rain48 + "\" in 48h");
    if (s.month >= 6 && s.month <= 9) why.push("storm fuel low (" + s.cape + " J/kg)");
    if (s.temp != null) why.push(s.temp + "° now");
    return [0, "GOOD TO RUN", why.join(" · ")];
  }
  function jeepDesk(el, s) {
    function tile(v, lab, sub) { return '<div class="jdk"><b>' + v + '</b><span>' + lab + '</span>' + (sub ? '<i>' + sub + '</i>' : '') + '</div>'; }
    el.innerHTML =
      tile(s.rain48 <= 0.02 ? "DRY" : s.rain48 + '"', "rain, last 48h", s.rain48 >= 0.3 ? "slickrock is greasy" : "traction weather") +
      (s.month >= 6 && s.month <= 9 ? tile(s.cape + '<small> J/kg</small>', "storm fuel today", s.cape >= 1200 ? "cells likely — go early" : s.cape >= 300 ? "isolated buildups" : "sky off duty") : "") +
      (s.temp != null ? tile(s.temp + "°", "in town now", s.hiToday != null ? "headed for " + s.hiToday + "°" : "") : "") +
      (s.rimTemp != null ? tile(s.rimTemp + "°", "at the rim (6,000′)", s.rimSnow ? "❄️ snowing up top" : "") : "") +
      tile(s.gusts + '<small> mph</small>', "gusts", s.gusts >= 35 ? "stay off the ridges" : s.gusts >= 25 ? "breezy up high" : "calm enough") +
      (s.fireStage != null ? tile("Stage " + s.fireStage, "fire order", s.fireStage >= 2 ? "no campfires, no smoking on trail" : "restrictions posted") : "") +
      (s.sunset ? tile(jeepFmtTime(s.sunset), "sunset tonight", "plan to be off rock before it") : "");
  }
  function jeepGrid(el, s, geo) {
    var D = { 1: ["jd-1", "GREEN · stock high-clearance"], 2: ["jd-2", "GOLD · real 4x4, low range"], 3: ["jd-3", "BLACK · lockers & humility"] };
    el.innerHTML = JEEP_TRAILS.map(function (t) {
      var v = jeepVerdict(t, s), dd = D[t.d];
      var lastStart = "";
      if (s.sunset) {
        var start = new Date(s.sunset.getTime() - (t.hrs + 0.5) * 3600000);
        lastStart = '<span class="jt-start">⏱ last smart start today: <b>' + jeepFmtTime(start) + '</b></span>';
      }
      return '<article class="jt" id="jt-' + t.id + '">' +
        '<div class="jt-head"><h3>' + esc(t.n) + '</h3>' + (t.fr ? '<span class="jt-fr">' + esc(t.fr) + '</span>' : '') + '</div>' +
        '<span class="jt-diff ' + dd[0] + '">' + dd[1] + '</span>' +
        (geo && geo[t.id]
          ? '<p class="jt-stats">' + geo[t.id].len_mi + ' mi measured · ' + geo[t.id].gain_ft.toLocaleString() + ' ft gain · ' + geo[t.id].bot_ft.toLocaleString() + '–' + geo[t.id].top_ft.toLocaleString() + ' ft · ~' + t.hrs + ' hr</p>'
          : '<p class="jt-stats">' + t.len + ' · ' + t.climb + ' · ~' + t.hrs + ' hr</p>') +
        '<p class="jt-sights">' + esc(t.sights) + '</p>' +
        '<p class="jt-note">' + esc(t.note) + '</p>' +
        (t.gate ? '<p class="jt-gate">🚧 ' + esc(t.gate) + '</p>' : '') +
        (geo && geo[t.id] ? '<canvas class="jt-prof" data-prof="' + t.id + '" aria-label="Real elevation profile of ' + esc(t.n) + '"></canvas>' : '') +
        '<div class="jt-verdict jt-verdict--' + v[0] + '"><b>' + (v[0] === 0 ? "🟢 " : v[0] === 1 ? "🟡 " : "🔴 ") + v[1] + '</b><span>' + esc(v[2]) + '</span></div>' +
        lastStart +
        '</article>';
    }).join("");
    // draw the real elevation profiles — measured from OSM geometry + elevation model
    if (geo) el.querySelectorAll(".jt-prof").forEach(function (cv) {
      var g = geo[cv.getAttribute("data-prof")]; if (!g) return;
      var W = cv.clientWidth || 420, H = 74, dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
      var x = cv.getContext("2d"); x.scale(dpr, dpr);
      var e = g.p.e, d = g.p.d, n = e.length, lo = g.bot_ft, hi = g.top_ft, pad = 4;
      function X(i) { return pad + (W - pad * 2) * (d[i] / d[n - 1]); }
      function Y(v) { return 8 + (H - 26) * (1 - (v - lo) / Math.max(1, hi - lo)); }
      var grad = x.createLinearGradient(0, 8, 0, H - 18);
      grad.addColorStop(0, "rgba(169,87,80,.4)"); grad.addColorStop(1, "rgba(169,87,80,.04)");
      x.beginPath(); x.moveTo(X(0), H - 18);
      for (var i = 0; i < n; i++) x.lineTo(X(i), Y(e[i]));
      x.lineTo(X(n - 1), H - 18); x.closePath(); x.fillStyle = grad; x.fill();
      x.beginPath(); x.lineWidth = 2.5; x.strokeStyle = "#a95750"; x.lineJoin = "round";
      for (var i = 0; i < n; i++) { i ? x.lineTo(X(i), Y(e[i])) : x.moveTo(X(i), Y(e[i])); }
      x.stroke();
      x.font = "700 9.5px Lato,sans-serif"; x.fillStyle = "rgba(44,38,32,.55)";
      x.textAlign = "left"; x.fillText(e[0].toLocaleString() + " ft", pad + 2, H - 6);
      x.textAlign = "right"; x.fillText(e[n - 1].toLocaleString() + " ft · " + d[n - 1] + " mi", W - pad - 2, H - 6);
    });
  }
  function jeepMap(root, geo) {
    var el = root.querySelector("[data-jeep-map]"); if (!el || el.getAttribute("data-init")) return;
    el.setAttribute("data-init", "1");
    loadLeaflet(function (L) {
      if (!L || !el.isConnected) { if (el.isConnected) el.innerHTML = '<p class="embed-note">The satellite map is unavailable right now.</p>'; return; }
      var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, touchZoom: false, doubleClickZoom: false }).setView([34.873, -111.83], 11);
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 17, attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics · Trail lines &copy; OpenStreetMap contributors"
      }).addTo(map);
      var C = { 1: "#5cb860", 2: "#ffd88a", 3: "#ff6b57" };
      // real trail lines from OpenStreetMap
      JEEP_TRAILS.forEach(function (t) {
        var g = geo && geo[t.id]; if (!g || !g.c) return;
        g.c.forEach(function (seg) {
          L.polyline(seg, { color: C[t.d], weight: 3.5, opacity: .95 }).addTo(map)
            .bindPopup('<b>' + esc(t.n) + '</b><br>' + g.len_mi + ' mi · ' + g.gain_ft.toLocaleString() + ' ft gain<br><a href="#jt-' + t.id + '">Trail card ↓</a>');
        });
      });
      JEEP_TRAILS.forEach(function (t) {
        L.circleMarker([t.lat, t.lon], { radius: 9, color: "#10162e", weight: 2, fillColor: C[t.d], fillOpacity: .95 })
          .addTo(map)
          .bindPopup('<b>' + esc(t.n) + '</b><br>' + t.len + ' · ' + (t.d === 1 ? "green" : t.d === 2 ? "gold" : "black") + ' rated<br><a href="#jt-' + t.id + '">Trail card ↓</a>');
      });
      setTimeout(function () { map.invalidateSize(); }, 250);
    });
  }

  /* =========================================================
     THE TAPE — two weeks of KAZM, rewindable. Reads rewind.json
     (same-origin config pointing at the archive Space) then the
     archive's manifest.json; renders a shelf of days, four 6-hour
     blocks each, an HTML5 player with hour-jump buttons, and deep
     links (#b=2026-07-05-06&h=3). The whole page shows its honest
     "not rolling yet" state until the recorder exists — no fakes.
     Blocks are 6h and pruned at 14 days: the statutory license terms,
     enforced by the recorder and stated on the page.
     ========================================================= */
  /* =========================================================
     OUT THE STATION WINDOW — a generated view of the red rocks that
     is never faked: sky color from the sun's real altitude (computed),
     stars and the real moon phase after dark, cloud cover and drift
     from the actual weather feed (count = cover %, speed = wind),
     rain when it is truly raining. The caption prints the receipts.
     Repaints once a minute; weather refreshes every five.
     ========================================================= */
  function swSunAlt(date) {
    var lat = 34.8697 * Math.PI / 180, lon = -111.761;
    var start = Date.UTC(date.getUTCFullYear(), 0, 0);
    var doy = (date.getTime() - start) / 86400000;
    var decl = -23.44 * Math.cos(2 * Math.PI / 365 * (doy + 10)) * Math.PI / 180;
    var utcH = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
    var ha = ((utcH + lon / 15) - 12) * 15 * Math.PI / 180;
    return Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha)) * 180 / Math.PI;
  }
  function swLerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }
  function swMix(c1, c2, t) { return [swLerp(c1[0], c2[0], t), swLerp(c1[1], c2[1], t), swLerp(c1[2], c2[2], t)]; }
  function swRGB(c) { return "rgb(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + ")"; }
  function initWindow() {
    var cv = doc.querySelector("[data-window]"); if (!cv || cv.getAttribute("data-init")) return;
    cv.setAttribute("data-init", "1");
    var cap = doc.querySelector("[data-window-cap]");
    var wx = { cover: 30, code: 0, wind: 5, temp: null, aqi: null, dew: null };
    function getWx() {
      fetch("https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,dew_point_2m&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FPhoenix", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
          if (d && d.current) { wx.cover = d.current.cloud_cover; wx.code = d.current.weather_code; wx.wind = d.current.wind_speed_10m; wx.temp = Math.round(d.current.temperature_2m); if (isFinite(d.current.dew_point_2m)) wx.dew = Math.round(d.current.dew_point_2m); }
        }).catch(function () {});
      fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=34.8697&longitude=-111.7610&current=us_aqi&timezone=America/Phoenix", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
          if (d && d.current && isFinite(d.current.us_aqi)) wx.aqi = Math.round(d.current.us_aqi);
        }).catch(function () {});
    }
    getWx(); var wxT = setInterval(function () { if (!cv.isConnected) { clearInterval(wxT); return; } getWx(); }, 300000);
    // stable star field, seeded by the day
    var seed = Math.floor(Date.now() / 86400000), stars = [];
    for (var i = 0; i < 90; i++) { seed = (seed * 16807) % 2147483647; var sx = (seed % 1000) / 1000; seed = (seed * 16807) % 2147483647; var sy = (seed % 1000) / 1000; stars.push([sx, sy * .55, (seed % 3) + 1]); }
    var clouds = [];
    for (var i = 0; i < 10; i++) clouds.push({ x: Math.random(), y: .08 + Math.random() * .3, s: .6 + Math.random() * .9 });
    var drops = []; for (var i = 0; i < 90; i++) drops.push([Math.random(), Math.random()]);
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var W, H, x;
    function size() {
      // widescreen, like the streams it grew up on
      var maxW = Math.min(940, (cv.parentNode && cv.parentNode.clientWidth) || 940);
      W = maxW; H = Math.round(W * .6);
      cv.style.width = W + "px"; cv.style.margin = "0 auto";
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.height = H + "px";
      x = cv.getContext("2d"); x.scale(dpr, dpr);
      if (typeof fx !== "undefined") { fx.width = cv.width; fx.height = cv.height; }
      if (typeof fogC !== "undefined") { fogC.width = Math.round(cv.width / 2); fogC.height = Math.round(cv.height / 2); fogSeeded = false; }
      if (typeof miniC !== "undefined") { miniC.width = Math.max(80, Math.round(cv.width / 5)); miniC.height = Math.max(88, Math.round(cv.height / 5)); }
      if (typeof PLATES !== "undefined") PLATES.forEach(function (p) { p.layers = null; });
    }
    size();
    // the REAL view out the back door, cartooned: the AM tower and its guys,
    // the big dish, the rain gauge, the lone pine, flagstones in red dirt
    var TREES = []; var ts = 42;
    for (var i = 0; i <= 40; i++) { ts = (ts * 16807) % 2147483647; TREES.push(.6 - ((ts % 100) / 100) * .06); }
    var STONES = [[.06,.9,.09],[.16,.94,.11],[.27,.9,.08],[.12,.84,.07],[.22,.85,.06],[.35,.95,.09]];
    // the REAL photo out the back door — when backdoor.jpg exists in the repo
    // the window becomes the photograph itself, graded live; the drawn scene
    // below is only the fallback until then.
    var PHOTO = { ok: false, img: null, dayOk: false, day: null };
    // ALL of Chuck's real photographs of the yard, stitched into one living
    // scene: the window tours them slowly, each pool honest to its hour —
    // midday frames while the sun is high, dusk frames as it falls
    // ONE view, enhanced — the other photographs of the yard are reference
    // sources (angles, colors, the real night), not a slideshow. Only the
    // prim plates ever show: the back door for dusk and night, the true
    // midday frame while the sun is high.
    // the plates are PAINTED from the real photographs — the chillhop look,
    // the real yard: same framing, same masks, every live system still runs
    // ONE painting, widescreen — the yard at moonrise, the dog mid-rounds,
    // the tower on the right. The real sun and weather do all the acting.
    var PLATES = [
      { src: "paint-wide.jpg", mk: "skymask-wide.png", pool: "dusk", prim: 1, hz: .58, nightOk: 1, name: "the yard, painted" }
    ];
    function ensurePlate(p) {
      if (p.loading) return;
      p.loading = true;
      var im = new Image();
      im.onload = function () {
        p.img = im; p.ok = true; p.layers = null;
        if (p.pool === "dusk") { PHOTO.ok = true; PHOTO.img = im; if (typeof size === "function") size(); }
        if (p.pool === "day") { PHOTO.dayOk = true; PHOTO.day = im; }
      };
      im.onerror = function () {};
      im.src = p.src;
      var mi = new Image();
      mi.onload = function () { p.mimg = mi; p.mok = true; p.layers = null; };
      mi.onerror = function () {};
      mi.src = p.mk;
    }
    PLATES.forEach(ensurePlate);
    // parallax: the window looks INTO a place — mouse or phone-tilt shifts
    // the near ground more than the trees, and the sky not at all
    var par = { tx: 0, ty: 0, cx: 0, cy: 0, lastIn: -99, asked: false };
    function parSet(nx, ny, el2) { par.tx = Math.max(-1, Math.min(1, nx)); par.ty = Math.max(-1, Math.min(1, ny)); par.lastIn = el2; }
    cv.addEventListener("pointermove", function (e) {
      var r = cv.getBoundingClientRect();
      parSet(((e.clientX - r.left) / r.width - .5) * 2, ((e.clientY - r.top) / r.height - .5) * 2, (Date.now() - t0) / 1000);
      wipeAt(e);
    });
    var tiltBase = null;
    function onTilt(e) {
      if (e.beta == null || e.gamma == null) return;
      var g = e.gamma, b = e.beta;
      if (window.screen && screen.orientation && Math.abs(screen.orientation.angle) === 90) { var sw2 = g; g = b * (screen.orientation.angle === 90 ? -1 : 1); b = sw2 * (screen.orientation.angle === 90 ? 1 : -1); }
      if (!tiltBase) tiltBase = [g, b];
      parSet((g - tiltBase[0]) / 14, (b - tiltBase[1]) / 14, (Date.now() - t0) / 1000);
    }
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission !== "function") {
      window.addEventListener("deviceorientation", onTilt);
    }
    cv.addEventListener("pointerdown", function (e) {
      if (!par.asked && typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        par.asked = true;
        DeviceOrientationEvent.requestPermission().then(function (g) { if (g === "granted") window.addEventListener("deviceorientation", onTilt); }).catch(function () {});
      }
      wipeAt(e);
    });
    // parallax layer cache: per plate, the sky slice and the near-ground
    // slice, cut with the baked masks and a feathered horizon. Layers are
    // capped in resolution and evicted when a plate leaves the tour, so
    // seven plates never weigh more than a few active ones.
    function plateGeom(p) {
      var dh2 = p.img.naturalHeight * (W / p.img.naturalWidth);
      return p.full ? { y: -0.02 * dh2, h: dh2 } : { y: 0, h: dh2 };
    }
    function cutLayers(p) {
      var g = plateGeom(p);
      var lw = Math.min(cv.width, Math.round(W * 1.25)), lh = Math.round(lw * H / W), sc = lw / W;
      var mk = function () { var c = document.createElement("canvas"); c.width = lw; c.height = lh; return c; };
      var full = mk(), fc = full.getContext("2d");
      fc.setTransform(sc, 0, 0, sc, 0, 0); fc.drawImage(p.img, 0, g.y, W, g.h);
      var sky = null;
      if (p.mok) {
        sky = mk(); var s2 = sky.getContext("2d"); s2.drawImage(full, 0, 0);
        s2.globalCompositeOperation = "destination-in";
        s2.setTransform(sc, 0, 0, sc, 0, 0); s2.drawImage(p.mimg, 0, g.y, W, g.h);
      }
      var gnd = mk(), gc = gnd.getContext("2d"); gc.drawImage(full, 0, 0);
      gc.globalCompositeOperation = "destination-in";
      var gg = gc.createLinearGradient(0, (p.hz - .07) * lh, 0, (p.hz + .02) * lh);
      gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(1, "rgba(0,0,0,1)");
      gc.fillStyle = gg; gc.fillRect(0, 0, lw, lh);
      p.layers = { full: full, sky: sky, gnd: gnd, lw: lw, lh: lh };
    }
    // the sky-effects scratch canvas (stars, moon, clouds — masked to real sky)
    var fx = document.createElement("canvas"), fxx = fx.getContext("2d");
    // the fogged-glass layer: condensation you can wipe with a finger
    var fogC = document.createElement("canvas"), fogX = fogC.getContext("2d"), fogA = 0, fogSeeded = false;
    function seedFog() {
      fogX.setTransform(1, 0, 0, 1, 0, 0);
      fogX.globalCompositeOperation = "source-over";
      fogX.clearRect(0, 0, fogC.width, fogC.height);
      fogX.fillStyle = "rgba(216,224,232,.92)"; fogX.fillRect(0, 0, fogC.width, fogC.height);
      for (var fi = 0; fi < 130; fi++) {
        var fxp = Math.random() * fogC.width, fyp = Math.random() * fogC.height, fr = 12 + Math.random() * 60;
        var fgd = fogX.createRadialGradient(fxp, fyp, 0, fxp, fyp, fr);
        var lite = Math.random() < .5;
        fgd.addColorStop(0, lite ? "rgba(255,255,255,.10)" : "rgba(170,182,196,.10)");
        fgd.addColorStop(1, "rgba(200,210,220,0)");
        fogX.fillStyle = fgd; fogX.beginPath(); fogX.arc(fxp, fyp, fr, 0, 7); fogX.fill();
      }
      fogSeeded = true;
    }
    function wipeAt(e) {
      if (fogA < .05) return;
      var r = cv.getBoundingClientRect();
      var wxp = (e.clientX - r.left) / r.width * fogC.width, wyp = (e.clientY - r.top) / r.height * fogC.height;
      var br = fogC.width * .085;
      fogX.setTransform(1, 0, 0, 1, 0, 0);
      fogX.globalCompositeOperation = "destination-out";
      var wg = fogX.createRadialGradient(wxp, wyp, 0, wxp, wyp, br);
      wg.addColorStop(0, "rgba(0,0,0,.9)"); wg.addColorStop(.7, "rgba(0,0,0,.55)"); wg.addColorStop(1, "rgba(0,0,0,0)");
      fogX.fillStyle = wg; fogX.beginPath(); fogX.arc(wxp, wyp, br, 0, 7); fogX.fill();
      fogX.globalCompositeOperation = "source-over";
    }
    // clinging raindrops that refract the scene upside-down, like real glass
    var gdrops = [], miniC = document.createElement("canvas"), miniX = miniC.getContext("2d"), miniAt = -99;
    // film grain, pre-rendered once — the analog hiss of the picture
    var grainC = document.createElement("canvas"), grainP = null;
    (function () {
      grainC.width = grainC.height = 160;
      var g = grainC.getContext("2d"), id = g.createImageData(160, 160);
      for (var gi = 0; gi < id.data.length; gi += 4) {
        var v = (Math.random() * 255) | 0;
        id.data[gi] = id.data[gi + 1] = id.data[gi + 2] = v; id.data[gi + 3] = 20;
      }
      g.putImageData(id, 0, 0);
    })();
    var TOWER_TIP = [.583, .034]; // the real tower tip in the cropped frame
    var t0 = Date.now(), previewMin = null; // minutes-of-day when time-traveling, null = live
    var notes = [], raven = null, shoot = null, lastNote = 0, lastRaven = 0, lastShoot = 0, flashT = 0, lastFlash = 0, eqZero = 0;
    function paintPhoto(alt, el, now) {
      // cover-fit the real photograph
      var iw = PHOTO.img.naturalWidth, ih = PHOTO.img.naturalHeight;
      var s = W / iw, dh = ih * s;
      x.clearRect(0, 0, W, H);
      // the plate pools: the sun decides whether we're touring the midday
      // frames or the dusk frames — no photograph pretends to be another hour
      var dayList = PLATES.filter(function (p) { return p.pool === "day" && p.ok; });
      var duskAll = PLATES.filter(function (p) { return p.pool === "dusk" && p.ok; });
      var duskList = alt < -8 ? duskAll.filter(function (p) { return p.nightOk; }) : duskAll;
      if (!duskList.length) duskList = duskAll;
      var dayMix = (!dayList.length || alt <= 4) ? 0 : (alt >= 12 ? 1 : (alt - 4) / 8);
      // the tour: linger on each view, then a long soft crossfade to the next
      function tour(list, off) {
        if (!list.length) return null;
        if (list.length === 1 || reduced || previewMin != null) return { a: list[0], b: null, mix: 0 };
        var cyc = el / 38 + off, idx = Math.floor(cyc) % list.length, frac = cyc - Math.floor(cyc);
        return { a: list[idx], b: list[(idx + 1) % list.length], mix: frac > .88 ? (frac - .88) / .12 : 0 };
      }
      var duskT = tour(duskList, 0), dayT = tour(dayList, .5);
      // parallax offsets: ease toward pointer/tilt; the camera never stops
      // breathing — a slow drift when idle, like someone standing at the glass
      if (!reduced && el - par.lastIn > 4) { par.tx = Math.sin(el * .09) * .55; par.ty = Math.cos(el * .06) * .22; }
      par.cx += (par.tx - par.cx) * .06; par.cy += (par.ty - par.cy) * .06;
      var mx2 = reduced ? 0 : par.cx, my2 = reduced ? 0 : par.cy;
      // filmic breath: the frame leans in and out over the better part of a minute
      var breathe = reduced ? 0 : .012 * (.5 + .5 * Math.sin(el * .045));
      function drawPlate(p, a) {
        if (!p || !p.ok || a <= 0) return;
        x.globalAlpha = a;
        var g = plateGeom(p);
        // each view gets its own slow wander across the frame
        var kb = reduced ? 0 : Math.sin(el * .026 + PLATES.indexOf(p) * 2.4) * W * .016;
        var sc2 = 1.05 + breathe, ox = W * (1 - sc2) / 2 + kb, oy = H * (1 - sc2) / 2;
        if (!reduced && !p.layers && p.img) cutLayers(p);
        p.lastUse = el;
        x.drawImage(p.img, ox + mx2 * 6, oy + g.y * sc2 + my2 * 3, W * sc2, g.h * sc2);
        if (!reduced && p.layers) {
          var Lr = p.layers;
          if (Lr.sky) x.drawImage(Lr.sky, 0, 0, Lr.lw, Lr.lh, ox, oy, W * sc2, H * sc2);
          x.drawImage(Lr.gnd, 0, 0, Lr.lw, Lr.lh, ox + mx2 * 14, oy + my2 * 7, W * sc2, H * sc2);
        }
        x.globalAlpha = 1;
      }
      if (duskT) { drawPlate(duskT.a, 1); drawPlate(duskT.b, duskT.mix); }
      if (dayT && dayMix > 0) { drawPlate(dayT.a, dayMix); drawPlate(dayT.b, dayMix * dayT.mix); }
      // the plate that owns the frame right now — masks, beacon, moon and
      // sway all follow it
      var dom = dayMix >= .5
        ? (dayT ? (dayT.mix >= .5 ? dayT.b : dayT.a) : null)
        : (duskT ? (duskT.mix >= .5 ? duskT.b : duskT.a) : null);
      if (!dom) dom = PLATES[0];
      // housekeeping: plates that left the tour drop their layer canvases
      PLATES.forEach(function (p) { if (p.layers && el - (p.lastUse || 0) > 30) p.layers = null; });
      // GRADE by the real sun: the dusk frame is lifted for day only as far
      // as the real midday plate hasn't already taken over
      if (alt > 8 && dayMix < 1) { // daylight lift — calibrated to the real midday frames (IMG_6128-31)
        var day = Math.min(1, (alt - 8) / 55) * (1 - dayMix);
        x.globalCompositeOperation = "screen";
        x.fillStyle = "rgba(140,170,205," + (day * .16) + ")"; x.fillRect(0, 0, W, H);
        x.fillStyle = "rgba(255,240,210," + (day * .08) + ")"; x.fillRect(0, 0, W, H);
        // re-deepen the lifted sky to Sedona's real saturated blue
        x.globalCompositeOperation = "multiply";
        var db = x.createLinearGradient(0, 0, 0, H * .55);
        db.addColorStop(0, "rgba(74,126,212," + (day * .38) + ")");
        db.addColorStop(1, "rgba(74,126,212,0)");
        x.fillStyle = db; x.fillRect(0, 0, W, H * .55);
        x.globalCompositeOperation = "source-over";
      } else if (alt < -4) { // true night sinks in — deep blue-charcoal like IMG_6099, never black
        var nt = Math.min(1, (-4 - alt) / 10);
        x.globalCompositeOperation = "multiply";
        x.fillStyle = "rgba(" + Math.round(swLerp(255, 44, nt)) + "," + Math.round(swLerp(255, 54, nt)) + "," + Math.round(swLerp(255, 96, nt)) + ",1)";
        x.fillRect(0, 0, W, H);
        x.globalCompositeOperation = "source-over";
      } else if (alt > -2 && alt < 8) { // golden hour, graded like IMG_6138: gold low, steel-lavender high
        var gA = 1 - dayMix;
        x.globalCompositeOperation = "overlay";
        var gh = x.createLinearGradient(0, 0, 0, H * .62);
        gh.addColorStop(0, "rgba(160,150,200," + (.16 * gA) + ")");
        gh.addColorStop(.62, "rgba(255,175,85," + (.26 * gA) + ")");
        gh.addColorStop(1, "rgba(255,175,85,0)");
        x.fillStyle = gh; x.fillRect(0, 0, W, H * .62);
        x.globalCompositeOperation = "source-over";
      }
      // filmic day grade — lifted blacks and warmth, so noon reads like a
      // record sleeve instead of a phone photo; the night keeps its own dark
      if (alt > 0) {
        var flm = Math.min(1, alt / 20);
        x.globalCompositeOperation = "screen";
        x.fillStyle = "rgba(18,14,26," + (.26 * flm) + ")"; x.fillRect(0, 0, W, H);
        x.globalCompositeOperation = "source-over";
      }
      // warm analog room tone + soft vignette — the record sounds like this
      x.globalCompositeOperation = "overlay";
      x.fillStyle = "rgba(255,182,110," + (alt > 0 ? .11 : .06) + ")"; x.fillRect(0, 0, W, H);
      x.globalCompositeOperation = "source-over";
      var vg = x.createRadialGradient(W / 2, H * .55, Math.min(W, H) * .45, W / 2, H * .55, Math.max(W, H) * .8);
      vg.addColorStop(0, "rgba(12,7,4,0)"); vg.addColorStop(1, "rgba(12,7,4,.2)");
      x.fillStyle = vg; x.fillRect(0, 0, W, H);
      // the cloud deck flattens the real sky, exactly as much as it's covered
      var deck = Math.max(0, Math.min(1, wx.cover / 100));
      if (deck > .45) {
        var g2 = x.createLinearGradient(0, 0, 0, H * .5);
        var washA = (deck - .45) * (alt < -4 ? .22 : .18);
        g2.addColorStop(0, "rgba(" + (alt < -4 ? "70,72,100" : "172,166,188") + "," + washA + ")");
        g2.addColorStop(1, "rgba(" + (alt < -4 ? "70,72,100" : "172,166,188") + ",0)");
        x.fillStyle = g2; x.fillRect(0, 0, W, H * .5);
      }
      // fog on the ground when the codes say fog
      if (wx.code === 45 || wx.code === 48) {
        var fg = x.createLinearGradient(0, H * .35, 0, H);
        fg.addColorStop(0, "rgba(210,214,220,0)"); fg.addColorStop(.6, "rgba(210,214,220,.4)"); fg.addColorStop(1, "rgba(210,214,220,.55)");
        x.fillStyle = fg; x.fillRect(0, 0, W, H);
      }
      // fire-season smoke haze when the air itself says so
      if (wx.aqi != null && wx.aqi >= 150) {
        var smA = Math.min(.14, (wx.aqi - 150) / 900 + .07);
        var smg = x.createLinearGradient(0, H * .3, 0, H * .62);
        smg.addColorStop(0, "rgba(214,150,92,0)");
        smg.addColorStop(1, "rgba(214,150,92," + smA + ")");
        x.fillStyle = smg; x.fillRect(0, 0, W, H * .62);
      }
      // EVERYTHING that lives in the sky — stars, the moon, the clouds —
      // is drawn on a scratch layer and clipped by the baked sky mask, so
      // it all passes truly BEHIND the tower, the trees and the dish
      var dprF = cv.width / W;
      fxx.setTransform(1, 0, 0, 1, 0, 0);
      fxx.globalCompositeOperation = "source-over";
      fxx.clearRect(0, 0, fx.width, fx.height);
      fxx.setTransform(dprF, 0, 0, dprF, 0, 0);
      var skyDrew = false;
      if (alt < -8) {
        skyDrew = true;
        var sa = Math.min(1, (-8 - alt) / 6) * (1 - deck * .92);
        stars.forEach(function (st2, i) {
          if (st2[1] > .5) return;
          var tw = reduced ? 1 : (.6 + .4 * Math.sin(el * 1.3 + i));
          fxx.globalAlpha = sa * tw * .85; fxx.fillStyle = "#fff";
          fxx.fillRect(st2[0] * W, st2[1] * H, st2[2] * .8, st2[2] * .8);
        });
        fxx.globalAlpha = 1;
        // true-phase moon in the open western sky of the frame (skipped on
        // the plate that already carries the real moon in the photograph)
        if (!dom.noMoon) {
          var mi = moonInfo(), f = Math.max(0, Math.min(1, mi.illum / 100));
          var waning = (mi.name || "").toLowerCase().indexOf("waning") !== -1;
          var mx = W * .27, my = H * .2, mr = Math.max(10, W * .026);
          fxx.globalAlpha = Math.max(.12, 1 - deck * .85); // the deck veils the moon too
          // the glare halo the camera really catches out there (IMG_6099)
          var halo = fxx.createRadialGradient(mx, my, mr * .6, mx, my, mr * 6.5);
          halo.addColorStop(0, "rgba(205,218,255," + (.24 * f + .06) + ")");
          halo.addColorStop(.4, "rgba(185,200,245," + (.09 * f + .02) + ")");
          halo.addColorStop(1, "rgba(185,200,245,0)");
          fxx.fillStyle = halo; fxx.beginPath(); fxx.arc(mx, my, mr * 6.5, 0, 7); fxx.fill();
          fxx.beginPath(); fxx.arc(mx, my, mr, 0, 7); fxx.fillStyle = "rgba(60,64,88,.85)"; fxx.fill();
          fxx.beginPath(); fxx.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2, waning); fxx.closePath(); fxx.fillStyle = "#f3ecd9"; fxx.fill();
          fxx.beginPath(); fxx.ellipse(mx, my, mr * Math.abs(1 - 2 * f), mr, 0, 0, 7);
          fxx.fillStyle = f >= .5 ? "#f3ecd9" : "rgba(60,64,88,.85)"; fxx.fill();
          fxx.globalAlpha = 1;
        }
        // shooting star, rare
        if (!reduced) {
          if (!shoot && el - lastShoot > 14 && Math.random() < .006) { shoot = { t: 0, x0: .1 + Math.random() * .4, y0: .05 + Math.random() * .12 }; }
          if (shoot) {
            shoot.t += .06;
            if (shoot.t >= 1) { shoot = null; lastShoot = el; }
            else {
              var sxp = (shoot.x0 + shoot.t * .16) * W, syp = (shoot.y0 + shoot.t * .07) * H;
              var grd2 = fxx.createLinearGradient(sxp - W * .06, syp - H * .025, sxp, syp);
              grd2.addColorStop(0, "rgba(255,255,255,0)"); grd2.addColorStop(1, "rgba(255,255,255," + (.9 - shoot.t * .8) + ")");
              fxx.strokeStyle = grd2; fxx.lineWidth = 1.6;
              fxx.beginPath(); fxx.moveTo(sxp - W * .06, syp - H * .025); fxx.lineTo(sxp, syp); fxx.stroke();
            }
          }
        }
      }
      // the sky as it really is: cloud forms drift through the real frame,
      // counted from live cover, pushed by the live wind, lit by the hour
      // (even "clear" Sedona carries a wisp or two — cover above 3% shows one)
      // clouds painted in the plate's own language: flat poster lozenges,
      // counted from the real cover, drifting on the real wind
      var nClouds = deck <= .03 ? 0 : Math.max(1, Math.min(5, Math.round(deck * 6)));
      if (nClouds > 0) {
        skyDrew = true;
        var cdrift = reduced ? 0 : el * (.0018 + wx.wind * .0005);
        var cCol = alt < -6 ? [58, 54, 86] : (alt < 8 ? [236, 198, 172] : [244, 240, 234]);
        var cA = alt < -6 ? .5 : .8;
        for (var ci = 0; ci < nClouds && ci < clouds.length; ci++) {
          var c2 = clouds[ci], cxp2 = ((c2.x + cdrift * (.6 + c2.s * .3)) % 1.3) - .15;
          var pcx = cxp2 * W, pcy = c2.y * .7 * H, cs2 = c2.s;
          fxx.fillStyle = "rgba(" + cCol.join(",") + "," + (cA * (0.7 + c2.s * .2)) + ")";
          fxx.beginPath();
          fxx.ellipse(pcx, pcy, W * .055 * cs2, H * .016 * cs2, 0, 0, 7);
          fxx.ellipse(pcx + W * .04 * cs2, pcy - H * .008 * cs2, W * .038 * cs2, H * .014 * cs2, 0, 0, 7);
          fxx.ellipse(pcx - W * .042 * cs2, pcy + H * .002 * cs2, W * .036 * cs2, H * .012 * cs2, 0, 0, 7);
          fxx.ellipse(pcx + W * .008 * cs2, pcy - H * .012 * cs2, W * .032 * cs2, H * .013 * cs2, 0, 0, 7);
          fxx.fill();
        }
      }
      // a raven crosses the yard now and then — they really do live out there
      if (!reduced && alt > -4) {
        if (!raven && el - lastRaven > 35 && Math.random() < .008) {
          raven = { t: 0, y0: .08 + Math.random() * .3, dir: Math.random() < .5 ? 1 : -1, sp: .0022 + Math.random() * .0015, ph: Math.random() * 7 };
        }
        if (raven) {
          raven.t += raven.sp;
          if (raven.t >= 1) { raven = null; lastRaven = el; }
          else {
            skyDrew = true;
            var rvx = (raven.dir > 0 ? raven.t : 1 - raven.t) * 1.2 * W - W * .1;
            var rvy = (raven.y0 + Math.sin(raven.t * 9 + raven.ph) * .012) * H;
            var rs = W * .011, flap = Math.sin(el * 7 + raven.ph);
            if (Math.sin(raven.t * 14 + raven.ph) > .2) flap *= .25; // gliding, mostly
            fxx.strokeStyle = alt < 2 ? "rgba(16,16,20,.8)" : "rgba(24,24,30,.85)";
            fxx.lineWidth = Math.max(1.2, rs * .16); fxx.lineCap = "round";
            fxx.beginPath();
            fxx.moveTo(rvx - rs, rvy - flap * rs * .5);
            fxx.quadraticCurveTo(rvx - rs * .4, rvy + rs * .18, rvx, rvy);
            fxx.quadraticCurveTo(rvx + rs * .4, rvy + rs * .18, rvx + rs, rvy - flap * rs * .5);
            fxx.stroke();
          }
        }
      }
      if (skyDrew) {
        if (dom.mok) {
          var gm = plateGeom(dom);
          fxx.globalCompositeOperation = "destination-in";
          fxx.drawImage(dom.mimg, 0, gm.y, W, gm.h);
          fxx.globalCompositeOperation = "source-over";
        }
        x.drawImage(fx, 0, 0, W, H);
      }
      // the beacon on the REAL tower tip, breathing after sundown — only on
      // the plate whose frame actually holds the tip
      if (alt < -2 && dom.beacon) {
        var pulse = reduced ? .8 : (.45 + .55 * Math.abs(Math.sin(el * 1.1)));
        var bx = dom.beacon[0] * W, by = dom.beacon[1] * H;
        x.beginPath(); x.arc(bx, by, Math.max(2.5, W * .0035), 0, 7);
        x.fillStyle = "rgba(255,60,40," + pulse + ")"; x.fill();
        x.beginPath(); x.arc(bx, by, Math.max(2.5, W * .0035) * 3.2, 0, 7);
        x.fillStyle = "rgba(255,60,40," + pulse * .16 + ")"; x.fill();
      }
      // weather on the glass — only the weather that's really happening
      var snowing = (wx.code >= 71 && wx.code <= 77) || wx.code === 85 || wx.code === 86;
      if (snowing) {
        x.fillStyle = "rgba(255,255,255,.85)";
        drops.forEach(function (d, i) {
          var dy = reduced ? d[1] : ((d[1] + el * .045 * (1 + (i % 3) * .3)) % 1);
          var dx2 = d[0] + (reduced ? 0 : Math.sin(el * .8 + i) * .008);
          x.globalAlpha = .5 + (i % 4) * .12;
          x.beginPath(); x.arc(dx2 * W, dy * H, 1 + (i % 3), 0, 7); x.fill();
        });
        x.globalAlpha = 1;
      } else if (wx.code >= 51) {
        var slant = Math.min(14, 2 + wx.wind * .5); // the wind leans the rain
        x.strokeStyle = "rgba(190,210,235,.4)"; x.lineWidth = 1;
        drops.forEach(function (d) {
          var dy = reduced ? d[1] : ((d[1] + el * .5) % 1);
          x.beginPath(); x.moveTo(d[0] * W, dy * H * .9); x.lineTo(d[0] * W - slant, dy * H * .9 + 10); x.stroke();
        });
      }
      // slices of the photograph itself, nudged sideways — how a still
      // picture breathes: heat shimmer over the dirt, wind in the leaves
      var dpr2 = cv.width / W;
      function sway(rx, ry, rw, rh, off) {
        x.drawImage(cv, rx * dpr2, ry * dpr2, rw * dpr2, rh * dpr2, rx + off, ry, rw, rh);
      }
      if (wx.temp != null && wx.temp >= 90 && alt > 8 && !reduced) {
        var heatA = Math.min(1, (wx.temp - 88) / 14);
        for (var hs = 0; hs < 4; hs++) {
          var band = H * (.62 + hs * .04);
          sway(0, band, W, H * .012, Math.sin(el * 2.2 + hs * 1.7) * (1.2 + hs * .4) * heatA);
        }
      }
      // the real wind moves the real trees — amplitude straight from the mph,
      // but the air out there is never truly dead, so neither are the pines
      if (!reduced) {
        var amp = (.5 + Math.min(4.5, wx.wind * .13)) * (1 + .45 * Math.sin(el * .7) + .2 * Math.sin(el * 2.3));
        if (dom.src === "paint-day.jpg") {
          // midday plate: the big pine on the left edge
          for (var fd = 0; fd < 6; fd++) {
            var fdy = H * (.4 + fd * .034);
            sway(0, fdy, W * .2, H * .032, Math.sin(el * 1.5 + fd * 1.1) * amp * .9);
          }
          // the treeline behind the fence, full width
          for (var fd2 = 0; fd2 < 3; fd2++) {
            var fdy2 = H * (.5 + fd2 * .028);
            sway(W * .18, fdy2, W * .82, H * .026, Math.sin(el * 1.3 + fd2 + 3) * amp * .5);
          }
        } else if (dom.src === "paint-dusk.jpg") {
          // the pines over the dish (right), above the dish rim
          for (var fs = 0; fs < 7; fs++) {
            var fy = H * (.02 + fs * .028);
            sway(W * .62, fy, W * .38, H * .026, Math.sin(el * 1.6 + fs * .9) * amp);
          }
          // the lone pine and west treeline
          for (var fs2 = 0; fs2 < 5; fs2++) {
            var fy2 = H * (.37 + fs2 * .032);
            sway(0, fy2, W * .34, H * .03, Math.sin(el * 1.4 + fs2 * 1.2 + 2) * amp * .8);
          }
          // the far treeline, a whisper
          for (var fs3 = 0; fs3 < 3; fs3++) {
            var fy3 = H * (.46 + fs3 * .026);
            sway(W * .3, fy3, W * .3, H * .024, Math.sin(el * 1.2 + fs3 + 4) * amp * .4);
          }
        } else {
          // every other view: the treeline band above its own horizon
          for (var fg2 = 0; fg2 < 5; fg2++) {
            var fgy = H * (dom.hz - .17 + fg2 * .032);
            sway(0, fgy, W, H * .03, Math.sin(el * 1.4 + fg2 * 1.1) * amp * .65);
          }
        }
      }
      // real thunderstorm on the codes -> lightning cracks the frame
      if (wx.code >= 95 && !reduced) {
        if (!flashT && el - lastFlash > 9 && Math.random() < .012) { flashT = el; }
        if (flashT) {
          var ft = el - flashT;
          if (ft > .45) { flashT = 0; lastFlash = el; }
          else { x.fillStyle = "rgba(240,244,255," + (.55 * Math.max(0, 1 - ft / .45) * (ft < .08 || (ft > .15 && ft < .22) ? 1 : .3)) + ")"; x.fillRect(0, 0, W, H); }
        }
      }
      // clinging drops on the glass — each one refracts the real scene,
      // upside-down, the way water actually bends light
      var raining = wx.code >= 51 && !snowing;
      if (raining && !reduced) {
        if (el - miniAt > 1.5) { // refresh the refraction miniature from the live frame
          miniAt = el;
          miniX.setTransform(1, 0, 0, 1, 0, 0);
          miniX.clearRect(0, 0, miniC.width, miniC.height);
          miniX.save(); miniX.translate(0, miniC.height); miniX.scale(1, -1);
          miniX.drawImage(cv, 0, 0, miniC.width, miniC.height);
          miniX.restore();
        }
        if (gdrops.length < 16 && Math.random() < .09) {
          gdrops.push({ x: Math.random(), y: Math.random() * .8, r: 7 + Math.random() * 13, v: 0, born: el });
        }
        gdrops = gdrops.filter(function (d) { return d.y < 1.05 && d.r > 1.6; });
        cv._gd = gdrops.length;
        var sc3 = miniC.width / cv.width;
        gdrops.forEach(function (d, i) {
          if (d.r > 12) { d.v = Math.min(.0035, d.v + .00003 * d.r); d.y += d.v; d.x += Math.sin(el * 2 + i) * .0003; }
          else d.r -= .0022; // little ones dry up
          var dxp = d.x * W, dyp = d.y * H, dr = d.r;
          var ry2 = dr * (d.r > 12 ? 1.25 : 1.08); // sliders stretch as they run
          x.save();
          x.beginPath(); x.ellipse(dxp, dyp, dr * .9, ry2, 0, 0, 7); x.clip();
          // the refracted world in the drop: the whole flipped scene, minified
          var sw3 = dr * 14 * sc3 * (cv.width / W);
          x.drawImage(miniC, d.x * miniC.width - sw3 / 2, (1 - d.y) * miniC.height - sw3 / 2, sw3, sw3, dxp - dr, dyp - ry2, dr * 2, ry2 * 2);
          // lensing: a shade darker toward the rim, wet all through
          var lg = x.createRadialGradient(dxp, dyp, dr * .35, dxp, dyp, ry2);
          lg.addColorStop(0, "rgba(255,255,255,.04)");
          lg.addColorStop(.8, "rgba(20,30,50,.08)");
          lg.addColorStop(1, "rgba(10,18,34,.22)");
          x.fillStyle = lg; x.fillRect(dxp - dr, dyp - ry2, dr * 2, ry2 * 2);
          x.restore();
          x.strokeStyle = "rgba(255,255,255,.22)"; x.lineWidth = .9;
          x.beginPath(); x.ellipse(dxp, dyp, dr * .9 - .5, ry2 - .5, 0, -2.5, -.7); x.stroke();
          x.strokeStyle = "rgba(20,30,50,.22)"; x.lineWidth = .9;
          x.beginPath(); x.ellipse(dxp, dyp, dr * .9, ry2, 0, .5, 2.5); x.stroke();
          // the faint gleam every real drop wears
          x.fillStyle = "rgba(255,255,255,.4)";
          x.beginPath(); x.arc(dxp - dr * .3, dyp - ry2 * .42, Math.max(.8, dr * .1), 0, 7); x.fill();
        });
      } else if (gdrops.length) gdrops = [];
      // condensation on the cold glass — when the real air is at the dew
      // point, the window fogs, and you can wipe it with a finger
      var fogTarget = 0;
      if (wx.code === 45 || wx.code === 48) fogTarget = .8;
      else if (wx.temp != null && wx.dew != null && wx.temp - wx.dew <= 4) fogTarget = .55 * (1 - Math.max(0, wx.temp - wx.dew) / 4);
      fogA += (fogTarget - fogA) * .01;
      if (fogA > .04) {
        if (!fogSeeded) seedFog();
        else if (!reduced && Math.random() < .25) { // the glass slowly fogs back over
          fogX.setTransform(1, 0, 0, 1, 0, 0);
          fogX.globalCompositeOperation = "source-over";
          fogX.globalAlpha = .01;
          fogX.fillStyle = "rgba(216,224,232,.9)"; fogX.fillRect(0, 0, fogC.width, fogC.height);
          fogX.globalAlpha = 1;
        }
        x.globalAlpha = Math.min(.85, fogA);
        x.drawImage(fogC, 0, 0, W, H);
        x.globalAlpha = 1;
      }
      // a breath of film grain, drifting — analog, never digital-still
      if (!reduced) {
        if (!grainP) grainP = x.createPattern(grainC, "repeat");
        x.save();
        x.globalAlpha = .5;
        x.translate(-((el * 91) % 160), -((el * 53) % 160));
        x.fillStyle = grainP; x.fillRect(0, 0, W + 160, H + 160);
        x.restore();
      }
      // notes from the doorway while the stream truly plays
      var isOn = typeof playing !== "undefined" && playing;
      if (isOn && !reduced) {
        if (el - lastNote > 1.4) { lastNote = el; notes.push({ t: 0, dx: Math.random() * .02 - .01, g: Math.random() < .5 ? "♪" : "♫" }); }
        notes = notes.filter(function (n) { return n.t < 1; });
        notes.forEach(function (n) {
          n.t += .004;
          x.globalAlpha = 1 - n.t;
          x.font = Math.round(Math.max(12, W * .015)) + "px serif";
          x.fillStyle = "#ffe9a8"; x.textAlign = "center";
          x.fillText(n.g, (.06 + n.dx + Math.sin(n.t * 8) * .008) * W, H * .9 - n.t * H * .35);
        });
        x.globalAlpha = 1;
      }
      // the EQ rolls — the REAL spectrum of the live stream, painted amber
      var eqOn = typeof analyser !== "undefined" && analyser && typeof playing !== "undefined" && playing && typeof freqData !== "undefined" && freqData;
      if (eqOn && !reduced) {
        try { analyser.getByteFrequencyData(freqData); } catch (e) { eqOn = false; }
      }
      if (eqOn && !reduced && eqZero < 300) {
        var bars = 24, bw2 = Math.max(4, W * .011), gap2 = bw2 * .55;
        var totW = bars * bw2 + (bars - 1) * gap2, ex0 = W / 2 - totW / 2;
        var ey0 = H - Math.max(30, H * .062) - 6;
        var sum2 = 0;
        for (var eb = 0; eb < bars; eb++) {
          var bin = 2 + Math.floor(eb * (freqData.length - 4) / bars);
          var v2 = freqData[bin] / 255; sum2 += v2;
          var bh2 = Math.max(2, v2 * H * .075);
          x.fillStyle = "rgba(255,205,138," + (.3 + v2 * .6) + ")";
          if (x.roundRect) { x.beginPath(); x.roundRect(ex0 + eb * (bw2 + gap2), ey0 - bh2, bw2, bh2, 2); x.fill(); }
          else x.fillRect(ex0 + eb * (bw2 + gap2), ey0 - bh2, bw2, bh2);
        }
        // CORS-tainted or dead-silent stream: hide rather than fake
        if (sum2 < .01) eqZero++; else eqZero = 0;
      }
      // brass plate with the actual song on air
      if (typeof lastNow !== "undefined" && lastNow && lastNow.title && lastNow.title !== "Mellow Mountain Radio") {
        var plate = "♪  " + lastNow.title + " — " + lastNow.artist;
        var lcEl = doc.querySelector("[data-listeners]");
        var lcm = lcEl && lcEl.textContent ? lcEl.textContent.match(/\d+/) : null;
        if (lcm && +lcm[0] > 0) plate += "  ·  " + lcm[0] + " listening with you";
        x.font = "700 " + Math.round(Math.max(11, W * .014)) + "px Lato, sans-serif";
        var pw = Math.min(W * .8, x.measureText(plate).width + 26);
        var px0 = W * .5 - pw / 2, py0 = H - Math.max(26, H * .06);
        x.fillStyle = "rgba(20,14,10,.78)";
        x.beginPath(); if (x.roundRect) x.roundRect(px0, py0, pw, Math.max(22, H * .042), 6); else x.rect(px0, py0, pw, Math.max(22, H * .042)); x.fill();
        x.strokeStyle = "rgba(255,216,138,.5)"; x.lineWidth = 1; x.stroke();
        x.fillStyle = "#ffe9a8"; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText(plate, W * .5, py0 + Math.max(11, H * .021), pw - 16);
        x.textBaseline = "alphabetic";
      }
      // thin window frame, no mullions over the photograph
      x.strokeStyle = "rgba(20,14,10,.85)"; x.lineWidth = Math.max(6, W * .008);
      x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, W - x.lineWidth, H - x.lineWidth);
      if (cap) {
        var ph2;
        if (previewMin != null) {
          var hh2 = Math.floor(previewMin / 60), mm2 = previewMin % 60;
          ph2 = "PREVIEWING " + ((hh2 % 12) || 12) + ":" + (mm2 < 10 ? "0" : "") + mm2 + (hh2 < 12 ? " AM" : " PM");
        } else ph2 = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" }) + " in Sedona";
        var mood = [];
        if (wx.code === 45 || wx.code === 48) mood.push("fog");
        if ((wx.code >= 71 && wx.code <= 77) || wx.code === 85 || wx.code === 86) mood.push("snowing");
        else if (wx.code >= 95) mood.push("thunderstorm");
        else if (wx.code >= 51) mood.push("raining");
        if (wx.aqi != null && wx.aqi >= 150) mood.push("smoke, AQI " + wx.aqi);
        cap.textContent = ph2 + " · sun " + (alt >= 0 ? Math.round(alt) + "° up" : Math.round(-alt) + "° below the horizon") +
          " · " + wx.cover + "% cloud" + (mood.length ? " · " + mood.join(" · ") : "") +
          (wx.temp != null ? " · " + wx.temp + "°" : "") + (wx.wind >= 15 ? " · wind " + Math.round(wx.wind) + " mph" : "") +
          (fogA > .2 ? " — the glass has fogged up; wipe it with your finger" :
          (previewMin != null ? " — time travel on the real photo; tap LIVE to come home" :
            " — " + (dom && dom.name ? dom.name : "the back door") + " · matched to the real sky, exactly"));
      }
    }
    // ── THE LOUNGE ──────────────────────────────────────────────────────
    // The chillhop treatment: a hand-drawn warm room, a big window on a
    // stylized Sedona, and the real world still runs it — the real sun
    // grades the sky, the real weather rains on the glass, the real song
    // scrolls on the radio dial, the beacon really blinks after dark.
    function lofiPal(alt) {
      var NIGHT = { top: [11, 15, 36], hor: [44, 32, 66], b3: [30, 22, 48], b2: [40, 27, 55], b1: [52, 32, 60], gnd: [24, 16, 30], cl: [58, 52, 88] };
      var DUSK = { top: [62, 40, 96], hor: [232, 138, 82], b3: [102, 48, 70], b2: [130, 58, 72], b1: [164, 74, 74], gnd: [58, 30, 40], cl: [214, 130, 110] };
      var GOLD = { top: [110, 82, 136], hor: [248, 178, 98], b3: [134, 62, 68], b2: [172, 80, 68], b1: [206, 102, 72], gnd: [76, 40, 42], cl: [246, 182, 140] };
      var DAY = { top: [126, 160, 200], hor: [240, 216, 180], b3: [146, 88, 78], b2: [182, 108, 84], b1: [214, 132, 90], gnd: [94, 56, 46], cl: [250, 246, 238] };
      function mixPal(A, B, t) { var o = {}; for (var k in A) o[k] = swMix(A[k], B[k], t); return o; }
      if (alt <= -8) return NIGHT;
      if (alt <= -2) return mixPal(NIGHT, DUSK, (alt + 8) / 6);
      if (alt <= 6) return mixPal(DUSK, GOLD, (alt + 2) / 8);
      if (alt <= 20) return mixPal(GOLD, DAY, (alt - 6) / 14);
      return DAY;
    }
    function smoothPath(c, pts, px, py, pw, ph) {
      c.beginPath();
      c.moveTo(px + pts[0][0] * pw, py + pts[0][1] * ph);
      for (var i = 1; i < pts.length - 1; i++) {
        var xm = px + (pts[i][0] + pts[i + 1][0]) / 2 * pw, ym = py + (pts[i][1] + pts[i + 1][1]) / 2 * ph;
        c.quadraticCurveTo(px + pts[i][0] * pw, py + pts[i][1] * ph, xm, ym);
      }
      var L = pts[pts.length - 1];
      c.lineTo(px + L[0] * pw, py + L[1] * ph);
    }
    var BUT_FAR = [[0, .60], [.07, .52], [.15, .52], [.2, .58], [.33, .56], [.4, .49], [.47, .49], [.52, .56], [.66, .54], [.74, .58], [.86, .55], [1, .59], [1.05, 1.2], [-.05, 1.2]];
    var BUT_MID = [[0, .74], [.06, .70], [.12, .55], [.145, .42], [.165, .42], [.18, .52], [.2, .50], [.215, .56], [.26, .64], [.36, .68], [.46, .66], [.54, .52], [.565, .44], [.585, .44], [.6, .5], [.63, .48], [.66, .58], [.75, .66], [.88, .63], [1, .70], [1.05, 1.2], [-.05, 1.2]];
    var BUT_NEAR = [[.52, 1.2], [.58, .84], [.66, .70], [.71, .62], [.74, .60], [.82, .60], [.86, .64], [.92, .76], [.98, .88], [1.05, 1.2]];
    function paintLofi(alt, el, now) {
      var night = Math.max(0, Math.min(1, (-alt - 2) / 8));
      var P0 = lofiPal(alt), P = {}; for (var pk in P0) P[pk] = P0[pk];
      // heavy real cloud cover mutes the whole land, not just the sky
      var deckG = Math.max(0, Math.min(1, wx.cover / 100));
      if (deckG > 0) {
        var gcol = night > .5 ? [30, 32, 44] : [116, 112, 114];
        ["b1", "b2", "b3", "gnd"].forEach(function (k) { P[k] = swMix(P[k], gcol, deckG * .38); });
      }
      x.clearRect(0, 0, W, H);
      // room wall behind everything
      x.fillStyle = "rgb(30,19,13)"; x.fillRect(0, 0, W, H);
      var fr = Math.max(8, W * .018);
      var px = fr * 1.6, py = fr * 1.6, pw = W - fr * 3.2, sillY = H * .76, ph = sillY - py;
      // ── the world through the pane ──
      x.save();
      x.beginPath(); x.rect(px, py, pw, ph); x.clip();
      // the real cloud deck greys the sky before anything else does
      var deck0 = Math.max(0, Math.min(1, wx.cover / 100));
      var greyT = night > .5 ? [38, 42, 56] : [104, 110, 122], greyH = night > .5 ? [46, 48, 62] : [146, 148, 156];
      var topC = swMix(P.top, greyT, deck0 * .75), horC = swMix(P.hor, greyH, deck0 * .65);
      var sky = x.createLinearGradient(0, py, 0, py + ph);
      sky.addColorStop(0, "rgb(" + topC.map(Math.round).join(",") + ")");
      sky.addColorStop(.72, "rgb(" + horC.map(Math.round).join(",") + ")");
      sky.addColorStop(1, "rgb(" + horC.map(Math.round).join(",") + ")");
      x.fillStyle = sky; x.fillRect(px, py, pw, ph);
      // golden glow low in the west while the sun crosses the horizon band
      if (alt > -6 && alt < 14) {
        var gA2 = 1 - Math.abs(alt - 2) / (alt < 2 ? 8 : 12);
        if (gA2 > 0) {
          var gg2 = x.createRadialGradient(px + pw * .72, py + ph * .62, 0, px + pw * .72, py + ph * .62, pw * .5);
          gg2.addColorStop(0, "rgba(255,196,110," + (.5 * gA2) + ")");
          gg2.addColorStop(1, "rgba(255,196,110,0)");
          x.fillStyle = gg2; x.fillRect(px, py, pw, ph);
        }
      }
      // stars & the true-phase moon after dark — the real deck veils both
      var deck = Math.max(0, Math.min(1, wx.cover / 100));
      if (night > 0) {
        var sa2 = night * (1 - deck * .9);
        stars.forEach(function (st, i) {
          if (st[1] > .5) return;
          var tw2 = reduced ? 1 : (.55 + .45 * Math.sin(el * 1.2 + i));
          x.globalAlpha = sa2 * tw2 * .9;
          x.fillStyle = "#ffeedd";
          x.fillRect(px + st[0] * pw, py + st[1] * ph, st[2] * .8, st[2] * .8);
        });
        x.globalAlpha = 1;
        var mi2 = moonInfo(), mf = Math.max(0, Math.min(1, mi2.illum / 100));
        var wan = (mi2.name || "").toLowerCase().indexOf("waning") !== -1;
        var mx2b = px + pw * .18, my2b = py + ph * .2, mr2 = Math.max(9, pw * .022);
        x.globalAlpha = night * Math.max(.15, 1 - deck * .85);
        var mh = x.createRadialGradient(mx2b, my2b, mr2 * .5, mx2b, my2b, mr2 * 6);
        mh.addColorStop(0, "rgba(255,236,200," + (.22 * mf + .05) + ")");
        mh.addColorStop(1, "rgba(255,236,200,0)");
        x.fillStyle = mh; x.beginPath(); x.arc(mx2b, my2b, mr2 * 6, 0, 7); x.fill();
        x.beginPath(); x.arc(mx2b, my2b, mr2, 0, 7); x.fillStyle = "rgba(70,60,96,.9)"; x.fill();
        x.beginPath(); x.arc(mx2b, my2b, mr2, -Math.PI / 2, Math.PI / 2, wan); x.closePath(); x.fillStyle = "#f6ecd2"; x.fill();
        x.beginPath(); x.ellipse(mx2b, my2b, mr2 * Math.abs(1 - 2 * mf), mr2, 0, 0, 7);
        x.fillStyle = mf >= .5 ? "#f6ecd2" : "rgba(70,60,96,.9)"; x.fill();
        x.globalAlpha = 1;
        // shooting star, rare
        if (!reduced) {
          if (!shoot && el - lastShoot > 16 && Math.random() < .005) shoot = { t: 0, x0: .15 + Math.random() * .5, y0: .06 + Math.random() * .15 };
          if (shoot) {
            shoot.t += .05;
            if (shoot.t >= 1) { shoot = null; lastShoot = el; }
            else {
              var ssx = px + (shoot.x0 + shoot.t * .14) * pw, ssy = py + (shoot.y0 + shoot.t * .06) * ph;
              var sg2 = x.createLinearGradient(ssx - pw * .05, ssy - ph * .02, ssx, ssy);
              sg2.addColorStop(0, "rgba(255,244,220,0)"); sg2.addColorStop(1, "rgba(255,244,220," + (.85 * (1 - shoot.t) * night) + ")");
              x.strokeStyle = sg2; x.lineWidth = 1.4;
              x.beginPath(); x.moveTo(ssx - pw * .05, ssy - ph * .02); x.lineTo(ssx, ssy); x.stroke();
            }
          }
        }
      }
      // lofi clouds: soft flat lozenges, count from the real cover,
      // drifting on the real wind
      var nCl = deck <= .03 ? 0 : Math.max(1, Math.round(deck * 7));
      var clC = swMix(P.cl, night > .5 ? [34, 38, 56] : [172, 174, 184], deck * .6);
      var clCol = "rgba(" + clC.map(Math.round).join(",") + ",";
      var clA = (night > .5 ? .4 : .55 + deck * .25);
      for (var ci2 = 0; ci2 < nCl && ci2 < clouds.length; ci2++) {
        var cD = clouds[ci2];
        var cxx = px + ((cD.x + (reduced ? 0 : el * (.0016 + wx.wind * .0004) * (.5 + cD.s * .4))) % 1.25 - .12) * pw;
        var cyy = py + cD.y * .58 * ph, cs = cD.s;
        x.fillStyle = clCol + clA + ")";
        x.beginPath();
        x.ellipse(cxx, cyy, pw * .052 * cs, ph * .03 * cs, 0, 0, 7);
        x.ellipse(cxx + pw * .038 * cs, cyy - ph * .014 * cs, pw * .036 * cs, ph * .026 * cs, 0, 0, 7);
        x.ellipse(cxx - pw * .04 * cs, cyy + ph * .002 * cs, pw * .034 * cs, ph * .022 * cs, 0, 0, 7);
        x.ellipse(cxx + pw * .01 * cs, cyy - ph * .02 * cs, pw * .03 * cs, ph * .024 * cs, 0, 0, 7);
        x.fill();
      }
      // the buttes, three depths, each with a rim of horizon light
      function butte(pts, col, rim) {
        smoothPath(x, pts, px, py, pw, ph);
        x.closePath();
        var bg = x.createLinearGradient(0, py + ph * .38, 0, py + ph);
        bg.addColorStop(0, "rgb(" + col.map(function (v) { return Math.round(Math.min(255, v * 1.18)); }).join(",") + ")");
        bg.addColorStop(1, "rgb(" + col.map(Math.round).join(",") + ")");
        x.fillStyle = bg; x.fill();
        if (rim) {
          x.strokeStyle = "rgba(" + P.hor.map(Math.round).join(",") + "," + rim + ")";
          x.lineWidth = 1.4; x.stroke();
        }
      }
      butte(BUT_FAR, P.b3, .18);
      butte(BUT_MID, P.b2, .28);
      // the ridge that carries the KAZM tower
      var ridgeY = py + ph * .78;
      x.fillStyle = "rgb(" + P.gnd.map(function (v) { return Math.round(v * 1.25); }).join(",") + ")";
      x.beginPath();
      x.moveTo(px, ridgeY + ph * .06);
      x.quadraticCurveTo(px + pw * .2, ridgeY - ph * .05, px + pw * .42, ridgeY + ph * .02);
      x.quadraticCurveTo(px + pw * .6, ridgeY + ph * .07, px + pw, ridgeY + ph * .05);
      x.lineTo(px + pw, py + ph); x.lineTo(px, py + ph); x.closePath(); x.fill();
      // the tower — thin mast, guys, and the beacon that truly blinks at night
      var twx = px + pw * .3, twTop = ridgeY - ph * .34, twBase = ridgeY - ph * .01;
      x.strokeStyle = "rgba(20,12,18,.9)"; x.lineWidth = Math.max(1.5, pw * .0028);
      x.beginPath(); x.moveTo(twx, twBase); x.lineTo(twx, twTop); x.stroke();
      x.lineWidth = Math.max(.7, pw * .001);
      x.beginPath();
      x.moveTo(twx, twTop + (twBase - twTop) * .15); x.lineTo(twx - pw * .06, twBase);
      x.moveTo(twx, twTop + (twBase - twTop) * .15); x.lineTo(twx + pw * .06, twBase);
      x.moveTo(twx, twTop + (twBase - twTop) * .55); x.lineTo(twx - pw * .045, twBase);
      x.moveTo(twx, twTop + (twBase - twTop) * .55); x.lineTo(twx + pw * .045, twBase);
      x.stroke();
      if (alt < 0) {
        var bk = reduced ? .8 : (.35 + .65 * Math.abs(Math.sin(el * 1.05)));
        x.fillStyle = "rgba(255,64,44," + bk + ")";
        x.beginPath(); x.arc(twx, twTop, Math.max(2, pw * .004), 0, 7); x.fill();
        x.fillStyle = "rgba(255,64,44," + bk * .18 + ")";
        x.beginPath(); x.arc(twx, twTop, Math.max(2, pw * .004) * 3, 0, 7); x.fill();
      }
      butte(BUT_NEAR, P.b1, .22);
      // the yard in front
      x.fillStyle = "rgb(" + P.gnd.map(Math.round).join(",") + ")";
      x.beginPath();
      x.moveTo(px, py + ph * .9);
      x.quadraticCurveTo(px + pw * .3, py + ph * .84, px + pw * .62, py + ph * .9);
      x.quadraticCurveTo(px + pw * .82, py + ph * .94, px + pw, py + ph * .9);
      x.lineTo(px + pw, py + ph); x.lineTo(px, py + ph); x.closePath(); x.fill();
      // weather in the world: rain, snow, lightning, fog band — all real
      var snowing2 = (wx.code >= 71 && wx.code <= 77) || wx.code === 85 || wx.code === 86;
      if (snowing2) {
        x.fillStyle = "rgba(255,255,255,.85)";
        drops.forEach(function (d, i) {
          var dy2 = reduced ? d[1] : ((d[1] + el * .04 * (1 + (i % 3) * .3)) % 1);
          x.globalAlpha = .4 + (i % 4) * .12;
          x.beginPath(); x.arc(px + (d[0] + Math.sin(el * .7 + i) * .008) * pw, py + dy2 * ph, 1 + (i % 3) * .8, 0, 7); x.fill();
        });
        x.globalAlpha = 1;
      } else if (wx.code >= 51) {
        var sl2 = Math.min(12, 2 + wx.wind * .4);
        x.strokeStyle = "rgba(200,214,240,.35)"; x.lineWidth = 1;
        drops.forEach(function (d) {
          var dy3 = reduced ? d[1] : ((d[1] + el * .5) % 1);
          x.beginPath(); x.moveTo(px + d[0] * pw, py + dy3 * ph * .92); x.lineTo(px + d[0] * pw - sl2, py + dy3 * ph * .92 + 9); x.stroke();
        });
      }
      if (wx.code === 45 || wx.code === 48) {
        var fgb = x.createLinearGradient(0, py + ph * .5, 0, py + ph);
        fgb.addColorStop(0, "rgba(210,208,220,0)"); fgb.addColorStop(1, "rgba(210,208,220,.5)");
        x.fillStyle = fgb; x.fillRect(px, py, pw, ph);
      }
      if (wx.code >= 95 && !reduced) {
        if (!flashT && el - lastFlash > 8 && Math.random() < .014) flashT = el;
        if (flashT) {
          var ft2 = el - flashT;
          if (ft2 > .4) { flashT = 0; lastFlash = el; }
          else { x.fillStyle = "rgba(240,244,255," + (.5 * Math.max(0, 1 - ft2 / .4) * (ft2 < .07 || (ft2 > .14 && ft2 < .2) ? 1 : .3)) + ")"; x.fillRect(px, py, pw, ph); }
        }
      }
      x.restore();
      // ── the room ──
      // window frame
      x.strokeStyle = "rgb(46,28,17)"; x.lineWidth = fr;
      x.strokeRect(px - fr / 2, py - fr / 2, pw + fr, ph + fr);
      x.strokeStyle = "rgba(70,44,26,.9)"; x.lineWidth = Math.max(2, fr * .18);
      x.strokeRect(px + 1, py + 1, pw - 2, ph - 2);
      // sill board and wall below
      x.fillStyle = "rgb(38,23,14)"; x.fillRect(0, sillY, W, H - sillY);
      x.fillStyle = "rgb(52,32,19)"; x.fillRect(0, sillY, W, Math.max(5, H * .016));
      // rug
      x.fillStyle = "rgba(94,42,34,.55)";
      x.beginPath(); x.ellipse(W * .34, H * .95, W * .2, H * .05, 0, 0, 7); x.fill();
      // the dog, asleep and breathing — she really does the rounds out there
      var br = 1 + (reduced ? 0 : Math.sin(el * .8) * .025);
      x.fillStyle = "rgb(24,13,8)";
      x.save(); x.translate(W * .33, H * .93); x.scale(1, br);
      x.beginPath(); x.ellipse(0, 0, W * .085, H * .038, 0, 0, 7); x.fill();          // body
      x.beginPath(); x.arc(-W * .075, -H * .012, W * .032, 0, 7); x.fill();          // head tucked
      x.beginPath(); x.moveTo(-W * .095, -H * .036); x.lineTo(-W * .075, -H * .052); x.lineTo(-W * .062, -H * .03); x.closePath(); x.fill(); // ear
      x.beginPath(); x.ellipse(W * .07, H * .012, W * .045, H * .012, -.5, 0, 7); x.fill(); // tail curled
      x.restore();
      // plant on the left of the sill, fronds on the real breeze
      var potX = W * .09, potY = sillY;
      x.fillStyle = "rgb(112,52,38)";
      x.beginPath(); x.moveTo(potX - W * .028, potY - H * .001); x.lineTo(potX + W * .028, potY - H * .001); x.lineTo(potX + W * .02, potY - H * .052); x.lineTo(potX - W * .02, potY - H * .052); x.closePath(); x.fill();
      var swy = reduced ? 0 : (.4 + Math.min(1.6, wx.wind * .08));
      x.strokeStyle = "rgb(52,84,62)"; x.lineCap = "round";
      for (var fr2 = 0; fr2 < 6; fr2++) {
        var fa = -1.35 + fr2 * .5, fl = H * (.1 + (fr2 % 3) * .02);
        var tipx = potX + Math.sin(fa) * fl + (reduced ? 0 : Math.sin(el * 1.1 + fr2) * swy * 3);
        var tipy = potY - H * .05 - Math.abs(Math.cos(fa)) * fl;
        x.lineWidth = Math.max(2, W * .004);
        x.beginPath(); x.moveTo(potX, potY - H * .05);
        x.quadraticCurveTo(potX + Math.sin(fa) * fl * .4, potY - H * .05 - Math.abs(Math.cos(fa)) * fl * .7, tipx, tipy);
        x.stroke();
      }
      // the mug, steaming
      var mgX = W * .56, mgY = sillY - H * .002;
      x.fillStyle = "rgb(168,74,52)";
      if (x.roundRect) { x.beginPath(); x.roundRect(mgX - W * .017, mgY - H * .045, W * .034, H * .045, 3); x.fill(); }
      else x.fillRect(mgX - W * .017, mgY - H * .045, W * .034, H * .045);
      x.strokeStyle = "rgb(168,74,52)"; x.lineWidth = Math.max(2, W * .0035);
      x.beginPath(); x.arc(mgX + W * .022, mgY - H * .024, W * .011, -1.3, 1.3); x.stroke();
      if (!reduced) {
        x.strokeStyle = "rgba(255,244,230,.26)"; x.lineWidth = Math.max(1.5, W * .0022);
        for (var st2 = 0; st2 < 2; st2++) {
          var sbx = mgX - W * .006 + st2 * W * .011, sph = el * .9 + st2 * 2.1;
          x.beginPath();
          x.moveTo(sbx, mgY - H * .048);
          x.bezierCurveTo(
            sbx + Math.sin(sph) * 3, mgY - H * .065,
            sbx + Math.sin(sph + 1.1) * 4, mgY - H * .082,
            sbx + Math.sin(sph + 2.1) * 3, mgY - H * .102);
          x.stroke();
        }
      }
      // the radio — dial glowing, the actual song on air scrolling across it
      var rdX = W * .68, rdW = W * .24, rdY = sillY - H * .085, rdH = H * .082;
      var dialGlow = x.createRadialGradient(rdX + rdW / 2, rdY + rdH / 2, 0, rdX + rdW / 2, rdY + rdH / 2, rdW * .9);
      dialGlow.addColorStop(0, "rgba(255,190,110," + (.14 + night * .22) + ")");
      dialGlow.addColorStop(1, "rgba(255,190,110,0)");
      x.fillStyle = dialGlow; x.fillRect(rdX - rdW * .5, rdY - rdH * 1.6, rdW * 2, rdH * 3.4);
      x.fillStyle = "rgb(58,36,24)";
      if (x.roundRect) { x.beginPath(); x.roundRect(rdX, rdY, rdW, rdH, 6); x.fill(); } else x.fillRect(rdX, rdY, rdW, rdH);
      x.strokeStyle = "rgba(20,12,8,.8)"; x.lineWidth = Math.max(1.2, W * .0015);
      x.beginPath(); x.moveTo(rdX + rdW * .12, rdY); x.lineTo(rdX + rdW * .3, rdY - rdH * .75); x.stroke(); // antenna
      var dlX = rdX + rdW * .07, dlY = rdY + rdH * .18, dlW = rdW * .64, dlH = rdH * .42;
      x.fillStyle = "rgba(255,205,138," + (.85 + night * .15) + ")";
      if (x.roundRect) { x.beginPath(); x.roundRect(dlX, dlY, dlW, dlH, 3); x.fill(); } else x.fillRect(dlX, dlY, dlW, dlH);
      var isOn2 = typeof playing !== "undefined" && playing;
      var dial = (typeof lastNow !== "undefined" && lastNow && lastNow.title && lastNow.title !== "Mellow Mountain Radio")
        ? lastNow.title + " — " + lastNow.artist + "   ·   KAZM 106.5 FM · 780 AM   ·   "
        : "KAZM · MELLOW MOUNTAIN RADIO · 106.5 FM · 780 AM   ·   ";
      x.save();
      x.beginPath(); x.rect(dlX + 2, dlY, dlW - 4, dlH); x.clip();
      x.fillStyle = "rgb(74,38,16)"; x.textAlign = "left"; x.textBaseline = "middle";
      x.font = "700 " + Math.round(Math.max(9, dlH * .58)) + "px Lato, sans-serif";
      var dtw = x.measureText(dial).width;
      var off2 = reduced ? 0 : (el * 22) % dtw;
      x.fillText(dial, dlX + 4 - off2, dlY + dlH / 2);
      x.fillText(dial, dlX + 4 - off2 + dtw, dlY + dlH / 2);
      x.restore();
      // VU bars breathe while the stream truly plays
      for (var vb = 0; vb < 3; vb++) {
        var vh = rdH * .28 * (isOn2 && !reduced ? (.35 + .65 * Math.abs(Math.sin(el * (2.1 + vb * .7) + vb))) : .2);
        x.fillStyle = "rgba(255,205,138," + (isOn2 ? .8 : .3) + ")";
        x.fillRect(rdX + rdW * (.78 + vb * .06), rdY + rdH * .62 - vh, rdW * .035, vh);
      }
      // knobs
      x.fillStyle = "rgb(30,18,12)";
      x.beginPath(); x.arc(rdX + rdW * .82, rdY + rdH * .28, rdH * .1, 0, 7); x.fill();
      x.beginPath(); x.arc(rdX + rdW * .92, rdY + rdH * .28, rdH * .1, 0, 7); x.fill();
      // notes drift up from the radio while it plays
      if (isOn2 && !reduced) {
        if (el - lastNote > 1.6) { lastNote = el; notes.push({ t: 0, dx: Math.random() * .02 - .01, g: Math.random() < .5 ? "♪" : "♫" }); }
        notes = notes.filter(function (n) { return n.t < 1; });
        notes.forEach(function (n) {
          n.t += .005;
          x.globalAlpha = (1 - n.t) * .9;
          x.font = Math.round(Math.max(11, W * .014)) + "px serif";
          x.fillStyle = "#ffd9a0"; x.textAlign = "center";
          x.fillText(n.g, rdX + rdW * .2 + (n.dx + Math.sin(n.t * 7) * .01) * W, rdY - rdH * .3 - n.t * H * .3);
        });
        x.globalAlpha = 1;
      }
      // lamp warmth over the room after dark
      if (night > 0) {
        x.globalCompositeOperation = "screen";
        var lamp = x.createRadialGradient(rdX + rdW * .4, sillY, 0, rdX + rdW * .4, sillY, W * .5);
        lamp.addColorStop(0, "rgba(255,170,90," + (.14 * night) + ")");
        lamp.addColorStop(1, "rgba(255,170,90,0)");
        x.fillStyle = lamp; x.fillRect(0, 0, W, H);
        x.globalCompositeOperation = "source-over";
      }
      // vignette + drifting grain — the room tone
      var vg2 = x.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .4, W / 2, H * .5, Math.max(W, H) * .75);
      vg2.addColorStop(0, "rgba(14,8,4,0)"); vg2.addColorStop(1, "rgba(14,8,4,.32)");
      x.fillStyle = vg2; x.fillRect(0, 0, W, H);
      if (!reduced) {
        if (!grainP) grainP = x.createPattern(grainC, "repeat");
        x.save(); x.globalAlpha = .45;
        x.translate(-((el * 91) % 160), -((el * 53) % 160));
        x.fillStyle = grainP; x.fillRect(0, 0, W + 160, H + 160);
        x.restore();
      }
      if (cap) {
        var ph3;
        if (previewMin != null) {
          var hh3 = Math.floor(previewMin / 60), mm3 = previewMin % 60;
          ph3 = "PREVIEWING " + ((hh3 % 12) || 12) + ":" + (mm3 < 10 ? "0" : "") + mm3 + (hh3 < 12 ? " AM" : " PM");
        } else ph3 = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" }) + " in Sedona";
        var mood2 = [];
        if (wx.code === 45 || wx.code === 48) mood2.push("fog");
        if (snowing2) mood2.push("snowing");
        else if (wx.code >= 95) mood2.push("thunderstorm");
        else if (wx.code >= 51) mood2.push("raining");
        cap.textContent = ph3 + " · sun " + (alt >= 0 ? Math.round(alt) + "° up" : Math.round(-alt) + "° below the horizon") +
          " · " + wx.cover + "% cloud" + (mood2.length ? " · " + mood2.join(" · ") : "") +
          (wx.temp != null ? " · " + wx.temp + "°" : "") +
          (previewMin != null ? " — spin the day; tap LIVE to come home" : " — the lounge runs on the real sky, exactly");
      }
    }
    function paint() {
      var now = new Date();
      if (previewMin != null) {
        // same date, chosen Sedona time — sun math wants UTC, Sedona is UTC-7
        var utcMin = (previewMin + 7 * 60) % 1440;
        now = new Date(now); now.setUTCHours(Math.floor(utcMin / 60), utcMin % 60, 0, 0);
      }
      var alt = swSunAlt(now);
      var el = (Date.now() - t0) / 1000;
      if (PHOTO.ok) { paintPhoto(alt, el, now); return; }
      // no cartoon, ever: until the first photograph arrives, the window is
      // simply dark glass waking up
      x.clearRect(0, 0, W, H);
      var wk = x.createLinearGradient(0, 0, 0, H);
      wk.addColorStop(0, "#0d1526"); wk.addColorStop(1, "#1b2740");
      x.fillStyle = wk; x.fillRect(0, 0, W, H);
      x.fillStyle = "rgba(255,233,168,.55)"; x.textAlign = "center";
      x.font = "italic " + Math.round(Math.max(13, W * .022)) + "px Alice, serif";
      x.fillText("opening the window…", W / 2, H / 2);
      x.strokeStyle = "rgba(20,14,10,.85)"; x.lineWidth = Math.max(6, W * .008);
      x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, W - x.lineWidth, H - x.lineWidth);
      return;
      // sky: night -> astro dawn -> golden -> day, from real solar altitude
      var top, bot;
      if (alt <= -12) { top = [8, 12, 34]; bot = [16, 20, 46]; }
      else if (alt <= -4) { var t = (alt + 12) / 8; top = swMix([8,12,34],[30,26,62], t); bot = swMix([16,20,46],[120,60,70], t); }
      else if (alt <= 8) { var t = (alt + 4) / 12; top = swMix([30,26,62],[92,140,190], t); bot = swMix([228,120,64],[214,178,140], t); }
      else if (alt <= 25) { var t = (alt - 8) / 17; top = swMix([92,140,190],[108,164,214], t); bot = swMix([214,178,140],[190,206,224], t); }
      else { top = [108, 164, 214]; bot = [196, 212, 228]; }
      // heavy cloud deck grays the sky honestly
      var gr = Math.min(1, wx.cover / 100) * .55;
      top = swMix(top, [128, 134, 148], gr); bot = swMix(bot, [168, 172, 182], gr);
      var g = x.createLinearGradient(0, 0, 0, H * .8);
      g.addColorStop(0, swRGB(top)); g.addColorStop(1, swRGB(bot));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      // stars when the sun is truly down
      if (alt < -8) {
        var sa = Math.min(1, (-8 - alt) / 6);
        stars.forEach(function (s, i) {
          var tw = reduced ? 1 : (.6 + .4 * Math.sin(el * 1.3 + i));
          x.globalAlpha = sa * tw * .9; x.fillStyle = "#fff";
          x.fillRect(s[0] * W, s[1] * H, s[2] * .8, s[2] * .8);
        });
        x.globalAlpha = 1;
        // the real moon, real phase — semicircle + terminator ellipse, the honest way
        var mi = moonInfo(), f = Math.max(0, Math.min(1, mi.illum / 100));
        var waning = (mi.name || "").toLowerCase().indexOf("waning") !== -1;
        var mx = W * .78, my = H * .18, mr = Math.max(10, W * .022);
        var moonLit = "#f3ecd9", moonDark = "rgba(60,64,88,.9)";
        x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fillStyle = moonDark; x.fill();
        x.beginPath(); x.arc(mx, my, mr, -Math.PI / 2, Math.PI / 2, waning); x.closePath();
        x.fillStyle = moonLit; x.fill();
        x.beginPath(); x.ellipse(mx, my, mr * Math.abs(1 - 2 * f), mr, 0, 0, 7);
        x.fillStyle = f >= .5 ? moonLit : moonDark; x.fill();
        x.beginPath(); x.arc(mx, my, mr, 0, 7); x.strokeStyle = "rgba(243,236,217,.3)"; x.lineWidth = 1; x.stroke();
      }
      // low sun disk in the window during golden/dawn
      if (alt > -2 && alt < 14) {
        var sy = H * (.62 - alt / 14 * .5);
        x.beginPath(); x.arc(W * .2, sy, Math.max(12, W * .026), 0, 7);
        x.fillStyle = "rgba(255,214,140,.95)"; x.fill();
        x.beginPath(); x.arc(W * .2, sy, Math.max(12, W * .026) * 2.4, 0, 7);
        var sg = x.createRadialGradient(W * .2, sy, 2, W * .2, sy, W * .07);
        sg.addColorStop(0, "rgba(255,200,120,.5)"); sg.addColorStop(1, "rgba(255,200,120,0)");
        x.fillStyle = sg; x.fill();
      }
      // clouds: count from real cover, drift from real wind
      var n = Math.round(wx.cover / 10);
      var drift = reduced ? 0 : el * (.002 + wx.wind * .0006);
      for (var i = 0; i < n && i < clouds.length; i++) {
        var c = clouds[i], cxp = ((c.x + drift * (.6 + c.s * .3)) % 1.25) - .12;
        x.fillStyle = alt < -6 ? "rgba(190,196,215,.16)" : "rgba(255,255,255," + (.35 + gr * .3) + ")";
        for (var k = 0; k < 4; k++) {
          x.beginPath();
          x.ellipse((cxp + k * .028 * c.s) * W, (c.y + (k % 2) * .012) * H, W * .05 * c.s, H * .045 * c.s, 0, 0, 7);
          x.fill();
        }
      }
      // the yard — lit by the same sun as the sky
      var lit = Math.max(0, Math.min(1, (alt + 4) / 20));
      var gold = (alt > -2 && alt < 10) ? 1 : 0;
      var HZ = .62;
      // treeline on the horizon
      var tl = swMix([18, 22, 20], [52, 74, 48], lit);
      x.beginPath(); x.moveTo(0, H * HZ);
      TREES.forEach(function (h, i) { x.lineTo((i / 40) * W, H * h); });
      x.lineTo(W, H * HZ); x.lineTo(W, H * .72); x.lineTo(0, H * .72); x.closePath();
      x.fillStyle = swRGB(tl); x.fill();
      // the lone pine, left of the tower
      var px = W * .2;
      x.fillStyle = swRGB(swMix([14, 18, 16], [40, 62, 40], lit));
      x.fillRect(px - 1.5, H * .5, 3, H * .13);
      for (var k = 0; k < 4; k++) {
        var pw = W * (.052 - k * .01), py = H * (.55 - k * .05);
        x.beginPath(); x.moveTo(px - pw, py); x.lineTo(px + pw, py); x.lineTo(px, py - H * .055); x.closePath(); x.fill();
      }
      // red dirt + the flagstone path
      var gnd = swMix([40, 18, 14], [128, 62, 42], lit);
      x.fillStyle = swRGB(gnd); x.fillRect(0, H * .66, W, H * .34);
      x.fillStyle = swRGB(swMix([58, 30, 24], [164, 96, 70], lit));
      STONES.forEach(function (s) {
        x.beginPath(); x.ellipse(s[0] * W, s[1] * H, s[2] * W * .55, s[2] * H * .3, .3, 0, 7); x.fill();
      });
      // the AM tower — thin lattice mast, guys, beacon after dark
      var tx = W * .58, tw = Math.max(2, W * .004);
      var steel = swMix([26, 26, 32], [110, 112, 120], lit);
      x.strokeStyle = swRGB(steel); x.lineWidth = tw;
      x.beginPath(); x.moveTo(tx, H * .05); x.lineTo(tx, H * .66); x.stroke();
      x.lineWidth = Math.max(1, tw * .5);
      for (var k = 0; k < 14; k++) { var ty = H * (.08 + k * .04); x.beginPath(); x.moveTo(tx - tw * 2.2, ty); x.lineTo(tx + tw * 2.2, ty + H * .012); x.stroke(); }
      x.globalAlpha = .55; x.lineWidth = Math.max(1, tw * .4);
      [[.16, .63], [.34, .645], [.9, .64], [.99, .6]].forEach(function (g) {
        x.beginPath(); x.moveTo(tx, H * (g[0] === .9 || g[0] === .99 ? .22 : .18)); x.lineTo(W * g[0], H * g[1]); x.stroke();
      });
      x.globalAlpha = 1;
      if (alt < -2) { // FAA-red beacon breathing on top after sundown
        var pulse = reduced ? .8 : (.45 + .55 * Math.abs(Math.sin(el * 1.1)));
        x.beginPath(); x.arc(tx, H * .05, Math.max(2.5, W * .004), 0, 7);
        x.fillStyle = "rgba(255,60,40," + pulse + ")"; x.fill();
        x.beginPath(); x.arc(tx, H * .05, Math.max(2.5, W * .004) * 3, 0, 7);
        x.fillStyle = "rgba(255,60,40," + pulse * .18 + ")"; x.fill();
      }
      // the big dish, foreground right — catches whatever light the sky has
      var dx = W * .86, dy = H * .55, drx = W * .13, dry = H * .3;
      x.save(); x.translate(dx, dy); x.rotate(-.38);
      var dishFace = swMix([70, 74, 88], [225, 222, 214], Math.max(lit, .18));
      x.beginPath(); x.ellipse(0, 0, drx, dry, 0, 0, 7); x.fillStyle = swRGB(dishFace); x.fill();
      x.lineWidth = Math.max(1.5, W * .002); x.strokeStyle = "rgba(30,24,20,.5)"; x.stroke();
      x.beginPath(); x.ellipse(drx * .18, 0, drx * .82, dry * .82, 0, 0, 7);
      x.strokeStyle = "rgba(30,24,20,.18)"; x.stroke();
      x.strokeStyle = swRGB(swMix([40, 36, 34], [150, 140, 128], lit)); x.lineWidth = Math.max(1.5, W * .0025);
      [[-.5, -.6], [0, -.75], [.4, -.5]].forEach(function (f) {
        x.beginPath(); x.moveTo(drx * f[0], dry * f[1]); x.lineTo(-drx * .55, -dry * 1.05); x.stroke();
      });
      x.restore();
      x.fillStyle = swRGB(swMix([32, 22, 18], [104, 78, 60], lit));
      x.fillRect(dx - W * .006, dy + dry * .5, W * .012, H * .2);
      // the little rain gauge on its legs — the hardest-working thing in the yard
      var gx = W * .155, gy = H * .7;
      x.fillStyle = swRGB(swMix([70, 72, 74], [196, 198, 192], lit));
      x.fillRect(gx - W * .011, gy - H * .1, W * .022, H * .1);
      x.strokeStyle = swRGB(steel); x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(gx - W * .011, gy); x.lineTo(gx - W * .02, gy + H * .05);
      x.moveTo(gx + W * .011, gy); x.lineTo(gx + W * .02, gy + H * .05); x.stroke();
      // a raven now and then, gliding the length of the sky
      if (!reduced) {
        if (!raven && el - lastRaven > 18 && Math.random() < .01) { raven = { t: 0, y: .12 + Math.random() * .2, dir: Math.random() < .5 ? 1 : -1 }; }
        if (raven) {
          raven.t += .0035;
          var rx2 = raven.dir > 0 ? raven.t : 1 - raven.t;
          if (raven.t >= 1) { raven = null; lastRaven = el; }
          else {
            var ry = (raven.y + Math.sin(raven.t * 9) * .012) * H, rxp = rx2 * W;
            var flap = Math.sin(el * 7) * H * .012;
            x.strokeStyle = alt < -6 ? "rgba(200,205,220,.5)" : "rgba(24,18,14,.75)"; x.lineWidth = 2; x.lineCap = "round";
            x.beginPath(); x.moveTo(rxp - W * .012, ry - flap); x.quadraticCurveTo(rxp, ry + H * .008, rxp + W * .012, ry - flap); x.stroke();
          }
        }
        // shooting star, night only, rare
        if (alt < -10) {
          if (!shoot && el - lastShoot > 14 && Math.random() < .006) { shoot = { t: 0, x0: .15 + Math.random() * .5, y0: .06 + Math.random() * .15 }; }
          if (shoot) {
            shoot.t += .06;
            if (shoot.t >= 1) { shoot = null; lastShoot = el; }
            else {
              var sxp = (shoot.x0 + shoot.t * .16) * W, syp = (shoot.y0 + shoot.t * .07) * H;
              var grd = x.createLinearGradient(sxp - W * .06, syp - H * .025, sxp, syp);
              grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(1, "rgba(255,255,255," + (.9 - shoot.t * .8) + ")");
              x.strokeStyle = grd; x.lineWidth = 1.6;
              x.beginPath(); x.moveTo(sxp - W * .06, syp - H * .025); x.lineTo(sxp, syp); x.stroke();
            }
          }
        }
      }
      // the windowsill radio — notes drift out while the stream is really playing
      var rx0 = W * .07, ry0 = H * .93;
      x.fillStyle = swRGB(swMix([50, 34, 26], [130, 96, 70], lit));
      x.beginPath(); if (x.roundRect) x.roundRect(rx0 - W * .028, ry0 - H * .055, W * .056, H * .05, 4); else x.rect(rx0 - W * .028, ry0 - H * .055, W * .056, H * .05); x.fill();
      x.fillStyle = "rgba(255,233,168,.9)";
      x.fillRect(rx0 - W * .018, ry0 - H * .043, W * .022, H * .016);
      x.beginPath(); x.arc(rx0 + W * .016, ry0 - H * .032, Math.max(2, W * .005), 0, 7); x.fill();
      x.strokeStyle = "rgba(24,18,14,.8)"; x.lineWidth = 1;
      x.beginPath(); x.moveTo(rx0 + W * .02, ry0 - H * .055); x.lineTo(rx0 + W * .028, ry0 - H * .085); x.stroke();
      var isOn = typeof playing !== "undefined" && playing;
      if (isOn && !reduced) {
        if (el - lastNote > 1.4) { lastNote = el; notes.push({ t: 0, dx: Math.random() * .02 - .01, g: Math.random() < .5 ? "♪" : "♫" }); }
        notes = notes.filter(function (n) { return n.t < 1; });
        notes.forEach(function (n) {
          n.t += .004;
          x.globalAlpha = 1 - n.t;
          x.font = Math.round(Math.max(11, W * .014)) + "px serif";
          x.fillStyle = "#ffe9a8"; x.textAlign = "center";
          x.fillText(n.g, (rx0 / W + n.dx + Math.sin(n.t * 8) * .008) * W, ry0 - H * .08 - n.t * H * .3);
        });
        x.globalAlpha = 1;
      }
      // the brass plate: what the transmitter is actually singing
      if (typeof lastNow !== "undefined" && lastNow && lastNow.title && lastNow.title !== "Mellow Mountain Radio") {
        var plate = "♪  " + lastNow.title + " — " + lastNow.artist;
        x.font = "700 " + Math.round(Math.max(11, W * .012)) + "px Lato, sans-serif";
        var pw = Math.min(W * .55, x.measureText(plate).width + 26);
        var px0 = W * .5 - pw / 2, py0 = H - Math.max(24, H * .075);
        x.fillStyle = "rgba(20,14,10,.78)";
        x.beginPath(); if (x.roundRect) x.roundRect(px0, py0, pw, Math.max(20, H * .052), 6); else x.rect(px0, py0, pw, Math.max(20, H * .052)); x.fill();
        x.strokeStyle = "rgba(255,216,138,.5)"; x.lineWidth = 1; x.stroke();
        x.fillStyle = "#ffe9a8"; x.textAlign = "center"; x.textBaseline = "middle";
        x.fillText(plate, W * .5, py0 + Math.max(10, H * .026), pw - 16);
        x.textBaseline = "alphabetic";
      }
      // rain, only when it's really raining
      if (wx.code >= 51) {
        x.strokeStyle = "rgba(180,200,230,.35)"; x.lineWidth = 1;
        drops.forEach(function (d) {
          var dy = reduced ? d[1] : ((d[1] + el * .5) % 1);
          x.beginPath(); x.moveTo(d[0] * W, dy * H * .9); x.lineTo(d[0] * W - 2, dy * H * .9 + 9); x.stroke();
        });
      }
      // the window itself
      x.strokeStyle = "rgba(20,14,10,.85)"; x.lineWidth = Math.max(6, W * .008);
      x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, W - x.lineWidth, H - x.lineWidth);
      x.lineWidth = Math.max(3, W * .004);
      x.beginPath(); x.moveTo(W / 2, 0); x.lineTo(W / 2, H); x.moveTo(0, H * .5); x.lineTo(W, H * .5); x.stroke();
      if (cap) {
        var ph;
        if (previewMin != null) {
          var hh = Math.floor(previewMin / 60), mm = previewMin % 60;
          ph = "PREVIEWING " + ((hh % 12) || 12) + ":" + (mm < 10 ? "0" : "") + mm + (hh < 12 ? " AM" : " PM");
        } else ph = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", timeZone: "America/Phoenix" }) + " in Sedona";
        cap.textContent = ph + " · sun " + (alt >= 0 ? Math.round(alt) + "° up" : Math.round(-alt) + "° below the horizon") +
          " · " + wx.cover + "% cloud" + (wx.code >= 51 ? " · raining" : "") + (wx.temp != null ? " · " + wx.temp + "°" : "") +
          (previewMin != null ? " — time travel; tap LIVE to come home" : " — drawn from the real sky, nothing staged");
      }
    }
    var scrub = doc.querySelector("[data-window-scrub]"), liveBtn = doc.querySelector("[data-window-live]");
    if (scrub) scrub.addEventListener("input", function () {
      previewMin = (+scrub.value) * 15;
      if (liveBtn) liveBtn.classList.add("is-armed");
      if (reduced) paint();
    });
    if (liveBtn) liveBtn.addEventListener("click", function () {
      previewMin = null; liveBtn.classList.remove("is-armed");
      if (scrub) { var n2 = new Date(); var pmin = (n2.getUTCHours() * 60 + n2.getUTCMinutes() - 7 * 60 + 1440) % 1440; scrub.value = Math.round(pmin / 15); }
      if (reduced) paint();
    });
    if (scrub) { var n3 = new Date(); scrub.value = Math.round(((n3.getUTCHours() * 60 + n3.getUTCMinutes() - 7 * 60 + 1440) % 1440) / 15); }
    paint();
    if (reduced) { var rT = setInterval(function () { if (!cv.isConnected) { clearInterval(rT); return; } paint(); }, 60000); }
    else { (function loop() { if (!cv.isConnected) return; paint(); requestAnimationFrame(function () { setTimeout(loop, 100); }); })(); }
    window.addEventListener("resize", function () { if (cv.isConnected) { size(); paint(); } });
  }

  /* =========================================================
     THE LOUNGE WINDOW — the painted view from the transmitter site.
     One fixed view (golden hour on the mountain), shown whole. Pointer
     parallax and the live on-air spectrum live here; real astronomy,
     weather, and aircraft (the "living scene" layers) are wired in by
     living-scene/scene.js, dynamically imported below since this file
     is a classic script, not a module.
     ========================================================= */
  function initLounge() {
    var root = doc.querySelector("[data-lounge]"); if (!root) return;
    var scene = root.querySelector("[data-lounge-scene]");
    var eq = root.querySelector("[data-lounge-eq]");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (eq) {
      sceneEq = eq; // register the sill so the live spectrum has somewhere to draw
      var sizeEq = function () {
        var r = eq.getBoundingClientRect();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        eq.width = Math.max(1, Math.round((r.width || 600) * dpr));
        eq.height = Math.max(1, Math.round((r.height || 64) * dpr));
        eq._c = null;
      };
      sizeEq();
      window.addEventListener("resize", sizeEq, { passive: true });
      // if the stream is already playing when this page loads, get the ribbon going
      if (playing) startViz();
    }

    // gentle depth: the view drifts a few pixels toward the pointer
    if (scene && !reduce) {
      var tx = 0, ty = 0, cx = 0, cy = 0, praf = null;
      var ease = function () {
        cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
        scene.style.transform = "scale(1.06) translate(" + cx.toFixed(2) + "px," + cy.toFixed(2) + "px)";
        if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) praf = window.requestAnimationFrame(ease);
        else praf = null;
      };
      root.addEventListener("pointermove", function (e) {
        if (e.pointerType === "touch") return;
        var r = root.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * -22;
        ty = ((e.clientY - r.top) / r.height - 0.5) * -14;
        if (!praf) praf = window.requestAnimationFrame(ease);
      }, { passive: true });
      root.addEventListener("pointerleave", function () { tx = 0; ty = 0; if (!praf) praf = window.requestAnimationFrame(ease); });
    }

    import("./living-scene/scene.js").then(function (m) { m.initLivingScene(root); }).catch(function () {});
  }

  function initTape() {
    var root = doc.querySelector("[data-tape]"); if (!root) return;
    var off = doc.querySelector("[data-tape-off]");
    fetch("rewind.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (cfg) {
        if (!cfg) return null;
        if (cfg.mode === "azuracast" && cfg.podcast) {
          // the archive lives as podcast episodes on the station's own AzuraCast
          return fetch("https://streaming.mellowmountainradio.com/api/station/mellowmountainradio/public/podcast/" + encodeURIComponent(cfg.podcast) + "/episodes", { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (eps) {
              if (!eps || !eps.length) return null;
              var blocks = [];
              eps.forEach(function (e) {
                var m = (e.title || "").match(/^kazm-(\d{4}-\d{2}-\d{2})-(\d{2})00$/);
                if (!m || !e.has_media || !e.is_published) return;
                var dl = (e.links && e.links.download) || "";
                dl = dl.replace(/^https:\/\/op3\.dev\/e\//, "https://");
                if (dl) blocks.push({ url: dl, date: m[1], start: +m[2] });
              });
              return blocks.length ? { man: { blocks: blocks } } : null;
            });
        }
        if (cfg.mode === "webhook" && cfg.endpoint) {
          // the archive lives as files in the station's own media library;
          // an n8n webhook shapes them into ready-to-play blocks
          return fetch(cfg.endpoint, { cache: "no-store" })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
              return d && d.ok && d.blocks && d.blocks.length ? { man: { blocks: d.blocks } } : null;
            });
        }
        if (!cfg.base) return null;
        return fetch(cfg.base.replace(/\/$/, "") + "/manifest.json", { cache: "no-store" })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (man) {
            if (!man || !man.blocks || !man.blocks.length) return null;
            var base = cfg.base.replace(/\/$/, "");
            man.blocks.forEach(function (b) { b.url = base + "/" + b.file; });
            return { man: man };
          });
      })
      .then(function (got) {
        if (!got) return; // recorder not rolling — the honest note stays
        root.hidden = false; if (off) off.hidden = true;
        var blocks = got.man.blocks;
        var audio = root.querySelector("[data-tape-audio]"), title = root.querySelector("[data-tape-title]"),
            sub = root.querySelector("[data-tape-sub]"), shelf = root.querySelector("[data-tape-shelf]"),
            hoursEl = root.querySelector("[data-tape-hours]"), reel = root.querySelector("[data-tape-reel]");
        var NAMES = { 0: "Overnight", 6: "Morning", 12: "Afternoon", 18: "Evening" };
        var byDay = {};
        blocks.forEach(function (b) { (byDay[b.date] = byDay[b.date] || []).push(b); });
        var days = Object.keys(byDay).sort().reverse();
        function fmtDay(d) {
          var dt = new Date(d + "T12:00:00");
          return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()] + " " + (dt.getMonth() + 1) + "/" + dt.getDate();
        }
        shelf.innerHTML = days.map(function (d) {
          var row = byDay[d].sort(function (a, b) { return a.start - b.start; }).map(function (b) {
            return '<button type="button" class="tape-block" data-url="' + esc(b.url) + '" data-date="' + esc(b.date) + '" data-start="' + b.start + '">' + (NAMES[b.start] || (b.start + ":00")) + '<i>' + ((b.start % 12) || 12) + (b.start < 12 ? "a" : "p") + "–" + (((b.start + 6) % 12) || 12) + ((b.start + 6) % 24 < 12 ? "a" : "p") + '</i></button>';
          }).join("");
          return '<div class="tape-day"><span class="tape-day-lab">' + fmtDay(d) + '</span><div class="tape-day-row">' + row + '</div></div>';
        }).join("");
        function play(btn, hour) {
          shelf.querySelectorAll(".tape-block").forEach(function (x) { x.classList.remove("is-on"); });
          btn.classList.add("is-on");
          var st = +btn.getAttribute("data-start");
          audio.src = btn.getAttribute("data-url");
          title.textContent = (NAMES[st] || st + ":00") + " — " + fmtDay(btn.getAttribute("data-date"));
          sub.textContent = "six broadcast hours · Sedona time · drag anywhere";
          hoursEl.innerHTML = "";
          for (var k = 0; k < 6; k++) {
            (function (k) {
              var h = (st + k) % 24, lab = ((h % 12) || 12) + (h < 12 ? " AM" : " PM");
              var hb = doc.createElement("button"); hb.type = "button"; hb.className = "tape-hr"; hb.textContent = lab;
              hb.addEventListener("click", function () { audio.currentTime = k * 3600; audio.play().catch(function () {}); });
              hoursEl.appendChild(hb);
            })(k);
          }
          audio.play().catch(function () {});
          try { history.replaceState(null, "", "#b=" + btn.getAttribute("data-date") + "-" + ("0" + st).slice(-2) + (hour ? "&h=" + hour : "")); } catch (e) {}
          if (hour) { audio.addEventListener("loadedmetadata", function once() { audio.removeEventListener("loadedmetadata", once); audio.currentTime = hour * 3600; }); }
        }
        shelf.addEventListener("click", function (ev) {
          var b = ev.target.closest ? ev.target.closest(".tape-block") : null; if (b) play(b, 0);
        });
        audio.addEventListener("play", function () { if (reel) reel.classList.add("is-spin"); });
        audio.addEventListener("pause", function () { if (reel) reel.classList.remove("is-spin"); });
        // deep link: #b=YYYY-MM-DD-HH&h=N
        var m = (location.hash || "").match(/b=(\d{4}-\d{2}-\d{2})-(\d{2})(?:&h=(\d))?/);
        if (m) {
          var want = shelf.querySelector('.tape-block[data-date="' + m[1] + '"][data-start="' + (+m[2]) + '"]');
          if (want) play(want, m[3] ? +m[3] : 0);
        }
      });
  }

  function initTraffic() {
    var el = doc.querySelector("[data-traffic]");
    if (!el || el.getAttribute("data-init")) return;
    el.setAttribute("data-init", "1");
    loadLeaflet(function (L) {
      if (!L || !el.isConnected) { if (el.isConnected) el.innerHTML = '<p class="embed-note">The traffic map is unavailable right now.</p>'; return; }
      var map = L.map(el, { scrollWheelZoom: false, zoomControl: true, attributionControl: true, touchZoom: false, doubleClickZoom: false }).setView([34.8675, -111.794], 14);
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
     DETAILED LUNAR MAP — everything computed live, no keys, no images.
     Phase, illumination, age, Earth&ndash;Moon distance, angular size,
     optical libration (Meeus), and Sedona moonrise/moonset — then the
     near side is rendered pixel-by-pixel with the REAL terminator for
     tonight (correct lit fraction + waxing/waning limb), the major maria
     drawn at their true selenographic positions, and the named craters
     that are actually catching the sun right now.
     ========================================================= */
  function lunarInfo(now) {
    var LAT = 34.8697, LON = -111.7610, TZ = -7;
    var rad = Math.PI / 180, deg = 180 / Math.PI, dayMs = 86400000, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, syn = 29.530588853;
    function fromJD(j) { return (j + 0.5 - J1970) * dayMs; }
    function toDays(date) { return date.valueOf() / dayMs - 0.5 + J1970 - J2000; }
    function n360(x) { return ((x % 360) + 360) % 360; }
    function n180(x) { x = n360(x); return x > 180 ? x - 360 : x; }
    function raOf(l, b) { return Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)); }
    function decOf(l, b) { return Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)); }
    function sidereal(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }
    function altOf(H, phi, dc) { return Math.asin(Math.sin(phi) * Math.sin(dc) + Math.cos(phi) * Math.cos(dc) * Math.cos(H)); }
    function sma(d) { return rad * (357.5291 + 0.98560028 * d); }
    function eclon(M) { return M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI; }
    var d = toDays(now);
    var ls = n360(eclon(sma(d)) * deg);                                  // sun ecliptic longitude (deg)
    var Lm = 218.316 + 13.176396 * d, Mm = 134.963 + 13.064993 * d, Fm = 93.272 + 13.229350 * d;
    var lonM = n360(Lm + 6.289 * Math.sin(Mm * rad));                    // moon true ecliptic lon (deg)
    var latM = 5.128 * Math.sin(Fm * rad);                              // moon ecliptic lat (deg)
    var distKm = 385001 - 20905 * Math.cos(Mm * rad);                   // Earth–Moon distance (km)
    var lonMr = lonM * rad, latMr = latM * rad;
    var elong = n360(lonM - ls);                                        // 0 new · 180 full
    var illum = (1 - Math.cos(elong * rad)) / 2;                        // lit fraction
    var waxing = elong < 180;
    var age = elong / 360 * syn;                                        // days since new
    var subSunLon = n180(180 - elong);                                 // selenographic subsolar longitude
    // optical libration (Meeus, Astronomical Algorithms ch.53)
    var Om = n360(125.0445 - 0.0529539 * d), I = 1.54242;
    var W = n360(lonM - Om) * rad, Ir = I * rad, br = latMr;
    var A = Math.atan2(Math.sin(W) * Math.cos(br) * Math.cos(Ir) - Math.sin(br) * Math.sin(Ir), Math.cos(W) * Math.cos(br));
    var libLon = n180(A * deg - Fm);
    var libLat = Math.asin(-Math.sin(W) * Math.cos(br) * Math.sin(Ir) - Math.sin(br) * Math.cos(Ir)) * deg;
    // Sedona moonrise / moonset
    var lw = rad * -LON, phi = rad * LAT;
    function moonAltAt(date) {
      var dd = toDays(date), LL = 218.316 + 13.176396 * dd, MM = 134.963 + 13.064993 * dd, FF = 93.272 + 13.229350 * dd;
      var lo = (LL + 6.289 * Math.sin(MM * rad)) * rad, la = (5.128 * Math.sin(FF * rad)) * rad;
      var H = sidereal(dd, lw) - raOf(lo, la), h = altOf(H, phi, decOf(lo, la));
      return h + rad * 0.017 / Math.tan(h + rad * 10.26 / (h + rad * 5.114));
    }
    function moonTimes(date) {
      var t = new Date(date); t.setHours(0, 0, 0, 0);
      var hc = 0.133 * rad, h0 = moonAltAt(t) - hc, rise, set;
      for (var i = 1; i <= 24; i++) {
        var h1 = moonAltAt(new Date(+t + i * 3600000)) - hc;
        if (h0 < 0 && h1 >= 0) rise = i - h0 / (h0 - h1);
        if (h0 >= 0 && h1 < 0) set = i - h0 / (h0 - h1);
        h0 = h1;
      }
      var r = {}; if (rise) r.rise = new Date(+t + rise * 3600000); if (set) r.set = new Date(+t + set * 3600000); return r;
    }
    var mt = moonTimes(now);
    var angMin = 2 * Math.atan(1737.4 / distKm) * deg * 60;             // apparent diameter (arcmin)
    function nextAt(target) { return new Date(+now + n360(target - elong) / 360 * syn * dayMs); }
    var names = [["New moon", "🌑"], ["Waxing crescent", "🌒"], ["First quarter", "🌓"], ["Waxing gibbous", "🌔"],
      ["Full moon", "🌕"], ["Waning gibbous", "🌖"], ["Last quarter", "🌗"], ["Waning crescent", "🌘"]];
    var idx = Math.round(elong / 45) % 8;
    return {
      name: names[idx][0], icon: names[idx][1], illum: illum, waxing: waxing, age: age,
      subSunLon: subSunLon, libLon: libLon, libLat: libLat, distKm: distKm, angMin: angMin, elong: elong,
      moonrise: mt.rise, moonset: mt.set, tz: TZ, nextFull: nextAt(180), nextNew: nextAt(360)
    };
  }
  // near-side feature catalogue — real selenographic coordinates (lon +E, lat +N)
  var LUNAR_MARIA = [
    { n: "Oceanus Procellarum", lon: -57, lat: 19, r: 27, soft: 9 }, { n: "Mare Imbrium", lon: -16, lat: 33, r: 18, soft: 6 },
    { n: "Mare Serenitatis", lon: 18, lat: 28, r: 11, soft: 5 }, { n: "Mare Tranquillitatis", lon: 31, lat: 9, r: 13, soft: 5 },
    { n: "Mare Crisium", lon: 59, lat: 17, r: 8, soft: 3 }, { n: "Mare Fecunditatis", lon: 52, lat: -8, r: 10, soft: 4 },
    { n: "Mare Nectaris", lon: 34, lat: -15, r: 6, soft: 3 }, { n: "Mare Nubium", lon: -17, lat: -21, r: 11, soft: 5 },
    { n: "Mare Humorum", lon: -39, lat: -24, r: 7, soft: 3 }, { n: "Mare Frigoris", lon: 0, lat: 56, r: 8, soft: 5 },
    { n: "Mare Vaporum", lon: 4, lat: 13, r: 5, soft: 3 }, { n: "Mare Insularum", lon: -31, lat: 8, r: 8, soft: 4 },
    { n: "Mare Cognitum", lon: -23, lat: -10, r: 5, soft: 3 }, { n: "Sinus Iridum", lon: -32, lat: 45, r: 5, soft: 3 },
    { n: "Mare Humboldtianum", lon: 81, lat: 57, r: 5, soft: 3 }
  ];
  var LUNAR_CRATERS = [
    { n: "Tycho", lon: -11, lat: -43, rays: true, rk: 3 }, { n: "Copernicus", lon: -20, lat: 10, rays: true, rk: 3 },
    { n: "Kepler", lon: -38, lat: 8, rays: true, rk: 2 }, { n: "Aristarchus", lon: -47, lat: 24, rk: 2 },
    { n: "Plato", lon: -9, lat: 51, dark: true, rk: 3 }, { n: "Clavius", lon: -14, lat: -58, rk: 3 },
    { n: "Grimaldi", lon: -68, lat: -5, dark: true, rk: 3 }, { n: "Gassendi", lon: -40, lat: -18, dark: true, rk: 2 },
    { n: "Ptolemaeus", lon: -2, lat: -9, rk: 3 }, { n: "Langrenus", lon: 61, lat: -9, rk: 2 },
    { n: "Petavius", lon: 61, lat: -25, rk: 2 }, { n: "Posidonius", lon: 30, lat: 32, rk: 2 },
    { n: "Aristoteles", lon: 17, lat: 50, rk: 2 }
  ];
  var LUNAR_SITES = [{ n: "Apollo 11", lon: 23.5, lat: 0.7 }, { n: "Apollo 17", lon: 30.8, lat: 20.2 }];
  function lunarSeleVec(lon, lat) { var rad = Math.PI / 180, cl = Math.cos(lat * rad); return [cl * Math.cos(lon * rad), cl * Math.sin(lon * rad), Math.sin(lat * rad)]; }
  function lunarLit(f, L) {   // is a near-side feature currently sunlit AND facing us?
    var rad = Math.PI / 180, sb0 = Math.sin(L.libLat * rad), cb0 = Math.cos(L.libLat * rad);
    var b = f.lat * rad, dLon = (f.lon - L.libLon) * rad;
    var Z = Math.sin(b) * sb0 + Math.cos(b) * cb0 * Math.cos(dLon);
    if (Z <= 0.05) return false;
    return Math.cos(b) * Math.cos((f.lon - L.subSunLon) * rad) > 0.06;
  }
  function drawMoon(cv, L) {
    var rad = Math.PI / 180;
    var cssW = cv.clientWidth || 300, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.max(1, Math.round(cssW * dpr)), H = W;
    cv.width = W; cv.height = H; cv.style.height = cssW + "px";
    var ctx = cv.getContext("2d"), cx = W / 2, cy = H / 2, R = W * 0.47;
    var subLon = L.libLon * rad, sinb0 = Math.sin(L.libLat * rad), cosb0 = Math.cos(L.libLat * rad), subSun = L.subSunLon * rad;
    var maria = LUNAR_MARIA.map(function (m) { return { v: lunarSeleVec(m.lon, m.lat), ci: Math.cos(m.r * rad), co: Math.cos((m.r + (m.soft || 5)) * rad) }; });
    var img = ctx.createImageData(W, H), data = img.data;
    for (var y = 0; y < H; y++) {
      for (var x = 0; x < W; x++) {
        var nx = (x - cx) / R, ny = (y - cy) / R, r2 = nx * nx + ny * ny, o = (y * W + x) * 4;
        if (r2 > 1) { data[o + 3] = 0; continue; }
        var Xs = nx, Ys = -ny, Z = Math.sqrt(1 - r2);
        var sinb = Ys * cosb0 + Z * sinb0; if (sinb > 1) sinb = 1; else if (sinb < -1) sinb = -1;
        var b = Math.asin(sinb), cb = Math.cos(b);
        var lam = subLon + Math.atan2(Xs, Z * cosb0 - Ys * sinb0);
        var vx = cb * Math.cos(lam), vy = cb * Math.sin(lam), vz = sinb;
        var alb = 0.88;
        for (var k = 0; k < maria.length; k++) {
          var mm = maria[k], dd = vx * mm.v[0] + vy * mm.v[1] + vz * mm.v[2];
          if (dd > mm.co) { var t = (dd - mm.co) / (mm.ci - mm.co); if (t > 1) t = 1; t = t * t * (3 - 2 * t); alb += (0.30 - alb) * t * 0.9; }
        }
        alb += 0.03 * Math.sin(lam * 7) * Math.cos(b * 9);              // faint highland mottling
        var limb = 0.35 + 0.65 * (0.5 + 0.5 * Z);
        var cosi = cb * Math.cos(lam - subSun);
        var lit = (cosi + 0.03) / 0.09; if (lit < 0) lit = 0; else if (lit > 1) lit = 1; lit = lit * lit * (3 - 2 * lit);
        var bright = 0.12 + 0.88 * Math.pow(cosi > 0 ? cosi : 0, 0.6), earth = 0.055;
        var lum = alb * limb * (earth + (bright - earth) * lit); if (lum < 0) lum = 0;
        var r8 = lum * 232, g8 = lum * 226, b8 = lum * 210;
        if (lit < 0.5) { var ee = (0.5 - lit) * 2; r8 = r8 * (1 - 0.22 * ee) + 5 * ee; g8 = g8 * (1 - 0.14 * ee) + 7 * ee; b8 = b8 + 14 * ee; }  // cool earthshine
        data[o] = r8; data[o + 1] = g8; data[o + 2] = b8; data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.clip();
    function proj(lon, lat) {
      var dLon = (lon - L.libLon) * rad, bb = lat * rad;
      var X = Math.cos(bb) * Math.sin(dLon), Y = Math.sin(bb) * cosb0 - Math.cos(bb) * sinb0 * Math.cos(dLon),
        Zt = Math.sin(bb) * sinb0 + Math.cos(bb) * cosb0 * Math.cos(dLon);
      return { x: cx + X * R, y: cy - Y * R, z: Zt };
    }
    LUNAR_CRATERS.forEach(function (c) {
      if (!lunarLit(c, L)) return;
      var p = proj(c.lon, c.lat), rr = (c.rk || 2) * dpr;
      if (c.dark) { ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fillStyle = "rgba(18,20,28,.5)"; ctx.fill(); return; }
      if (c.rays) {
        ctx.strokeStyle = "rgba(255,255,248,.09)"; ctx.lineWidth = dpr * 0.8;
        for (var a = 0; a < 12; a++) { var an = a / 12 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(an) * rr * 7, p.y + Math.sin(an) * rr * 7); ctx.stroke(); }
      }
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr * 2.6);
      g.addColorStop(0, "rgba(255,255,250,.9)"); g.addColorStop(.45, "rgba(255,255,244,.32)"); g.addColorStop(1, "rgba(255,255,244,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, rr * 2.6, 0, 7); ctx.fill();
    });
    LUNAR_SITES.forEach(function (s) {                                   // Apollo landmarks — cyan pins
      if (!lunarLit(s, L)) return;
      var p = proj(s.lon, s.lat), rr = 1.7 * dpr;
      ctx.fillStyle = "rgba(120,230,255,.95)"; ctx.strokeStyle = "rgba(0,0,0,.5)"; ctx.lineWidth = dpr * 0.6;
      ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 7); ctx.fill(); ctx.stroke();
    });
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.lineWidth = Math.max(1, dpr); ctx.strokeStyle = "rgba(150,180,255,.22)"; ctx.stroke();
  }
  var _lunarTimer = null;
  function initLunar() {
    var el = doc.querySelector("[data-lunar]"); if (!el) return;
    if (_lunarTimer) { clearInterval(_lunarTimer); _lunarTimer = null; }
    function T(dt) { return skyTime(dt, -7); }
    function D(dt) { if (!dt || isNaN(dt.valueOf())) return "—"; var u = new Date(dt.valueOf() - 7 * 3600000); return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][u.getUTCMonth()] + " " + u.getUTCDate(); }
    function build() {
      var L;
      try { L = lunarInfo(new Date()); } catch (err) { el.innerHTML = ""; return; }
      var distTag = L.distKm < 362000 ? " · near perigee" : L.distKm > 404000 ? " · near apogee" : "";
      var libEW = Math.abs(L.libLon).toFixed(1) + "&deg; " + (L.libLon >= 0 ? "E" : "W");
      var libNS = Math.abs(L.libLat).toFixed(1) + "&deg; " + (L.libLat >= 0 ? "N" : "S");
      function stat(k, v, s) { return '<div class="lstat"><span class="lstat-k">' + k + '</span><span class="lstat-v">' + v + '</span>' + (s ? '<span class="lstat-s">' + s + '</span>' : '') + '</div>'; }
      var maria = LUNAR_MARIA.filter(function (m) { return lunarLit(m, L); });
      var craters = LUNAR_CRATERS.filter(function (c) { return lunarLit(c, L); });
      var sites = LUNAR_SITES.filter(function (s) { return lunarLit(s, L); });
      function chips(arr, cls) { return arr.map(function (f) { return '<span class="lchip ' + cls + '">' + esc(f.n) + '</span>'; }).join(""); }
      el.innerHTML =
        '<div class="lunar-card">' +
          '<div class="lunar-main">' +
            '<div class="lunar-disc"><div class="lunar-frame">' +
              '<canvas data-lunar-canvas aria-label="Rendered near side of the Moon showing tonight&rsquo;s illuminated fraction"></canvas>' +
              '<span class="lunar-live"><i></i>LIVE</span>' +
              '<span class="lc-n">N</span><span class="lc-s">S</span><span class="lc-e">E</span><span class="lc-w">W</span>' +
            '</div></div>' +
            '<div class="lunar-info">' +
              '<div class="lunar-phase"><span class="lunar-ph-ic">' + L.icon + '</span>' +
                '<div><span class="lunar-ph-name">' + esc(L.name) + '</span>' +
                '<span class="lunar-ph-sub">' + Math.round(L.illum * 100) + '% illuminated &middot; ' + (L.waxing ? "waxing" : "waning") + '</span></div></div>' +
              '<div class="lunar-stats">' +
                stat("Moon age", L.age.toFixed(1) + " days", "since new moon") +
                stat("Distance", Math.round(L.distKm).toLocaleString() + " km", "Earth to Moon" + distTag) +
                stat("Apparent size", L.angMin.toFixed(1) + "&prime;", "angular diameter") +
                stat("Libration", libEW, libNS + " tilt") +
                stat("Moonrise", T(L.moonrise), "over Sedona") +
                stat("Moonset", T(L.moonset), "over Sedona") +
                stat("Next full", D(L.nextFull), Math.max(0, Math.round((L.nextFull - Date.now()) / 86400000)) + " days away") +
                stat("Next new", D(L.nextNew), Math.max(0, Math.round((L.nextNew - Date.now()) / 86400000)) + " days away") +
              '</div>' +
            '</div>' +
          '</div>' +
          (maria.length || craters.length ?
          '<div class="lunar-feat">' +
            '<span class="lunar-feat-h">Catching the sun right now</span>' +
            '<div class="lunar-chips">' + chips(maria, "lchip--mare") + chips(craters, "lchip--crater") +
              (sites.length ? chips(sites, "lchip--site") : "") + '</div>' +
          '</div>' : '') +
          '<div class="lunar-foot">Phase, libration &amp; the terminator shadow are computed live for tonight and drawn to the Moon&rsquo;s real geography &middot; lunar north up, east to the right</div>' +
        '</div>';
      var cv = el.querySelector("[data-lunar-canvas]");
      if (cv) { try { drawMoon(cv, L); } catch (e) {} }
    }
    build();
    _lunarTimer = setInterval(build, 300000);   // terminator creeps ~0.5°/hr — refresh every 5 min
  }

  /* =========================================================
     SEDONA HOROSCOPE — grounded in the REAL sky, not made up.
     The daily/weekly/monthly readings are pulled live server-side from
     freehoroscopeapi.com into horoscopes.json (same-origin). The "sky
     right now" strip and every planet's current sign are computed live
     from Keplerian ephemeris (JPL mean elements) — actual geocentric
     ecliptic longitudes — so the zodiac positions are true, not decorative.
     Each sign's logo is its real constellation, drawn from star positions.
     ========================================================= */
  // Live geocentric ecliptic longitudes → which zodiac sign each body is in now.
  var PLANET_ELEMS = {
    // a(AU), e, I, L, longPeri(ϖ), longNode(Ω)  + per-century rates. JPL/Standish 1800–2050.
    Mercury: [0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593, 0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081],
    Venus:   [0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255, 0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418],
    Earth:   [1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0, 0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0],
    Mars:    [1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891, 0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343],
    Jupiter: [5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909, -0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106],
    Saturn:  [9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448, -0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]
  };
  function helio(name, T) {
    var e = PLANET_ELEMS[name], rad = Math.PI / 180;
    var a = e[0] + e[6] * T, ec = e[1] + e[7] * T, I = (e[2] + e[8] * T) * rad,
      L = e[3] + e[9] * T, wbar = e[4] + e[10] * T, Om = (e[5] + e[11] * T) * rad;
    var M = L - wbar, w = wbar * rad - Om;
    M = ((M % 360) + 540) % 360 - 180; M *= rad;
    var E = M + ec * Math.sin(M);
    for (var k = 0; k < 6; k++) { E = E - (E - ec * Math.sin(E) - M) / (1 - ec * Math.cos(E)); }
    var xp = a * (Math.cos(E) - ec), yp = a * Math.sqrt(1 - ec * ec) * Math.sin(E);
    var cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(Om), sO = Math.sin(Om), cI = Math.cos(I), sI = Math.sin(I);
    return {
      x: (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp,
      y: (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp,
      z: (sw * sI) * xp + (cw * sI) * yp
    };
  }
  function eclLon(name, date) {   // geocentric ecliptic longitude (deg 0–360)
    var T = (date.valueOf() / 86400000 - 10957.5) / 36525;   // centuries since J2000
    var earth = helio("Earth", T), deg = 180 / Math.PI;
    if (name === "Sun") return (Math.atan2(-earth.y, -earth.x) * deg + 360) % 360;
    if (name === "Moon") {
      var d = date.valueOf() / 86400000 - 10957.5, rad = Math.PI / 180;
      var Lm = 218.316 + 13.176396 * d, Mm = 134.963 + 13.064993 * d;
      return (((Lm + 6.289 * Math.sin(Mm * rad)) % 360) + 360) % 360;
    }
    var p = helio(name, T);
    return (Math.atan2(p.y - earth.y, p.x - earth.x) * deg + 360) % 360;
  }
  var PLANETS = [["Sun", "☉"], ["Moon", "☽"], ["Mercury", "☿"], ["Venus", "♀"], ["Mars", "♂"], ["Jupiter", "♃"], ["Saturn", "♄"]];
  function skyNow(date) {
    return PLANETS.map(function (p) {
      var lon = eclLon(p[0], date), idx = Math.floor(lon / 30) % 12, deg = lon % 30;
      var retro = false;
      if (p[0] !== "Sun" && p[0] !== "Moon") {
        var l2 = eclLon(p[0], new Date(+date + 5 * 86400000)), dd = ((l2 - lon + 540) % 360) - 180;
        retro = dd < 0;
      }
      return { name: p[0], glyph: p[1], sign: idx, deg: deg, retro: retro, lon: lon };
    });
  }
  // ---- computed astrology: aspects, retrogrades, elemental balance, birth chart ----
  var ASPECTS = [
    { a: 0, orb: 8, n: "Conjunction", sym: "☌", note: "fused — energies merge" },
    { a: 60, orb: 4, n: "Sextile", sym: "⚹", note: "an easy opening" },
    { a: 90, orb: 6, n: "Square", sym: "▢", note: "friction that pushes growth" },
    { a: 120, orb: 7, n: "Trine", sym: "△", note: "smooth, flowing support" },
    { a: 180, orb: 8, n: "Opposition", sym: "☍", note: "a balancing act" }
  ];
  function astroAspects(sky) {
    var out = [];
    for (var i = 0; i < sky.length; i++) for (var j = i + 1; j < sky.length; j++) {
      var d = Math.abs(sky[i].lon - sky[j].lon) % 360; if (d > 180) d = 360 - d;
      for (var k = 0; k < ASPECTS.length; k++) {
        var A = ASPECTS[k], orbv = Math.abs(d - A.a);
        if (orbv <= A.orb) { out.push({ a: sky[i], b: sky[j], asp: A, orb: orbv }); break; }
      }
    }
    return out.sort(function (x, y) { return x.orb - y.orb; });
  }
  function skyBalance(sky) {
    var el = { Fire: 0, Earth: 0, Air: 0, Water: 0 }, q = { Cardinal: 0, Fixed: 0, Mutable: 0 };
    sky.forEach(function (b) { var z = ZODIAC[b.sign]; el[z.el]++; q[z.q]++; });
    return { el: el, q: q };
  }
  function ascMC(date, latDeg, lonDeg) {   // ecliptic longitudes of Ascendant & Midheaven
    var rad = Math.PI / 180, deg = 180 / Math.PI;
    var JD = date.valueOf() / 86400000 + 2440587.5, d = JD - 2451545, Tu = d / 36525;
    var GMST = 280.46061837 + 360.98564736629 * d + 0.000387933 * Tu * Tu; GMST = ((GMST % 360) + 360) % 360;
    var th = ((((GMST + lonDeg) % 360) + 360) % 360) * rad, eps = 23.4397 * rad, phi = latDeg * rad;
    var mc = ((Math.atan2(Math.sin(th), Math.cos(th) * Math.cos(eps)) * deg) % 360 + 360) % 360;
    var asc = ((Math.atan2(Math.cos(th), -(Math.sin(th) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))) * deg) % 360 + 360) % 360;
    if ((((asc - mc) % 360) + 360) % 360 > 180) asc = (asc + 180) % 360;   // eastern (ascending) point
    return { asc: asc, mc: mc };
  }
  var BIRTH_CITIES = [
    // Sedona first (default); then AZ + Southwest, across the US, then the world.
    { n: "Sedona, AZ", lat: 34.87, lon: -111.76, tz: -7 }, { n: "Phoenix, AZ", lat: 33.45, lon: -112.07, tz: -7 },
    { n: "Flagstaff, AZ", lat: 35.20, lon: -111.65, tz: -7 }, { n: "Tucson, AZ", lat: 32.22, lon: -110.97, tz: -7 },
    { n: "Albuquerque, NM", lat: 35.08, lon: -106.65, tz: -7 }, { n: "Las Vegas, NV", lat: 36.17, lon: -115.14, tz: -8 },
    { n: "Salt Lake City, UT", lat: 40.76, lon: -111.89, tz: -7 }, { n: "Denver, CO", lat: 39.74, lon: -104.99, tz: -7 },
    { n: "Los Angeles, CA", lat: 34.05, lon: -118.24, tz: -8 }, { n: "San Diego, CA", lat: 32.72, lon: -117.16, tz: -8 },
    { n: "San Francisco, CA", lat: 37.77, lon: -122.42, tz: -8 }, { n: "Portland, OR", lat: 45.52, lon: -122.68, tz: -8 },
    { n: "Seattle, WA", lat: 47.61, lon: -122.33, tz: -8 }, { n: "Anchorage, AK", lat: 61.22, lon: -149.90, tz: -9 },
    { n: "Honolulu, HI", lat: 21.31, lon: -157.86, tz: -10 },
    { n: "Dallas, TX", lat: 32.78, lon: -96.80, tz: -6 }, { n: "Houston, TX", lat: 29.76, lon: -95.37, tz: -6 },
    { n: "Austin, TX", lat: 30.27, lon: -97.74, tz: -6 }, { n: "San Antonio, TX", lat: 29.42, lon: -98.49, tz: -6 },
    { n: "Kansas City, MO", lat: 39.10, lon: -94.58, tz: -6 }, { n: "Minneapolis, MN", lat: 44.98, lon: -93.27, tz: -6 },
    { n: "Chicago, IL", lat: 41.88, lon: -87.63, tz: -6 }, { n: "Nashville, TN", lat: 36.16, lon: -86.78, tz: -6 },
    { n: "New Orleans, LA", lat: 29.95, lon: -90.07, tz: -6 }, { n: "Memphis, TN", lat: 35.15, lon: -90.05, tz: -6 },
    { n: "Detroit, MI", lat: 42.33, lon: -83.05, tz: -5 }, { n: "Cleveland, OH", lat: 41.50, lon: -81.69, tz: -5 },
    { n: "Columbus, OH", lat: 39.96, lon: -83.00, tz: -5 }, { n: "Pittsburgh, PA", lat: 40.44, lon: -79.996, tz: -5 },
    { n: "Atlanta, GA", lat: 33.75, lon: -84.39, tz: -5 }, { n: "Miami, FL", lat: 25.76, lon: -80.19, tz: -5 },
    { n: "Washington, DC", lat: 38.91, lon: -77.04, tz: -5 }, { n: "Philadelphia, PA", lat: 39.95, lon: -75.17, tz: -5 },
    { n: "Baltimore, MD", lat: 39.29, lon: -76.61, tz: -5 }, { n: "New York, NY", lat: 40.71, lon: -74.01, tz: -5 },
    { n: "Syracuse, NY", lat: 43.05, lon: -76.15, tz: -5 }, { n: "Buffalo, NY", lat: 42.89, lon: -78.88, tz: -5 },
    { n: "Rochester, NY", lat: 43.16, lon: -77.61, tz: -5 }, { n: "Albany, NY", lat: 42.65, lon: -73.75, tz: -5 },
    { n: "Boston, MA", lat: 42.36, lon: -71.06, tz: -5 }, { n: "Toronto, ON", lat: 43.65, lon: -79.38, tz: -5 },
    { n: "Mexico City, MX", lat: 19.43, lon: -99.13, tz: -6 }, { n: "São Paulo, BR", lat: -23.55, lon: -46.63, tz: -3 },
    { n: "London, UK", lat: 51.51, lon: -0.13, tz: 0 }, { n: "Dublin, IE", lat: 53.35, lon: -6.26, tz: 0 },
    { n: "Paris, FR", lat: 48.86, lon: 2.35, tz: 1 }, { n: "Berlin, DE", lat: 52.52, lon: 13.40, tz: 1 },
    { n: "Madrid, ES", lat: 40.42, lon: -3.70, tz: 1 }, { n: "Rome, IT", lat: 41.90, lon: 12.50, tz: 1 },
    { n: "Dubai, AE", lat: 25.20, lon: 55.27, tz: 4 }, { n: "Mumbai, IN", lat: 19.08, lon: 72.88, tz: 5.5 },
    { n: "Tokyo, JP", lat: 35.68, lon: 139.69, tz: 9 }, { n: "Sydney, AU", lat: -33.87, lon: 151.21, tz: 10 },
    { n: "Auckland, NZ", lat: -36.85, lon: 174.76, tz: 12 }
  ];
  // Zodiac in ecliptic order (index === floor(lon/30)). Constellation = real star figure.
  var ZODIAC = [
    { k: "aries", n: "Aries", g: "♈", sym: "the Ram", dates: "Mar 21 – Apr 19", el: "Fire", q: "Cardinal", ruler: "Mars ♂",
      stars: [[20, 20], [40, 27], [54, 31], [72, 44]], lines: [[0, 1], [1, 2], [2, 3]], alpha: 0, aName: "Hamal" },
    { k: "taurus", n: "Taurus", g: "♉", sym: "the Bull", dates: "Apr 20 – May 20", el: "Earth", q: "Fixed", ruler: "Venus ♀",
      stars: [[14, 16], [30, 30], [40, 36], [52, 40], [64, 33], [82, 18], [78, 50]], lines: [[1, 2], [2, 3], [3, 4], [4, 5], [3, 6]], alpha: 3, aName: "Aldebaran" },
    { k: "gemini", n: "Gemini", g: "♊", sym: "the Twins", dates: "May 21 – Jun 20", el: "Air", q: "Mutable", ruler: "Mercury ☿",
      stars: [[28, 13], [52, 16], [24, 34], [48, 37], [18, 53], [40, 55], [60, 50]], lines: [[0, 1], [0, 2], [2, 4], [1, 3], [3, 5], [3, 6]], alpha: 1, aName: "Pollux" },
    { k: "cancer", n: "Cancer", g: "♋", sym: "the Crab", dates: "Jun 21 – Jul 22", el: "Water", q: "Cardinal", ruler: "the Moon ☽",
      stars: [[50, 14], [44, 32], [58, 34], [38, 50], [72, 42]], lines: [[0, 1], [0, 2], [1, 3], [2, 4]], alpha: 2, aName: "Tarf" },
    { k: "leo", n: "Leo", g: "♌", sym: "the Lion", dates: "Jul 23 – Aug 22", el: "Fire", q: "Fixed", ruler: "the Sun ☉",
      stars: [[22, 46], [22, 33], [27, 21], [38, 15], [47, 23], [42, 35], [66, 45], [86, 39]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1], [0, 6], [6, 7]], alpha: 0, aName: "Regulus" },
    { k: "virgo", n: "Virgo", g: "♍", sym: "the Maiden", dates: "Aug 23 – Sep 22", el: "Earth", q: "Mutable", ruler: "Mercury ☿",
      stars: [[16, 20], [32, 27], [46, 22], [58, 33], [72, 28], [52, 47], [66, 60]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [5, 6]], alpha: 6, aName: "Spica" },
    { k: "libra", n: "Libra", g: "♎", sym: "the Scales", dates: "Sep 23 – Oct 22", el: "Air", q: "Cardinal", ruler: "Venus ♀",
      stars: [[28, 46], [44, 24], [66, 21], [76, 44], [52, 41]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [2, 4]], alpha: 2, aName: "Zubeneschamali" },
    { k: "scorpio", n: "Scorpio", g: "♏", sym: "the Scorpion", dates: "Oct 23 – Nov 21", el: "Water", q: "Fixed", ruler: "Pluto ♇ / Mars ♂",
      stars: [[12, 16], [22, 23], [30, 30], [40, 37], [50, 45], [61, 53], [71, 59], [79, 52], [80, 41]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]], alpha: 3, aName: "Antares", red: true },
    { k: "sagittarius", n: "Sagittarius", g: "♐", sym: "the Archer", dates: "Nov 22 – Dec 21", el: "Fire", q: "Mutable", ruler: "Jupiter ♃",
      stars: [[14, 40], [26, 34], [30, 50], [44, 22], [58, 50], [62, 34], [74, 38]], lines: [[0, 1], [1, 2], [2, 4], [4, 5], [5, 1], [1, 3], [3, 5], [5, 6], [6, 4]], alpha: 2, aName: "Kaus Australis" },
    { k: "capricorn", n: "Capricorn", g: "♑", sym: "the Sea-Goat", dates: "Dec 22 – Jan 19", el: "Earth", q: "Cardinal", ruler: "Saturn ♄",
      stars: [[18, 24], [30, 21], [70, 25], [82, 34], [58, 53], [40, 51], [26, 40]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0]], alpha: 3, aName: "Deneb Algedi" },
    { k: "aquarius", n: "Aquarius", g: "♒", sym: "the Water-Bearer", dates: "Jan 20 – Feb 18", el: "Air", q: "Fixed", ruler: "Uranus ♅ / Saturn ♄",
      stars: [[36, 18], [48, 24], [60, 17], [48, 31], [42, 43], [55, 49], [46, 59], [62, 62]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7]], alpha: 2, aName: "Sadalsuud" },
    { k: "pisces", n: "Pisces", g: "♓", sym: "the Fishes", dates: "Feb 19 – Mar 20", el: "Water", q: "Mutable", ruler: "Neptune ♆ / Jupiter ♃",
      stars: [[12, 20], [19, 14], [27, 18], [20, 27], [40, 34], [58, 45], [73, 31], [82, 19]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4], [4, 5], [5, 6], [6, 7]], alpha: 5, aName: "Alpherg" }
  ];
  function constellationSVG(z) {
    var pts = z.stars.map(function (s, i) {
      var big = i === z.alpha, r = big ? 2.9 : (1.1 + (s[2] || 0));
      var fill = big ? (z.red ? "#ff7a6b" : "#ffe9a8") : "#dfe8ff";
      return '<circle cx="' + s[0] + '" cy="' + s[1] + '" r="' + r + '" fill="' + fill + '"' +
        (big ? ' filter="url(#hglow)"' : ' opacity="' + (0.55 + (s[2] || 0) * 0.15) + '"') + '/>';
    }).join("");
    var segs = z.lines.map(function (l) {
      var a = z.stars[l[0]], b = z.stars[l[1]];
      return '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(180,200,255,.32)" stroke-width="0.7"/>';
    }).join("");
    return '<svg class="cst" viewBox="0 0 100 68" role="img" aria-label="' + z.n + ' constellation">' +
      '<defs><filter id="hglow" x="-120%" y="-120%" width="340%" height="340%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      segs + pts + '</svg>';
  }
  var _horoData = null;
  function horoText(sign, period) {
    var s = _horoData && _horoData.signs && _horoData.signs[sign];
    if (s && s[period]) return s[period];
    return "";
  }
  function initHoroscope() {
    var page = doc.querySelector("[data-zodiac]"); if (!page) return;
    var elGlyph = { Fire: "🔥", Earth: "🌿", Air: "💨", Water: "🌊" };
    var now = new Date(), sky = skyNow(now), sunSign = sky[0].sign;

    // ---- live sky strip ----
    var strip = doc.querySelector("[data-sky-now]");
    if (strip) {
      strip.innerHTML = '<div class="sky-strip">' + sky.map(function (b) {
        var z = ZODIAC[b.sign];
        return '<div class="skb"><span class="skb-p">' + b.glyph + '</span>' +
          '<span class="skb-in">in</span><span class="skb-s">' + z.g + ' ' + z.n + '</span>' +
          '<span class="skb-d">' + Math.floor(b.deg) + '&deg;' + (b.retro ? ' <b class="rx">℞</b>' : '') + '</span>' +
          '<span class="skb-n">' + b.name + '</span></div>';
      }).join("") + '</div>' +
        '<p class="sky-strip-foot">Real geocentric positions computed live for ' +
        now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
        ' &middot; ℞ = retrograde. The Sun sits in <b>' + ZODIAC[sunSign].n + '</b> right now.</p>';
    }

    // ---- cosmic weather: today's aspects ----
    var aspBox = doc.querySelector("[data-aspects]");
    if (aspBox) {
      var asp = astroAspects(sky);
      aspBox.innerHTML = asp.length ? '<div class="asp-grid">' + asp.map(function (x) {
        return '<div class="asp asp--' + x.asp.n.toLowerCase() + '">' +
          '<span class="asp-pair">' + x.a.glyph + ' <span class="asp-sym">' + x.asp.sym + '</span> ' + x.b.glyph + '</span>' +
          '<span class="asp-name">' + x.a.name + ' ' + x.asp.n.toLowerCase() + ' ' + x.b.name + '</span>' +
          '<span class="asp-note">' + x.asp.note + ' &middot; ' + x.orb.toFixed(1) + '&deg; orb</span></div>';
      }).join("") + '</div>' : '<p class="micro-note">No tight aspects between the planets right now — a quiet sky.</p>';
    }

    // ---- retrograde watch ----
    var retroBox = doc.querySelector("[data-retro]");
    if (retroBox) {
      var rx = sky.filter(function (b) { return b.retro; });
      retroBox.innerHTML = rx.length ? '<div class="retro-grid">' + rx.map(function (b) {
        return '<div class="retro"><span class="retro-g">' + b.glyph + '℞</span><b>' + b.name + ' retrograde</b>' +
          '<span>in ' + ZODIAC[b.sign].g + ' ' + ZODIAC[b.sign].n + ' — review, revisit, slow down its themes</span></div>';
      }).join("") + '</div>' : '<p class="micro-note">✓ No planets are retrograde right now — all systems moving direct.</p>';
    }

    // ---- balance of the sky (elements + modalities) ----
    var balBox = doc.querySelector("[data-balance]");
    if (balBox) {
      var bal = skyBalance(sky), total = sky.length;
      function bars(obj, cls) {
        return Object.keys(obj).map(function (kk) {
          var pct = Math.round(obj[kk] / total * 100);
          return '<div class="bal-row ' + cls + '-' + kk.toLowerCase() + '"><span class="bal-k">' + kk + '</span>' +
            '<span class="bal-track"><i style="width:' + pct + '%"></i></span><span class="bal-v">' + obj[kk] + '</span></div>';
        }).join("");
      }
      balBox.innerHTML = '<div class="bal-cols"><div class="bal-col"><h4>Elements</h4>' + bars(bal.el, "el") + '</div>' +
        '<div class="bal-col"><h4>Modalities</h4>' + bars(bal.q, "mo") + '</div></div>' +
        '<p class="micro-note">Where the seven bodies fall across the four elements and three modalities right now — the mood of the moment.</p>';
    }

    // ---- birth chart: Sun · Moon · Rising ----
    var bc = doc.querySelector("[data-birthchart]");
    if (bc) {
      var cityOpts = BIRTH_CITIES.map(function (c, i) { return '<option value="' + i + '">' + c.n + '</option>'; }).join("");
      bc.innerHTML =
        '<form class="bchart-form" data-bc-form>' +
          '<div class="bc-field"><label for="bc-date">Birth date</label><input type="date" id="bc-date" required min="1900-01-01" max="2030-12-31" /></div>' +
          '<div class="bc-field"><label for="bc-time">Birth time <span>(for Moon &amp; Rising)</span></label><input type="time" id="bc-time" /></div>' +
          '<div class="bc-field"><label for="bc-city">Nearest city</label><select id="bc-city">' + cityOpts + '</select></div>' +
          '<button type="submit" class="btn btn-primary bc-go">Cast my chart</button>' +
        '</form>' +
        '<div class="bchart-out" data-bc-out></div>';
      var form = bc.querySelector("[data-bc-form]"), out = bc.querySelector("[data-bc-out]");
      form.addEventListener("submit", function (ev) {
        ev.preventDefault();
        var dv = bc.querySelector("#bc-date").value; if (!dv) return;
        var tv = bc.querySelector("#bc-time").value, city = BIRTH_CITIES[+bc.querySelector("#bc-city").value] || BIRTH_CITIES[0];
        var parts = dv.split("-"), hm = (tv || "12:00").split(":");
        // build the birth instant in UTC from local time − the city's standard offset
        // (subtract as ms so half-hour zones like +5:30 work)
        var utcMs = Date.UTC(+parts[0], +parts[1] - 1, +parts[2], +hm[0], +hm[1]) - city.tz * 3600000;
        var when = new Date(utcMs);
        var sunL = eclLon("Sun", when), moonL = eclLon("Moon", when);
        function chip(label, glyph, lon, note) {
          var z = ZODIAC[Math.floor(((lon % 360) + 360) % 360 / 30) % 12], dd = ((lon % 30) + 30) % 30;
          return '<div class="bc-res"><span class="bc-res-k">' + label + '</span>' +
            '<span class="bc-res-v">' + glyph + ' ' + z.g + ' ' + z.n + '</span>' +
            '<span class="bc-res-d">' + Math.floor(dd) + '&deg; ' + z.n + (note ? ' &middot; ' + note : '') + '</span></div>';
        }
        var html = chip("Sun sign", "☉", sunL, "who you are") +
          chip("Moon sign", "☽", moonL, tv ? "your inner world" : "approx — add birth time");
        if (tv) { var am = ascMC(when, city.lat, city.lon);
          html += chip("Rising", "↑", am.asc, "how you meet the world") + chip("Midheaven", "MC", am.mc, "your public path"); }
        out.innerHTML = '<div class="bc-results">' + html + '</div>' +
          '<p class="bc-foot">Computed from real ephemeris for ' + when.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) +
          ' in ' + esc(city.n) + '.' + (tv ? ' Rising uses standard time for that city — near a cusp it can shift by a sign, so use an exact birth time.' : ' Add your birth time for your Moon (precisely) and your Rising sign.') + '</p>';
        out.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }

    // ---- 12 sign cards ----
    function card(z, i) {
      var isSun = i === sunSign;
      return '<article class="zc zc--' + z.el.toLowerCase() + (isSun ? ' zc--sun' : '') + '" data-sign="' + z.k + '">' +
        '<div class="zc-logo">' + constellationSVG(z) +
          '<span class="zc-glyph">' + z.g + '</span>' +
          (isSun ? '<span class="zc-sunbadge">☀ Sun is here now</span>' : '') +
        '</div>' +
        '<div class="zc-body">' +
          '<div class="zc-head"><h3>' + z.n + '</h3><span class="zc-dates">' + z.dates + '</span></div>' +
          '<p class="zc-sub">' + z.sym + ' &middot; ' + elGlyph[z.el] + ' ' + z.el + ' &middot; ' + z.q + ' &middot; ruled by ' + z.ruler + '</p>' +
          '<p class="zc-star">✦ brightest star: <b>' + z.aName + '</b></p>' +
          '<div class="zc-tabs" role="tablist">' +
            '<button class="zc-tab is-active" data-p="daily">Today</button>' +
            '<button class="zc-tab" data-p="weekly">This week</button>' +
            '<button class="zc-tab" data-p="monthly">This month</button>' +
          '</div>' +
          '<p class="zc-read" data-read>' + (esc(horoText(z.k, "daily")) || "Reading loading&hellip;") + '</p>' +
        '</div>' +
      '</article>';
    }
    function render() {
      page.innerHTML = ZODIAC.map(card).join("");
      page.querySelectorAll(".zc").forEach(function (cardEl) {
        var sign = cardEl.getAttribute("data-sign"), read = cardEl.querySelector("[data-read]");
        cardEl.querySelectorAll(".zc-tab").forEach(function (tab) {
          tab.addEventListener("click", function () {
            cardEl.querySelectorAll(".zc-tab").forEach(function (t) { t.classList.remove("is-active"); });
            tab.classList.add("is-active");
            var p = tab.getAttribute("data-p"), txt = horoText(sign, p);
            read.innerHTML = txt ? esc(txt) : "That reading isn&rsquo;t in yet &mdash; check back after the next refresh.";
          });
        });
      });
    }
    render();
    // load live readings (same-origin JSON written by the 6-hour relay)
    fetch("horoscopes.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) { if (d && d.signs) { _horoData = d; render();
        var when = doc.querySelector("[data-horo-updated]");
        if (when && d.updated) when.textContent = "Readings refreshed " + new Date(d.updated).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · freehoroscopeapi.com"; } })
      .catch(function () {});
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
     THE SEVEN CHAKRAS — a real reference (Sanskrit, element, seed sound,
     petal count, Solfeggio frequency) tied to Sedona's vortexes, with a
     sound bath that SYNTHESIZES each chakra's real tone live in the
     browser (Web Audio). No samples, no fakes — actual generated tones.
     Root→crown, bottom→top. Frequencies are the Solfeggio healing set.
     ========================================================= */
  var CHAKRAS = [
    { k: "root", n: "Root", sa: "Muladhara", loc: "Base of the spine", col: "#e0393f", el: "Earth", bija: "LAM", hz: 396, note: "G", petals: 4, pos: 95,
      gov: "Safety, grounding, survival, belonging", bal: "Steady, secure, present in your body", aff: "I am safe. I belong here.",
      blocked: "Anxious, ungrounded, scattered, insecure about money or home", crystal: "Red jasper · hematite · black tourmaline", oil: "Cedarwood · patchouli · vetiver", pose: "Mountain pose (Tadasana)",
      vortex: "Bell Rock — stand at the base and feel your feet on the red rock." },
    { k: "sacral", n: "Sacral", sa: "Svadhisthana", loc: "Lower belly", col: "#f07a24", el: "Water", bija: "VAM", hz: 417, note: "G♯", petals: 6, pos: 80,
      gov: "Creativity, emotion, pleasure, flow", bal: "Playful, feeling, open to change", aff: "I feel, I create, I flow.",
      blocked: "Numb or overwhelmed, creatively stuck, guilt around pleasure", crystal: "Carnelian · orange calcite · sunstone", oil: "Sweet orange · ylang-ylang · sandalwood", pose: "Goddess pose (Utkata Konasana)",
      vortex: "Oak Creek — let moving water pull the stuck stuff loose." },
    { k: "solar", n: "Solar Plexus", sa: "Manipura", loc: "Upper belly", col: "#f2c53d", el: "Fire", bija: "RAM", hz: 528, note: "C", petals: 10, pos: 63,
      gov: "Willpower, confidence, identity", bal: "Empowered, decisive, warm", aff: "I am strong. I choose my path.",
      blocked: "Powerless or controlling, low self-worth, digestive tension", crystal: "Citrine · tiger's eye · yellow calcite", oil: "Lemon · ginger · bergamot", pose: "Boat pose (Navasana)",
      vortex: "Airport Mesa at sunset — claim your fire as the rocks glow." },
    { k: "heart", n: "Heart", sa: "Anahata", loc: "Center of the chest", col: "#4fae58", el: "Air", bija: "YAM", hz: 639, note: "E", petals: 12, pos: 47,
      gov: "Love, compassion, connection", bal: "Open-hearted, forgiving, at peace", aff: "I give and receive love freely.",
      blocked: "Guarded, grieving, resentful, hard to trust", crystal: "Rose quartz · green aventurine · malachite", oil: "Rose · bergamot · geranium", pose: "Camel pose (Ustrasana)",
      vortex: "Boynton Canyon — the tender heart of the red rocks." },
    { k: "throat", n: "Throat", sa: "Vishuddha", loc: "The throat", col: "#3aa0d8", el: "Ether / Sound", bija: "HAM", hz: 741, note: "F♯", petals: 16, pos: 33,
      gov: "Truth, expression, your voice", bal: "Honest, clear, heard", aff: "I speak my truth with ease.",
      blocked: "Held back, unheard, throat tension, fear of speaking up", crystal: "Lapis lazuli · aquamarine · blue lace agate", oil: "Eucalyptus · peppermint · chamomile", pose: "Fish pose (Matsyasana)",
      vortex: "Sing along on 106.5 — your voice carries across the canyon." },
    { k: "brow", n: "Third Eye", sa: "Ajna", loc: "Between the brows", col: "#3d5aa8", el: "Light", bija: "OM", hz: 852, note: "A", petals: 2, pos: 20,
      gov: "Intuition, insight, imagination", bal: "Perceptive, focused, trusting your knowing", aff: "I trust my inner knowing.",
      blocked: "Foggy, doubtful, over-thinking, cut off from intuition", crystal: "Amethyst · lapis lazuli · fluorite", oil: "Clary sage · frankincense · juniper", pose: "Child's pose (Balasana)",
      vortex: "Cathedral Rock — the seer's vortex, where the veil goes thin." },
    { k: "crown", n: "Crown", sa: "Sahasrara", loc: "Top of the head", col: "#9b5fc0", el: "Thought / Cosmos", bija: "silence · OM", hz: 963, note: "B", petals: 1000, pos: 7,
      gov: "Connection, transcendence, the infinite", bal: "Awake, unified, part of something vast", aff: "I am one with all that is.",
      blocked: "Cynical, isolated, spiritually flat, stuck in the head", crystal: "Clear quartz · selenite · amethyst", oil: "Frankincense · lotus · myrrh", pose: "Corpse pose (Savasana)",
      vortex: "The dark sky over Sedona — dissolve up into the Milky Way." }
  ];
  // Each chakra drawn as its REAL traditional yantra, poster-grade:
  // correct petal counts and classical geometry (Muladhara's square +
  // downward triangle, Svadhisthana's crescent, Anahata's six-pointed
  // star, Ajna's two wings, Sahasrara's layered thousand petals), with
  // luminous two-tone petals in counter-rotating layers, gold beadwork,
  // a glowing center plate and the Devanagari seed syllable.
  function chkShade(hex, amt) {   // amt >0 toward white, <0 toward black
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, t = amt > 0 ? 255 : 0, p = Math.abs(amt);
    function m(x) { return Math.round(x + (t - x) * p); }
    return "rgb(" + m(r) + "," + m(g) + "," + m(b) + ")";
  }
  function lotusSVG(c) {
    var col = c.col, k = c.k, uid = "chg-" + k;
    var DEV = { root: "लं", sacral: "वं", solar: "रं", heart: "यं", throat: "हं", brow: "ॐ", crown: "ॐ" };
    var GOLD = "#f2d791", goldSoft = "rgba(242,215,145,.75)";
    function pt(ang, rr) { return (50 + Math.cos(ang) * rr).toFixed(1) + "," + (50 + Math.sin(ang) * rr).toFixed(1); }
    function petal(r1, r2, wDeg, aDeg, fill, op, sw) {
      var a = aDeg * Math.PI / 180, w = wDeg * Math.PI / 180, mid = (r1 + r2) / 2;
      return '<path d="M' + pt(a - w, r1) + ' Q' + pt(a - w * 1.26, mid) + ' ' + pt(a, r2) +
        ' Q' + pt(a + w * 1.26, mid) + ' ' + pt(a + w, r1) + ' Z" fill="' + fill + '" fill-opacity="' + op +
        '" stroke="' + goldSoft + '" stroke-width="' + (sw || 0.8) + '" stroke-linejoin="round"/>';
    }
    function ring(n, r1, r2, off, fill, op, sw) {
      var out = "", w = 360 / n / 2 * 0.78;
      for (var i = 0; i < n; i++) out += petal(r1, r2, w, (off || 0) + i * 360 / n - 90, fill, op, sw);
      return out;
    }
    function beads(n, r) {
      var out = "";
      for (var i = 0; i < n; i++) { var a = (i * 360 / n - 90) * Math.PI / 180; out += '<circle cx="' + (50 + Math.cos(a) * r).toFixed(1) + '" cy="' + (50 + Math.sin(a) * r).toFixed(1) + '" r="0.9" fill="' + GOLD + '" fill-opacity=".8"/>'; }
      return out;
    }
    function tri(r, down, op) {
      var pts = [], start = down ? 90 : -90;
      for (var i = 0; i < 3; i++) { var a = (start + i * 120) * Math.PI / 180; pts.push(pt(a, r)); }
      return '<polygon points="' + pts.join(" ") + '" fill="url(#' + uid + '-geo)" fill-opacity="' + (op != null ? op : 1) + '" stroke="' + GOLD + '" stroke-width="1.3" stroke-linejoin="round" filter="url(#' + uid + '-glow)"/>';
    }
    var geo = "";
    if (k === "root") geo = '<rect x="37.5" y="37.5" width="25" height="25" fill="url(#' + uid + '-geo)" stroke="' + GOLD + '" stroke-width="1.2" filter="url(#' + uid + '-glow)"/>' + tri(10.5, true, 1);
    else if (k === "sacral") geo = '<circle cx="50" cy="50" r="15.5" fill="url(#' + uid + '-geo)" stroke="' + GOLD + '" stroke-width="1.2" filter="url(#' + uid + '-glow)"/><path d="M37.5,55 A14.5,14.5 0 0,0 62.5,55 A11.2,11.2 0 0,1 37.5,55 Z" fill="#fdfdff" fill-opacity=".9" filter="url(#' + uid + '-glow)"/>';
    else if (k === "solar") geo = tri(15.5, true);
    else if (k === "heart") geo = tri(15.5, true) + tri(15.5, false);
    else if (k === "throat") geo = tri(16, true) + '<circle cx="50" cy="50" r="9" fill="#fdfdff" fill-opacity=".2" stroke="' + GOLD + '" stroke-width="1" filter="url(#' + uid + '-glow)"/>';
    else if (k === "brow") geo = tri(14.5, true);
    else if (k === "crown") geo = '<circle cx="50" cy="50" r="11" fill="url(#' + uid + '-geo)" stroke="' + GOLD + '" stroke-width="1.2" filter="url(#' + uid + '-glow)"/>';
    var lit = "url(#" + uid + "-pet)", deep = chkShade(col, -0.28);
    var outer, inner;
    if (k === "brow") {   // Ajna's two great wings, layered
      outer = petal(18, 48, 26, 180, lit, 0.95, 1) + petal(18, 48, 26, 0, lit, 0.95, 1);
      inner = petal(20, 40, 18, 180, deep, 0.9) + petal(20, 40, 18, 0, deep, 0.9);
    } else if (k === "crown") {
      outer = ring(22, 30, 48.5, 0, lit, 0.95, 0.7);
      inner = ring(18, 27, 40, 8, deep, 0.85, 0.6) + ring(14, 26, 33, 4, chkShade(col, 0.25), 0.75, 0.5);
    } else {
      var n = { root: 4, sacral: 6, solar: 10, heart: 12, throat: 16 }[k];
      outer = ring(n, 28, 48.5, 0, lit, 0.97, 1);
      inner = ring(n, 27, 39, 180 / n, deep, 0.9, 0.7);
    }
    return '<svg viewBox="0 0 100 100" class="chk-lotus" aria-hidden="true">' +
      '<defs>' +
        '<radialGradient id="' + uid + '-halo"><stop offset="0%" stop-color="' + col + '" stop-opacity=".55"/><stop offset="62%" stop-color="' + col + '" stop-opacity=".18"/><stop offset="100%" stop-color="' + col + '" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="' + uid + '-pet"><stop offset="30%" stop-color="' + chkShade(col, -0.18) + '"/><stop offset="72%" stop-color="' + col + '"/><stop offset="100%" stop-color="' + chkShade(col, 0.42) + '"/></radialGradient>' +
        '<radialGradient id="' + uid + '-geo"><stop offset="0%" stop-color="' + chkShade(col, 0.5) + '" stop-opacity=".5"/><stop offset="100%" stop-color="' + col + '" stop-opacity=".32"/></radialGradient>' +
        '<radialGradient id="' + uid + '-plate"><stop offset="0%" stop-color="#1c2450"/><stop offset="78%" stop-color="#0e1330"/><stop offset="100%" stop-color="#0a0e22"/></radialGradient>' +
        '<filter id="' + uid + '-glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '</defs>' +
      '<circle cx="50" cy="50" r="49.5" fill="url(#' + uid + '-halo)"/>' +
      '<circle cx="50" cy="50" r="48.8" fill="none" stroke="' + col + '" stroke-opacity=".38" stroke-width="0.7"/>' +
      '<g class="chk-ring2">' + inner + '</g>' +
      '<g class="chk-ring">' + outer + '</g>' +
      '<circle cx="50" cy="50" r="26" fill="url(#' + uid + '-plate)" stroke="' + GOLD + '" stroke-opacity=".85" stroke-width="1.1"/>' +
      '<circle cx="50" cy="50" r="23.6" fill="none" stroke="' + goldSoft + '" stroke-width="0.5"/>' +
      beads(Math.max(12, ({ root: 4, sacral: 6, solar: 10, heart: 12, throat: 16 }[k] || 16) * 2), 26) +
      geo +
      '<text x="50" y="51" text-anchor="middle" dominant-baseline="central" font-size="15" fill="#fff" font-family="serif" filter="url(#' + uid + '-glow)">' + (DEV[k] || "") + '</text>' +
      '</svg>';
  }
  // ---- live tone synthesis (Web Audio) ----
  var chkCtx = null, chkBus = null, chkMaster = null, chkCurrent = [], chkBathTimers = [], chkOnStep = null;
  function chkEnsure() {
    if (chkCtx) return chkCtx;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try {
      chkCtx = new C();
      chkMaster = chkCtx.createGain(); chkMaster.gain.value = 0.85;
      // a long, soft cathedral tail — the space the bowls ring in
      var rev = chkCtx.createConvolver(); rev.buffer = cxImpulse(chkCtx, 4.6, 2.6);
      var wet = chkCtx.createGain(); wet.gain.value = 0.45;
      var dry = chkCtx.createGain(); dry.gain.value = 0.72;
      chkBus = chkCtx.createGain();
      chkBus.connect(dry); dry.connect(chkMaster);
      chkBus.connect(rev); rev.connect(wet); wet.connect(chkMaster);
      chkMaster.connect(chkCtx.destination);
    } catch (e) { chkCtx = null; return null; }
    return chkCtx;
  }
  // One struck singing bowl: a soft mallet strike, then the fundamental
  // with slightly-detuned shimmer partials (the beating you hear in a real
  // bowl), a slow vibrato breathing through it, panned gently in space,
  // blooming in and ringing out long past its slot so voices overlap.
  function chkBowl(freq, when, dur, pan, level) {
    var ctx = chkEnsure(); if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    var t0 = ctx.currentTime + (when || 0), lv = level || 1;
    var out = ctx.createGain(); out.gain.value = 1;
    var pn = null;
    try { pn = ctx.createStereoPanner(); pn.pan.value = pan || 0; out.connect(pn); pn.connect(chkBus); }
    catch (e) { out.connect(chkBus); }
    // slow vibrato lives on all partials — the bowl "breathes"
    var lfo = ctx.createOscillator(); lfo.frequency.value = 0.14;
    var lg = ctx.createGain(); lg.gain.value = 3.2;   // cents of wow
    lfo.connect(lg); lfo.start(t0); lfo.stop(t0 + dur + 6.2);
    // partials: fundamental pair (detuned for beating) + soft overtones
    [[1, 0, 0.20], [1, 3.4, 0.16], [2.004, 0, 0.05], [2.996, 5, 0.022], [1.498, -4, 0.03]].forEach(function (v) {
      var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq * v[0]; o.detune.value = v[1];
      try { lg.connect(o.detune); } catch (e) {}
      var g = ctx.createGain();
      var peak = v[2] * lv;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 1.6);                       // slow bloom
      g.gain.exponentialRampToValueAtTime(peak * 0.5, t0 + dur);                 // gentle sing
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 5.8);               // long ring-out
      o.connect(g); g.connect(out);
      o.start(t0); o.stop(t0 + dur + 6);
      chkCurrent.push(o, g);
    });
    // the mallet: a brief bright partial that decays fast — the "strike"
    var s = ctx.createOscillator(); s.type = "sine"; s.frequency.value = freq * 5.19;
    var sg = ctx.createGain();
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.exponentialRampToValueAtTime(0.035 * lv, t0 + 0.06);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    s.connect(sg); sg.connect(out); s.start(t0); s.stop(t0 + 1.2);
    chkCurrent.push(s, sg, lfo, lg, out); if (pn) chkCurrent.push(pn);
  }
  function chkTone(freq, dur) { chkBowl(freq, 0, dur, 0, 1); }
  // the river under the bath — a barely-there earth drone (root, an octave
  // down) that fades in first, holds the whole journey, and settles last
  function chkDrone(when, hold) {
    var ctx = chkEnsure(); if (!ctx) return;
    var t0 = ctx.currentTime + when;
    [[0.5, "sine", 0.055], [0.5, "triangle", 0.018], [0.7495, "sine", 0.02]].forEach(function (v) {
      var o = ctx.createOscillator(); o.type = v[1]; o.frequency.value = CHAKRAS[0].hz * v[0];
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v[2], t0 + 4);
      g.gain.setValueAtTime(v[2], t0 + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + hold + 7);
      o.connect(g); g.connect(chkBus); o.start(t0); o.stop(t0 + hold + 7.2);
      chkCurrent.push(o, g);
    });
  }
  function chkStop() {
    chkBathTimers.forEach(function (id) { clearTimeout(id); }); chkBathTimers = [];
    if (!chkCtx) return;
    // snapshot + clear so a tone started right after this can't be killed by
    // the cleanup below (that race silenced every click after the first).
    var t = chkCtx.currentTime, nodes = chkCurrent; chkCurrent = [];
    nodes.forEach(function (nd) {
      try { if (nd.gain) { nd.gain.cancelScheduledValues(t); nd.gain.setValueAtTime(nd.gain.value, t); nd.gain.linearRampToValueAtTime(0.0001, t + 0.4); } } catch (e) {}
    });
    setTimeout(function () { nodes.forEach(function (nd) { try { if (nd.stop) nd.stop(); } catch (e) {} }); }, 450);
  }
  function chkBath() {
    chkStop();
    setTimeout(function () {
      var step = 7.5, n = CHAKRAS.length;                     // ~1 min root to crown
      chkDrone(0, n * step + 6);                              // the river runs the whole way
      CHAKRAS.forEach(function (c, i) {
        var pan = i === n - 1 ? 0 : (i % 2 ? 0.3 : -0.3);     // bowls placed around you; crown dead center
        var id = setTimeout(function () {
          if (chkOnStep) chkOnStep(i);
          chkBowl(c.hz, 0, step + 3.5, pan, 1);               // rings well into the next bowl's bloom
        }, (1.5 + i * step) * 1000);
        chkBathTimers.push(id);
      });
      // the close: root and crown sound together — grounded and open
      var closing = setTimeout(function () { chkBowl(CHAKRAS[0].hz, 0, 6, -0.15, 0.5); chkBowl(CHAKRAS[6].hz, 0.4, 6, 0.15, 0.6); }, (1.5 + n * step) * 1000);
      var done = setTimeout(function () { if (chkOnStep) chkOnStep(-1); }, (1.5 + n * step + 10) * 1000);
      chkBathTimers.push(closing, done);
    }, 500);
  }
  function chkFigureSVG() {
    return '<svg class="chk-figure" viewBox="0 0 200 480" preserveAspectRatio="xMidYMid meet" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="chkChan" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#9b5fc0"/><stop offset="20%" stop-color="#3d5aa8"/><stop offset="33%" stop-color="#3aa0d8"/>' +
          '<stop offset="48%" stop-color="#4fae58"/><stop offset="64%" stop-color="#f2c53d"/><stop offset="82%" stop-color="#f07a24"/><stop offset="100%" stop-color="#e0393f"/>' +
        '</linearGradient>' +
        '<radialGradient id="chkAura" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#9fb4ff" stop-opacity=".22"/><stop offset="100%" stop-color="#9fb4ff" stop-opacity="0"/></radialGradient>' +
      '</defs>' +
      '<path d="M100 18 C158 150 158 330 100 462 C42 330 42 150 100 18 Z" fill="url(#chkAura)"/>' +
      '<circle cx="100" cy="34" r="21" fill="#eaf0ff" fill-opacity=".08" stroke="#cdd9ff" stroke-opacity=".25" stroke-width="1.5"/>' +
      '<line x1="100" y1="34" x2="100" y2="458" stroke="url(#chkChan)" stroke-width="3.2" stroke-linecap="round" opacity=".55"/>' +
    '</svg>';
  }
  function initChakras() {
    var el = doc.querySelector("[data-chakras]");
    if (!el) { chkStop(); return; }   // left the page — silence any sound bath
    var sel = 3;   // heart, to start
    function detail(i) {
      var c = CHAKRAS[i];
      return '<div class="chk-detail-head">' + lotusSVG(c) +
          '<div><span class="chk-eyebrow" style="color:' + c.col + '">' + c.sa + '</span>' +
          '<h3>' + c.n + ' chakra</h3><span class="chk-loc">' + c.loc + '</span></div></div>' +
        '<p class="chk-aff" style="color:' + c.col + '">&ldquo;' + c.aff + '&rdquo;</p>' +
        '<div class="chk-stats">' +
          '<div><span>Element</span><b>' + c.el + '</b></div>' +
          '<div><span>Seed sound</span><b>' + c.bija + '</b></div>' +
          '<div><span>Frequency</span><b>' + c.hz + ' Hz</b></div>' +
          '<div><span>Petals</span><b>' + (c.petals === 1000 ? "1,000" : c.petals) + '</b></div>' +
        '</div>' +
        '<p class="chk-gov"><b>Governs:</b> ' + c.gov + '</p>' +
        '<p class="chk-gov"><b>In balance:</b> ' + c.bal + '</p>' +
        '<p class="chk-gov chk-blocked"><b>Out of balance:</b> ' + c.blocked + '</p>' +
        '<div class="chk-corr">' +
          '<div><span>💎 Crystals</span><b>' + c.crystal + '</b></div>' +
          '<div><span>🌿 Oils</span><b>' + c.oil + '</b></div>' +
          '<div><span>🧘 Pose</span><b>' + c.pose + '</b></div>' +
        '</div>' +
        '<p class="chk-vortex">📍 <b>Sedona:</b> ' + c.vortex + '</p>' +
        '<div class="chk-play-row"><button class="btn btn-primary chk-play" data-chk-play>▸ Sound the ' + c.n + ' tone &middot; ' + c.hz + ' Hz</button></div>';
    }
    var orbs = CHAKRAS.map(function (c, i) {
      return '<button class="chk-orb" data-chk="' + i + '" style="--cc:' + c.col + '; top:' + c.pos + '%" aria-label="' + c.n + ' chakra, ' + c.hz + ' hertz">' +
        '<span class="chk-orb-core"></span>' + lotusSVG(c) +
        '<span class="chk-orb-lab"><b>' + c.n + '</b><span>' + c.hz + ' Hz &middot; ' + c.bija + '</span></span></button>';
    }).join("");
    el.innerHTML =
      '<div class="chk-wrap">' +
        '<div class="chk-stage" data-chk-stage>' + chkFigureSVG() + orbs + '</div>' +
        '<div class="chk-detail" data-chk-detail>' + detail(sel) + '</div>' +
      '</div>' +
      '<div class="chk-controls"><button class="btn btn-primary chk-bath" data-chk-bath>🧘 Enter the sound bath &middot; root to crown</button>' +
        '<button class="btn btn-secondary chk-stop" data-chk-stop>◼ Stop</button>' +
        '<span class="chk-note">Real tones synthesized live in your browser — headphones and a quiet room recommended.</span></div>' +
      // immersive overlay
      '<div class="chk-imm" data-chk-imm hidden><div class="chk-imm-veil"></div>' +
        '<button class="chk-imm-x" data-imm-x aria-label="Close">&times;</button>' +
        '<div class="chk-imm-inner">' +
          '<div class="chk-breath" data-breath><span class="chk-breath-ring"></span><span class="chk-breath-orb"></span><span class="chk-breath-txt" data-breath-txt>Settle in</span></div>' +
          '<div class="chk-imm-dots" data-imm-dots>' + CHAKRAS.map(function (c, i) { return '<i style="--cc:' + c.col + '" data-d="' + i + '"></i>'; }).join("") + '</div>' +
          '<div class="chk-imm-name" data-imm-name></div>' +
          '<div class="chk-imm-aff" data-imm-aff></div>' +
          '<div class="chk-imm-hz" data-imm-hz></div>' +
        '</div>' +
      '</div>';
    var stage = el.querySelector("[data-chk-stage]"), det = el.querySelector("[data-chk-detail]");
    var imm = el.querySelector("[data-chk-imm]"), breathTxt = imm.querySelector("[data-breath-txt]");
    var orbEls = stage.querySelectorAll(".chk-orb"), dots = imm.querySelectorAll("[data-imm-dots] i");
    var breathTimer = null;
    function setActive(i) { orbEls.forEach(function (o) { o.classList.toggle("is-active", +o.getAttribute("data-chk") === i); }); }
    function setSounding(i) { orbEls.forEach(function (o) { o.classList.toggle("sounding", +o.getAttribute("data-chk") === i); }); }
    function immSet(i) {
      var c = CHAKRAS[i];
      imm.style.setProperty("--cc", c.col);
      imm.querySelector("[data-imm-name]").innerHTML = '<span style="color:' + c.col + '">' + c.sa + '</span>' + c.n + ' &middot; ' + c.loc;
      imm.querySelector("[data-imm-aff]").textContent = "“" + c.aff + "”";
      imm.querySelector("[data-imm-hz]").textContent = c.hz + " Hz · seed sound " + c.bija;
      dots.forEach(function (d) { d.classList.toggle("on", +d.getAttribute("data-d") <= i); d.classList.toggle("cur", +d.getAttribute("data-d") === i); });
    }
    function openImm() {
      imm.hidden = false; doc.body.classList.add("chk-imm-open");
      var phases = ["Breathe in…", "Hold", "Breathe out…", "Hold"], k = 0;
      breathTxt.textContent = "Settle in…";
      clearInterval(breathTimer);
      breathTimer = setInterval(function () { breathTxt.textContent = phases[k % 4]; k++; }, 3800);
    }
    function closeImm() { clearInterval(breathTimer); breathTimer = null; imm.hidden = true; doc.body.classList.remove("chk-imm-open"); }
    function select(i, play) {
      sel = i; det.innerHTML = detail(i); setActive(i);
      det.querySelector("[data-chk-play]").addEventListener("click", function () { playOne(i); });
      if (play) playOne(i);
    }
    function playOne(i) {
      chkStop(); setActive(i);
      setTimeout(function () { setSounding(i); chkTone(CHAKRAS[i].hz, 6); }, 180);
      setTimeout(function () { setSounding(-1); }, 6400);
    }
    chkOnStep = function (i) {
      if (i < 0) {   // bath complete
        setSounding(-1); clearInterval(breathTimer); breathTimer = null;
        if (!imm.hidden) { breathTxt.textContent = "Rest here."; imm.querySelector("[data-imm-name]").innerHTML = '<span>Complete</span>carry it with you'; imm.querySelector("[data-imm-aff]").textContent = ""; imm.querySelector("[data-imm-hz]").textContent = "✦"; }
        return;
      }
      setActive(i); setSounding(i);
      if (!imm.hidden) immSet(i);
    };
    orbEls.forEach(function (o) { o.addEventListener("click", function () { select(+o.getAttribute("data-chk"), true); }); });
    select(sel, false);
    el.querySelector("[data-chk-bath]").addEventListener("click", function () { immSet(0); openImm(); chkBath(); });
    el.querySelector("[data-chk-stop]").addEventListener("click", function () { chkStop(); setSounding(-1); closeImm(); });
    imm.querySelector("[data-imm-x]").addEventListener("click", function () { chkStop(); setSounding(-1); closeImm(); });
  }

  /* =========================================================
     TAROT — the full 78-card deck, nothing canned. All 22 Major Arcana
     and all 56 Minors with their traditional Rider–Waite upright AND
     reversed meanings. A deterministic "card of the day over Sedona"
     (same card for every listener all day), plus real spreads: a
     crypto-shuffled single draw and a three-card past/present/future,
     dealt face-down and flipped by hand. Reversed cards render inverted.
     ========================================================= */
  // name, glyph, upright, reversed, Golden Dawn correspondence (real attributions)
  var TAROT_MAJORS = [
    ["The Fool", "🌄", "a leap of faith, fresh starts, innocence", "recklessness, cold feet, a start delayed", "Air"],
    ["The Magician", "✨", "manifestation, skill, as above so below", "untapped talent, trickery, scattered will", "Mercury ☿"],
    ["The High Priestess", "🔮", "intuition, the inner voice, mystery", "secrets kept from you, ignoring your gut", "Moon ☽"],
    ["The Empress", "🌹", "abundance, nurture, creation in bloom", "creative block, smothering, self-neglect", "Venus ♀"],
    ["The Emperor", "🏛", "structure, authority, solid foundations", "rigidity, control, a challenge to power", "Aries ♈"],
    ["The Hierophant", "🗝", "tradition, teachers, spiritual guidance", "breaking convention, dogma, your own path", "Taurus ♉"],
    ["The Lovers", "💞", "union, alignment, a choice of the heart", "disharmony, imbalance, values at odds", "Gemini ♊"],
    ["The Chariot", "🏆", "willpower, momentum, hard-won victory", "scattered force, stalling, losing the reins", "Cancer ♋"],
    ["Strength", "🦁", "quiet courage, gentle power, patience", "self-doubt, raw nerves, forcing it", "Leo ♌"],
    ["The Hermit", "🏮", "introspection, seeking, the inner lamp", "isolation, withdrawal, lost in the cave", "Virgo ♍"],
    ["Wheel of Fortune", "☸", "cycles turning, luck, a pivotal moment", "resisting change, a rough turn, delays", "Jupiter ♃"],
    ["Justice", "⚖", "truth, fairness, cause and effect", "imbalance, avoidance, unfair dealings", "Libra ♎"],
    ["The Hanged Man", "🙃", "surrender, a new angle, sacred pause", "stalling, martyrdom, sacrifice in vain", "Water"],
    ["Death", "🦋", "endings that free you, transformation", "clinging to what's done, stagnation", "Scorpio ♏"],
    ["Temperance", "🕊", "balance, blending, the middle way", "excess, impatience, forces out of mix", "Sagittarius ♐"],
    ["The Devil", "⛓", "attachment, shadow work, the tether seen", "release, reclaiming power, chains loosening", "Capricorn ♑"],
    ["The Tower", "🌩", "sudden truth, upheaval that clears", "disaster averted, fear of the shake-up", "Mars ♂"],
    ["The Star", "⭐", "hope, healing, quiet renewal", "dimmed faith, doubt, refill the well", "Aquarius ♒"],
    ["The Moon", "🌙", "dreams, the unknown, trust the tide", "confusion lifting, fear losing its grip", "Pisces ♓"],
    ["The Sun", "☀", "joy, vitality, everything illuminated", "clouded optimism, small delays, look up", "Sun ☉"],
    ["Judgement", "📯", "awakening, the call, rising renewed", "self-doubt, ignoring the call, harsh review", "Fire"],
    ["The World", "🌍", "completion, wholeness, the circle closed", "loose ends, almost there, close the loop", "Saturn ♄"]
  ];
  var TAROT_SUITS = [
    { s: "Wands", g: "🔥", el: "Fire · will & creativity",
      up: ["a spark of pure inspiration", "planning, the world in your hand", "expansion, ships coming in", "celebration, homecoming, stable joy", "friction, creative competition", "victory, public recognition", "defending your ground", "swift movement, news in flight", "resilience, the last push", "a heavy load nearly carried home", "an eager message, curiosity lit", "bold pursuit, adventure at speed", "warm confidence, magnetic energy", "visionary leadership, the long view"],
      rev: ["a spark delayed, false starts", "fear of the leap, small plans", "obstacles, watch the horizon", "shaky ground, celebrate later", "conflict avoided or gone sour", "a fall from favor, ego's cost", "worn down, ground given", "delays, crossed signals", "paranoia, guard too high", "burnout, put something down", "bad news, a message astray", "haste, a scattered chase", "jealousy, warmth withdrawn", "tyranny, vision without care"] },
    { s: "Cups", g: "💧", el: "Water · heart & feeling",
      up: ["new love, the heart overflows", "partnership, mutual attraction", "friendship, celebration shared", "apathy, a gift unnoticed", "grief, spilled cups — two remain", "nostalgia, kindness returned", "choices, dreams and illusions", "walking away toward deeper meaning", "contentment, the wish fulfilled", "lasting happiness, family harmony", "a tender message, imagination", "romance, the offer of the heart", "compassion, emotional depth", "calm mastery of the heart"],
      rev: ["a blocked heart, self-love first", "a bond strained, imbalance", "overindulgence, the third wheel", "waking up, new appetite", "acceptance, moving through grief", "stuck in the past, come home to now", "clarity cutting through fog", "one more try, fear of change", "smugness, hollow satisfaction", "discord at home, a dream deferred", "creative block, moody waters", "moodiness, a flatterer", "emotions overflowing their banks", "manipulation, the cold current"] },
    { s: "Swords", g: "🗡", el: "Air · mind & truth",
      up: ["breakthrough, clarity's blade", "a stalemate, eyes covered", "heartbreak that tells the truth", "rest, recovery, quiet the mind", "a hollow win, count the cost", "transition, calmer waters ahead", "strategy, moving quietly", "restriction that is mostly mental", "anxiety in the small hours", "an ending, rock bottom's gift", "hunger for ideas, watchfulness", "charging thought, the direct route", "sharp perception, independent mind", "intellectual command, hard truth"],
      rev: ["fog, a truth resisted", "the blindfold slips, decision due", "healing begins, forgiveness", "restlessness, burnout warning", "make amends, an old grudge", "carrying baggage, rough water", "conscience calls, come clean", "self-imposed limits released", "the dread was worse than the day", "recovery, the worst is behind", "gossip, all talk", "recklessness, slow the charge", "coldness, the edge overused", "cruelty, abuse of the mind's power"] },
    { s: "Pentacles", g: "🪙", el: "Earth · body & work",
      up: ["a seed of prosperity, opportunity", "juggling, graceful balance", "teamwork, craft recognized", "holding on, security kept close", "hard times, help nearby unseen", "generosity, giving and receiving", "patience, the long investment", "apprenticeship, devoted craft", "earned luxury, self-sufficiency", "legacy, lasting wealth, roots", "a student's spark, good news of work", "steady effort, the reliable path", "practical warmth, the nurturing home", "abundance mastered, the good steward"],
      rev: ["an opportunity missed, greed", "dropped balls, overcommitment", "mediocrity, credit taken", "letting go, generosity opens", "recovery, the door was open", "strings attached, debt's weight", "impatience, effort misplaced", "cut corners, half-hearted work", "overwork, hollow success", "a windfall with strings, family friction", "procrastination, a lesson unheeded", "boredom, stuck in a rut", "self-care neglected, clutter", "hoarding, worth measured wrong"] }
  ];
  var TAROT_RANKS = ["Ace", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Page", "Knight", "Queen", "King"];
  var TAROT_NUM = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  function tarotDeck() {
    // img: the original 1909 Rider–Waite paintings by Pamela Colman Smith
    // (public domain), served from /tarot/.
    var d = TAROT_MAJORS.map(function (m, i) {
      return { name: m[0], g: m[1], up: m[2], rev: m[3], astro: m[4], tag: TAROT_NUM[i] + " · Major Arcana", major: true,
        img: "tarot/m" + (i < 10 ? "0" : "") + i + ".jpg" };
    });
    TAROT_SUITS.forEach(function (su) {
      var sl = { Wands: "w", Cups: "c", Swords: "s", Pentacles: "p" }[su.s];
      TAROT_RANKS.forEach(function (r, ri) {
        d.push({ name: r + " of " + su.s, g: su.g, up: su.up[ri], rev: su.rev[ri], astro: "", tag: su.el, major: false,
          img: "tarot/" + sl + (ri < 9 ? "0" : "") + (ri + 1) + ".jpg" });
      });
    });
    return d;   // 22 + 56 = 78
  }
  function tarotCardHTML(card, reversed, label, faceUp) {
    return '<div class="tc' + (faceUp ? " is-flipped" : "") + (reversed ? " is-rev" : "") + '" tabindex="0" role="button" aria-label="' + esc(label ? label + " card" : card.name) + '">' +
      '<div class="tc-inner">' +
        '<div class="tc-back"><i></i>' +
          '<img class="tc-back-logo" src="White%20logo%20-%20no%20background.svg" alt="" loading="lazy" />' +
        '</div>' +
        '<div class="tc-face"><div class="tc-face-in">' +
          '<img class="tc-img" src="' + card.img + '" alt="" loading="lazy" />' +
          '<span class="tc-name">' + esc(card.name) +
            (card.astro ? ' <i class="tc-astro">' + esc(card.astro) + '</i>' : '') + '</span>' +
          (reversed ? '<span class="tc-revb">reversed</span>' : '') +
        '</div></div>' +
      '</div>' +
      (label ? '<span class="tc-pos">' + esc(label) + '</span>' : '') +
    '</div>';
  }
  function tarotMeaning(card, reversed) {
    return '<b>' + esc(card.name) + (reversed ? ' (reversed)' : '') + '</b> — ' + esc(reversed ? card.rev : card.up) + '.';
  }
  function tarotRandom(n) {   // crypto-shuffled draw of n distinct cards + orientations
    var deck = tarotDeck(), out = [], buf = new Uint32Array(n * 2);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(buf) : buf.forEach(function (_, i) { buf[i] = Math.floor(Math.random() * 4294967296); });
    for (var i = 0; i < n; i++) {
      var idx = buf[i * 2] % deck.length;
      out.push({ card: deck.splice(idx, 1)[0], rev: buf[i * 2 + 1] % 100 < 30 });   // ~30% reversed, tradition-adjacent
    }
    return out;
  }
  // the Celtic Cross — the classic ten positions, in the traditional order
  var TAROT_CELTIC = [
    ["The heart of it", "the situation as it truly is"],
    ["What crosses it", "the force helping or opposing you"],
    ["The root", "what lies beneath — the foundation"],
    ["The recent past", "what is already passing away"],
    ["The crown", "the best that can come of this"],
    ["The near future", "what approaches next"],
    ["Yourself", "how you stand within it"],
    ["Your surroundings", "the people and currents around you"],
    ["Hopes & fears", "what you long for — and dread"],
    ["The outcome", "where it resolves if the course holds"]
  ];
  var TAROT_JKEY = "kazm-tarot-journal";
  function tarotJournal() { try { return JSON.parse(localStorage.getItem(TAROT_JKEY) || "[]"); } catch (e) { return []; } }
  function initTarot() {
    var el = doc.querySelector("[data-tarot]"); if (!el) return;
    var deck = tarotDeck();
    // card of the day — seeded by the date, same for every listener all day
    var day = Math.floor((Date.now() / 86400000 + (-7 / 24)));   // Sedona's day, MST
    var h = day * 2654435761 % 4294967296; h = (h ^ (h >>> 13)) >>> 0;
    var cod = deck[h % 78], codRev = (h >>> 8) % 100 < 20;
    el.innerHTML =
      '<div class="tarot-day">' +
        '<div class="tarot-day-card">' + tarotCardHTML(cod, codRev, "", true) + '</div>' +
        '<div class="tarot-day-info"><span class="tarot-eyebrow">Card of the day over Sedona</span>' +
          '<h3>' + esc(cod.name) + (codRev ? ' <span class="tarot-revtag">reversed</span>' : '') + '</h3>' +
          '<p>' + esc(codRev ? cod.rev : cod.up).replace(/^./, function (c) { return c.toUpperCase(); }) + '.</p>' +
          '<p class="tarot-day-note">One card for the whole canyon — it turns at midnight and everyone listening sees the same one. Tomorrow brings the next.</p></div>' +
      '</div>' +
      '<div class="tarot-pull">' +
        '<div class="tarot-pull-head"><h3>Pull your own</h3><p>Take a breath, hold your question, and draw. Tap each card to turn it over.</p></div>' +
        '<div class="tarot-btns">' +
          '<button class="btn btn-primary" data-tar-one>🂠 One card</button>' +
          '<button class="btn btn-secondary" data-tar-three>Past &middot; Present &middot; Future</button>' +
          '<button class="btn btn-secondary" data-tar-celtic>✚ Celtic Cross &middot; 10 cards</button>' +
        '</div>' +
        '<div class="tarot-table" data-tar-table></div>' +
        '<div class="tarot-read" data-tar-read></div>' +
        '<div class="tarot-actions" data-tar-actions hidden>' +
          '<button class="btn btn-secondary" data-tar-copy>⧉ Copy this reading</button>' +
          '<span class="tarot-saved-note">Saved to your reading journal below — kept only on this device.</span>' +
        '</div>' +
      '</div>' +
      '<div class="tarot-lib">' +
        '<div class="tarot-pull-head"><h3>The whole deck</h3><p>Seventy-eight cards asleep in the stack. Spread them to study any card &mdash; upright and reversed.</p></div>' +
        '<div class="tlib-deckwrap" data-tlib-deckwrap>' +
          '<button class="tlib-deck" data-tlib-deck aria-expanded="false" aria-label="Spread the deck to browse all 78 cards">' +
            '<span class="tlib-deckcard"><i></i><img src="White%20logo%20-%20no%20background.svg" alt="" loading="lazy" /></span>'.repeat(5) +
          '</button>' +
          '<span class="tlib-deck-lab">✦ tap the deck to spread all 78 ✦</span>' +
        '</div>' +
        '<div class="tlib-body" data-tlib-body hidden>' +
          '<div class="tlib-chips" data-tlib-chips></div>' +
          '<div class="tlib-detail" data-tlib-detail hidden></div>' +
          '<div class="tlib-grid" data-tlib-grid></div>' +
          '<div class="tlib-gather"><button class="btn btn-secondary" data-tlib-gather>🂠 Gather the deck</button></div>' +
        '</div>' +
      '</div>' +
      '<div class="tarot-journal" data-tar-journal></div>';
    var table = el.querySelector("[data-tar-table]"), read = el.querySelector("[data-tar-read]"),
        actions = el.querySelector("[data-tar-actions]"), journalBox = el.querySelector("[data-tar-journal]");
    var currentSpread = "", currentLines = [];
    function saveReading() {
      var j = tarotJournal();
      j.unshift({ t: Date.now(), spread: currentSpread, lines: currentLines.slice() });
      if (j.length > 12) j = j.slice(0, 12);
      try { localStorage.setItem(TAROT_JKEY, JSON.stringify(j)); } catch (e) {}
      renderJournal();
    }
    function renderJournal() {
      var j = tarotJournal();
      if (!j.length) { journalBox.innerHTML = ""; return; }
      journalBox.innerHTML =
        '<div class="tarot-pull-head tj-head"><h3>Your reading journal</h3>' +
          '<button class="btn btn-secondary tj-clear" data-tj-clear>Clear</button></div>' +
        '<p class="tj-note">Kept in your browser only &mdash; nobody else can see these, not even us.</p>' +
        j.map(function (r) {
          var d = new Date(r.t);
          return '<div class="tj-entry"><span class="tj-when">' + esc(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " · " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })) + ' &middot; ' + esc(r.spread) + '</span>' +
            r.lines.map(function (l) { return '<p class="tarot-line">' + l + '</p>'; }).join("") + '</div>';
        }).join("");
      var cb = journalBox.querySelector("[data-tj-clear]");
      if (cb) cb.addEventListener("click", function () { try { localStorage.removeItem(TAROT_JKEY); } catch (e) {} renderJournal(); });
    }
    function deal(kind) {
      var labels, n;
      if (kind === "celtic") { labels = TAROT_CELTIC.map(function (p) { return p[0]; }); n = 10; }
      else if (kind === "three") { labels = ["Past", "Present", "Future"]; n = 3; }
      else { labels = [""]; n = 1; }
      currentSpread = kind === "celtic" ? "Celtic Cross" : kind === "three" ? "Past · Present · Future" : "One card";
      currentLines = []; actions.hidden = true;
      var draws = tarotRandom(n), flippedCount = 0;
      table.className = "tarot-table" + (kind === "celtic" ? " tarot-table--celtic" : "");
      table.innerHTML = draws.map(function (d, i) {
        // the crossing card (position 2) lies across position 1 — same grid cell, rotated
        var area = i === 1 ? "p1" : "p" + (i + 1);
        var pos = kind === "celtic" ? ' style="grid-area:' + area + '"' : "";
        return '<div class="tc-slot"' + pos + (i === 1 && kind === "celtic" ? ' data-cross="1"' : '') + '>' + tarotCardHTML(d.card, d.rev, labels[i], false) + '</div>';
      }).join("");
      read.innerHTML = "";
      var slots = table.querySelectorAll(".tc-slot");
      slots.forEach(function (s, i) { setTimeout(function () { s.classList.add("is-dealt"); }, 90 + i * 130); });   // the deal, card by card
      // the crossing card lies over the heart — it waits (clicks pass through)
      // until the heart is turned, the traditional order anyway
      var crossTC = table.querySelector('[data-cross] .tc');
      if (crossTC) crossTC.classList.add("tc--waiting");
      table.querySelectorAll(".tc").forEach(function (tc, i) {
        function flip() {
          if (tc.classList.contains("is-flipped") || tc.classList.contains("tc--waiting")) return;
          tc.classList.add("is-flipped");
          var line = (labels[i] ? '<span class="tarot-pos-tag">' + esc(labels[i]) + '</span>' : '') +
            (kind === "celtic" ? '<span class="tj-posnote">' + esc(TAROT_CELTIC[i][1]) + ' &middot; </span>' : '') +
            tarotMeaning(draws[i].card, draws[i].rev);
          currentLines.push(line);
          var p = doc.createElement("p"); p.className = "tarot-line"; p.innerHTML = line;
          read.appendChild(p);
          if (i === 0 && crossTC) crossTC.classList.remove("tc--waiting");   // heart turned — the cross may follow
          if (++flippedCount === n) { actions.hidden = false; saveReading(); }
        }
        tc.addEventListener("click", flip);
        tc.addEventListener("keydown", function (ev) { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); flip(); } });
      });
    }
    el.querySelector("[data-tar-one]").addEventListener("click", function () { deal("one"); });
    el.querySelector("[data-tar-three]").addEventListener("click", function () { deal("three"); });
    el.querySelector("[data-tar-celtic]").addEventListener("click", function () { deal("celtic"); });
    el.querySelector("[data-tar-copy]").addEventListener("click", function () {
      var txt = "KAZM Tarot · " + currentSpread + " · " + new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) + "\n" +
        currentLines.map(function (l) { var d = doc.createElement("div"); d.innerHTML = l; return "• " + d.textContent; }).join("\n") +
        "\n— drawn at mellowmountainradio.com";
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(function () {
        var b = el.querySelector("[data-tar-copy]"); b.textContent = "✓ Copied"; setTimeout(function () { b.innerHTML = "⧉ Copy this reading"; }, 1600);
      });
    });
    // ---- the whole deck, open for study ----
    var chips = el.querySelector("[data-tlib-chips]"), grid = el.querySelector("[data-tlib-grid]"), detail = el.querySelector("[data-tlib-detail]");
    var FILTERS = [["all", "All 78"], ["major", "Major Arcana"], ["Wands", "🔥 Wands"], ["Cups", "💧 Cups"], ["Swords", "🗡 Swords"], ["Pentacles", "🪙 Pentacles"]];
    chips.innerHTML = FILTERS.map(function (f, i) { return '<button class="chip' + (i === 0 ? ' is-active' : '') + '" data-f="' + f[0] + '">' + f[1] + '</button>'; }).join("");
    function libMatch(c, f) { return f === "all" || (f === "major" ? c.major : c.name.indexOf(" of " + f) > -1); }
    function renderLib(f) {
      grid.innerHTML = deck.map(function (c, i) {
        if (!libMatch(c, f)) return "";
        return '<button class="tlib-card" data-i="' + i + '"><img class="tlib-img" src="' + c.img + '" alt="" loading="lazy" /><span class="tlib-n">' + esc(c.name) + '</span></button>';
      }).join("");
      var cards = grid.querySelectorAll(".tlib-card");
      // the deal: cards ripple onto the table one after another
      cards.forEach(function (cd, i) { cd.style.transitionDelay = Math.min(i * 13, 850) + "ms"; });
      requestAnimationFrame(function () { requestAnimationFrame(function () {
        cards.forEach(function (cd) { cd.classList.add("is-in"); });
        setTimeout(function () { cards.forEach(function (cd) { cd.style.transitionDelay = "0ms"; }); }, 1400);   // hovers snap after the deal
      }); });
      cards.forEach(function (b) {
        b.addEventListener("click", function () {
          var c = deck[+b.getAttribute("data-i")];
          grid.querySelectorAll(".tlib-card").forEach(function (x) { x.classList.remove("is-active"); });
          b.classList.add("is-active");
          detail.hidden = false;
          detail.innerHTML = '<img class="tlib-d-img" src="' + c.img + '" alt="' + esc(c.name) + ' — Rider-Waite tarot card" />' + '<div>' +
            '<span class="tc-tag">' + esc(c.tag) + (c.astro ? ' &middot; ' + esc(c.astro) : '') + '</span>' +
            '<h4>' + esc(c.name) + '</h4>' +
            '<p><b>Upright:</b> ' + esc(c.up) + '.</p><p><b>Reversed:</b> ' + esc(c.rev) + '.</p></div>';
          detail.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      });
    }
    chips.querySelectorAll(".chip").forEach(function (ch) {
      ch.addEventListener("click", function () {
        chips.querySelectorAll(".chip").forEach(function (x) { x.classList.remove("is-active"); });
        ch.classList.add("is-active"); detail.hidden = true; renderLib(ch.getAttribute("data-f"));
      });
    });
    // the deck sits stacked until asked — nothing loads until it's spread
    var deckWrap = el.querySelector("[data-tlib-deckwrap]"), deckBtn = el.querySelector("[data-tlib-deck]"), libBody = el.querySelector("[data-tlib-body]");
    deckBtn.addEventListener("click", function () {
      deckBtn.classList.add("is-open"); deckBtn.setAttribute("aria-expanded", "true");
      setTimeout(function () {
        deckWrap.hidden = true; libBody.hidden = false;
        renderLib("all");
      }, 420);   // let the stack scatter first
    });
    el.querySelector("[data-tlib-gather]").addEventListener("click", function () {
      libBody.hidden = true; detail.hidden = true;
      deckBtn.classList.remove("is-open"); deckBtn.setAttribute("aria-expanded", "false");
      deckWrap.hidden = false;
      deckWrap.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    renderJournal();
  }

  /* =========================================================
     SOUND HEALING — the transmission room.
     Centerpiece: the KAZM Harmonic Stack, a live re-creation of the real
     overnight experiment this station ran on the 5,000-watt 780 AM rig —
     54, 72, 84, 111 Hz, five minutes each, then all four together, then
     around again until dawn. Every tone is synthesized on-device,
     transmitter-clean (pure sines, no effects), with equal-power
     crossfades between segments and a phosphor oscilloscope drawing the
     REAL summed waveform. Plus true stereo binaural sessions and a
     coherent-breathing pacer. One session at a time, like one transmitter.
     ========================================================= */
  var SH_STACK_V2 = [54, 72, 84, 111], SH_STACK_V1 = [54.7, 72.3, 89.4, 111.0];
  var shCtx = null, shMaster = null, shNodes = [], shTick = null, shAutoOff = null,
      shState = null, shWave = [], shRAF = null, shOnState = null;
  function shEnsure() {
    if (shCtx) return shCtx;
    var C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
    try {
      shCtx = new C();
      shMaster = shCtx.createGain(); shMaster.gain.value = 0.9;
      var comp = shCtx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.01; comp.release.value = 0.3;
      shMaster.connect(comp); comp.connect(shCtx.destination);
    } catch (e) { shCtx = null; return null; }
    return shCtx;
  }
  // one bank of pure tones, blooming in over 1.5s; returns handles so the
  // next segment can sing it back down (equal-power crossfade)
  function shBank(freqs, level, pans) {
    var ctx = shEnsure(); if (!ctx) return [];
    if (ctx.state === "suspended") ctx.resume();
    var t = ctx.currentTime, made = [];
    freqs.forEach(function (f, i) {
      var o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(level, t + 1.5);
      var dest = shMaster;
      if (pans && pans[i] != null) { try { var pn = ctx.createStereoPanner(); pn.pan.value = pans[i]; pn.connect(shMaster); dest = pn; shNodes.push(pn); } catch (e) {} }
      o.connect(g); g.connect(dest); o.start(t);
      shNodes.push(o, g); made.push({ o: o, g: g });
    });
    return made;
  }
  function shFadeBank(bank, secs) {
    if (!shCtx || !bank) return;
    var t = shCtx.currentTime;
    bank.forEach(function (h) {
      try {
        h.g.gain.cancelScheduledValues(t); h.g.gain.setValueAtTime(Math.max(h.g.gain.value, 0.0001), t);
        h.g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
        h.o.stop(t + secs + 0.1);
      } catch (e) {}
    });
  }
  function shStop(fade) {
    if (shTick) { clearInterval(shTick); shTick = null; }
    if (shAutoOff) { clearTimeout(shAutoOff); shAutoOff = null; }
    shState = null; shWave = [];
    if (shCtx) {
      var t = shCtx.currentTime, nodes = shNodes; shNodes = [];
      nodes.forEach(function (nd) {
        try { if (nd.gain) { nd.gain.cancelScheduledValues(t); nd.gain.setValueAtTime(Math.max(nd.gain.value, 0.0001), t); nd.gain.exponentialRampToValueAtTime(0.0001, t + (fade || 0.8)); } } catch (e) {}
      });
      setTimeout(function () { nodes.forEach(function (nd) { try { if (nd.stop) nd.stop(); } catch (e) {} }); }, ((fade || 0.8) + 0.2) * 1000);
    }
    if (shOnState) shOnState(null);
  }
  function shArm(mins) {   // optional sign-off timer, fades out like end of broadcast day
    if (shAutoOff) { clearTimeout(shAutoOff); shAutoOff = null; }
    if (mins) shAutoOff = setTimeout(function () { shStop(6); }, mins * 60000);
  }
  function shStartStack(cfg) {   // cfg: {freqs, segLen, octaveUp, autoMins}
    shStop(0.5);
    setTimeout(function () {
      if (!shEnsure()) return;
      var base = cfg.freqs.slice(), mul = cfg.octaveUp ? 2 : 1;
      var segs = base.map(function (f) { return [f]; }); segs.push(base.slice());   // 4 solos, then ALL — the real overnight pattern
      var st = { type: "stack", idx: 0, cycle: 1, segLen: cfg.segLen, segs: segs, mul: mul, bank: null, t0: Date.now() };
      shState = st;
      function seg() { return st.segs[st.idx]; }
      function play() {
        var freqs = seg().map(function (f) { return f * mul; });
        var lvl = seg().length > 1 ? 0.14 : 0.3;
        var old = st.bank;
        st.bank = shBank(freqs, lvl);
        if (old) shFadeBank(old, 1.8);
        shWave = seg().slice();   // scope draws the true (un-octaved) math
        if (shOnState) shOnState(st);
      }
      play();
      shTick = setInterval(function () {
        if (!shState) return;
        var el = (Date.now() - st.t0) / 1000;
        if (el >= st.segLen) {
          st.t0 = Date.now(); st.idx++;
          if (st.idx >= st.segs.length) { st.idx = 0; st.cycle++; }   // ↻ around again, all night if you like
          play();
        } else if (shOnState) shOnState(st);
      }, 200);
      shArm(cfg.autoMins);
    }, 600);
  }
  function shStartSolo(freqs, mul, autoMins) {   // hold one tone (or the full chord) outside the sequence
    shStop(0.5);
    setTimeout(function () {
      if (!shEnsure()) return;
      shBank(freqs.map(function (f) { return f * mul; }), freqs.length > 1 ? 0.14 : 0.3);
      shState = { type: "solo", freqs: freqs.slice(), mul: mul, t0: Date.now() };
      shWave = freqs.slice();
      if (shOnState) shOnState(shState);
      shTick = setInterval(function () { if (shState && shOnState) shOnState(shState); }, 500);
      shArm(autoMins);
    }, 600);
  }
  function shStartBinaural(delta, name, autoMins) {   // true binaural: carrier hard-left, carrier+Δ hard-right
    shStop(0.5);
    setTimeout(function () {
      if (!shEnsure()) return;
      var carrier = 111;   // a nod to the top of the stack
      shBank([carrier, carrier + delta], 0.22, [-1, 1]);
      shState = { type: "binaural", name: name, delta: delta, carrier: carrier, t0: Date.now() };
      shWave = [carrier, carrier + delta];
      if (shOnState) shOnState(shState);
      shTick = setInterval(function () { if (shState && shOnState) shOnState(shState); }, 500);
      shArm(autoMins);
    }, 600);
  }
  // phosphor oscilloscope — draws the genuine sum of the active tones
  function shScope(canvas) {
    var ctx2 = canvas.getContext("2d"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    function size() { var w = canvas.clientWidth || 600; canvas.width = w * dpr; canvas.height = 130 * dpr; }
    size();
    var t0 = performance.now();
    function frame() {
      if (!canvas.isConnected) { shRAF = null; return; }
      var W = canvas.width, H = canvas.height, mid = H / 2;
      ctx2.fillStyle = "rgba(7,11,28,.24)"; ctx2.fillRect(0, 0, W, H);   // phosphor fade
      var fs = shWave;
      ctx2.beginPath();
      var tNow = (performance.now() - t0) / 1000;
      for (var x = 0; x <= W; x += 2 * dpr) {
        var tt = tNow + (x / W) * 0.09, v = 0;
        for (var i = 0; i < fs.length; i++) v += Math.sin(2 * Math.PI * fs[i] * tt) / Math.max(2, fs.length);
        var y = mid - v * H * 0.36;
        x === 0 ? ctx2.moveTo(x, y) : ctx2.lineTo(x, y);
      }
      if (!fs.length) { ctx2.moveTo(0, mid); ctx2.lineTo(W, mid); }   // flatline, carrier idle
      ctx2.strokeStyle = fs.length ? "#8de8ff" : "rgba(141,232,255,.35)";
      ctx2.lineWidth = 1.6 * dpr; ctx2.shadowColor = "#4fc3f7"; ctx2.shadowBlur = 10 * dpr;
      ctx2.stroke(); ctx2.shadowBlur = 0;
      shRAF = requestAnimationFrame(frame);
    }
    if (shRAF) cancelAnimationFrame(shRAF);
    shRAF = requestAnimationFrame(frame);
  }
  function shFmt(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + (s % 60 < 10 ? "0" : "") + (s % 60); }
  function initSoundHealing() {
    var root = doc.querySelector("[data-sh]");
    if (!root) { if (shState) shStop(1); shOnState = null; return; }   // left the room — sign off
    var lamp = root.querySelector("[data-sh-lamp]"), freqEl = root.querySelector("[data-sh-freq]"),
        subEl = root.querySelector("[data-sh-sub]"), segsEl = root.querySelector("[data-sh-segs]"),
        prog = root.querySelector("[data-sh-prog] i"), timeEl = root.querySelector("[data-sh-time]"),
        cycEl = root.querySelector("[data-sh-cycle]"), scope = root.querySelector("[data-sh-scope]");
    var pace = 150, useV1 = false, oct = false, autoMins = 0, soloIdx = -1;
    function stackFreqs() { return useV1 ? SH_STACK_V1 : SH_STACK_V2; }
    function drawSegs() {
      var f = stackFreqs();
      segsEl.innerHTML = f.map(function (x, i) { return '<button class="sh-seg" data-si="' + i + '" title="Hold ' + x + ' Hz on its own">' + x + '</button>'; }).join("") +
        '<button class="sh-seg sh-seg--all" data-si="4" title="Hold all four together">ALL</button>';
      segsEl.querySelectorAll(".sh-seg").forEach(function (s) {
        s.addEventListener("click", function () {
          var si = +s.getAttribute("data-si");
          soloIdx = si;
          shStartSolo(si === 4 ? stackFreqs() : [stackFreqs()[si]], oct ? 2 : 1, autoMins);
        });
      });
    }
    drawSegs();
    shScope(scope);
    shOnState = function (st) {
      var on = !!st;
      lamp.classList.toggle("is-on", on);
      root.querySelectorAll(".sh-seg").forEach(function (s) { s.classList.remove("is-live"); });
      if (!on) { freqEl.innerHTML = "&mdash;"; subEl.textContent = "transmitter idle"; if (prog) prog.style.width = "0%"; timeEl.textContent = "–:––"; cycEl.textContent = ""; return; }
      if (st.type === "stack") {
        var f = st.segs[st.idx], all = f.length > 1;
        freqEl.innerHTML = all ? f.join(" + ") : f[0] + ' <small>Hz</small>';
        subEl.textContent = (all ? "all four together" : "pure tone") + (st.mul === 2 ? " · raised one octave" : "") + " · pass " + st.cycle;
        var live = segsEl.querySelector('[data-si="' + (all ? 4 : st.idx) + '"]'); if (live) live.classList.add("is-live");
        var el2 = (Date.now() - st.t0) / 1000;
        if (prog) prog.style.width = Math.min(100, el2 / st.segLen * 100) + "%";
        timeEl.textContent = shFmt(st.segLen - el2);
        cycEl.textContent = "PASS " + st.cycle;
      } else if (st.type === "solo") {
        var allS = st.freqs.length > 1;
        freqEl.innerHTML = allS ? st.freqs.join(" + ") : st.freqs[0] + ' <small>Hz</small>';
        subEl.textContent = "held tone" + (st.mul === 2 ? " · raised one octave" : "") + " — tap another to switch, ▸ for the full cycle";
        var liveS = segsEl.querySelector('[data-si="' + (allS ? 4 : soloIdx) + '"]'); if (liveS) liveS.classList.add("is-live");
        if (prog) prog.style.width = "100%";
        timeEl.textContent = shFmt((Date.now() - st.t0) / 1000);
        cycEl.textContent = "HELD ∞";
      } else {
        freqEl.innerHTML = st.carrier + " <small>Hz</small> <span class='sh-delta'>Δ " + st.delta + "</span>";
        subEl.textContent = st.name + " · " + st.carrier + " Hz left ear, " + (st.carrier + st.delta) + " Hz right — the " + st.delta + " Hz beat exists only in your head";
        timeEl.textContent = shFmt((Date.now() - st.t0) / 1000);
        cycEl.textContent = "BINAURAL";
        if (prog) prog.style.width = "100%";
      }
    };
    shOnState(shState);   // resync UI if a session survived SPA navigation
    // controls
    root.querySelectorAll("[data-sh-pace] .chip").forEach(function (ch) {
      ch.addEventListener("click", function () {
        root.querySelectorAll("[data-sh-pace] .chip").forEach(function (x) { x.classList.remove("is-active"); });
        ch.classList.add("is-active"); pace = +ch.getAttribute("data-secs");
        if (shState && shState.type === "stack") shState.segLen = pace;
      });
    });
    var v1btn = root.querySelector("[data-sh-v1]"), octbtn = root.querySelector("[data-sh-oct]");
    function reVoice() {   // a running session follows the voicing switches
      if (!shState) return;
      if (shState.type === "stack") shStartStack({ freqs: stackFreqs(), segLen: pace, octaveUp: oct, autoMins: autoMins });
      else if (shState.type === "solo" && soloIdx > -1) shStartSolo(soloIdx === 4 ? stackFreqs() : [stackFreqs()[soloIdx]], oct ? 2 : 1, autoMins);
    }
    v1btn.addEventListener("click", function () { useV1 = !useV1; v1btn.classList.toggle("is-active", useV1); drawSegs(); reVoice(); });
    octbtn.addEventListener("click", function () { oct = !oct; octbtn.classList.toggle("is-active", oct); reVoice(); });
    root.querySelectorAll("[data-sh-auto] .chip").forEach(function (ch) {
      ch.addEventListener("click", function () {
        root.querySelectorAll("[data-sh-auto] .chip").forEach(function (x) { x.classList.remove("is-active"); });
        ch.classList.add("is-active"); autoMins = +ch.getAttribute("data-mins"); if (shState) shArm(autoMins);
      });
    });
    root.querySelector("[data-sh-start]").addEventListener("click", function () { shStartStack({ freqs: stackFreqs(), segLen: pace, octaveUp: oct, autoMins: autoMins }); });
    root.querySelector("[data-sh-stop]").addEventListener("click", function () { shStop(1.2); });
    root.querySelectorAll("[data-sh-bin]").forEach(function (b) {
      b.addEventListener("click", function () { shStartBinaural(+b.getAttribute("data-sh-bin"), b.getAttribute("data-sh-name"), autoMins); });
    });
    // coherent-breathing pacer — 5.5s in, 5.5s out
    var bwrap = root.querySelector("[data-sh-breathbox]"), btog = root.querySelector("[data-sh-breath]"), blab = root.querySelector("[data-sh-breathlab]");
    if (btog) btog.addEventListener("click", function () {
      var on = bwrap.hidden; bwrap.hidden = !on; btog.classList.toggle("is-active", on);
      btog.textContent = on ? "◼ Hide the breath pacer" : "◉ Breathe with it · 5.5 in / 5.5 out";
      if (on) {
        var inhale = true; blab.textContent = "inhale";
        bwrap._t = setInterval(function () { inhale = !inhale; blab.textContent = inhale ? "inhale" : "exhale"; }, 5500);
      } else if (bwrap._t) { clearInterval(bwrap._t); bwrap._t = null; }
    });
  }

  /* =========================================================
     UFC FIGHT CENTER — live from ESPN's public MMA API (CORS-open, same
     source as the scoreboards). The next card with a real countdown,
     every bout with records + country flags + weight class, main event
     and co-main billed like a poster, live round/clock on fight night
     (auto-polls every 30s while a card is running), and how the last
     card went, bout by bout.
     ========================================================= */
  var UFC_API = "https://site.api.espn.com/apis/site/v2/sports/mma/ufc/scoreboard";
  var ufcTimer = null, ufcCountTimer = null;
  function ufcFlag(a) { return (a && a.flag && a.flag.href) ? '<span class="ufc-oct"><img src="' + esc(a.flag.href) + '" alt="" loading="lazy" onerror="this.parentNode.style.visibility=\'hidden\'" /></span>' : '<span class="ufc-oct ufc-oct--none"></span>'; }
  function ufcRec(x) { return (x.records && x.records[0] && x.records[0].summary) || ""; }
  function ufcBoutState(c) {
    var st = c.status && c.status.type;
    if (!st) return { k: "pre", label: "" };
    if (st.state === "in") return { k: "live", label: "LIVE · R" + (c.status.period || 1) + " " + (c.status.displayClock || "") };
    if (st.completed) return { k: "done", label: "Final · R" + (c.status.period || "?") + " " + (c.status.displayClock || "") };
    return { k: "pre", label: "" };
  }
  function ufcBoutRow(c, i, total) {
    var A = c.competitors && c.competitors[0], B = c.competitors && c.competitors[1];
    if (!A || !B) return "";
    var wc = (c.type && (c.type.abbreviation || c.type.text)) || "";
    var st = ufcBoutState(c);
    var bill = i === 0 ? "MAIN EVENT" : i === 1 ? "CO-MAIN" : "BOUT " + (total - i);
    function side(x, right) {
      return '<div class="ufc-f' + (right ? " ufc-f--r" : "") + (x.winner ? " is-winner" : "") + '">' +
        ufcFlag(x.athlete) + '<div class="ufc-f-t"><b>' + esc(x.athlete ? x.athlete.displayName : "TBA") + (x.winner ? ' <i class="ufc-w">✓</i>' : '') + '</b>' +
        '<span>' + esc(ufcRec(x)) + '</span></div></div>';
    }
    return '<div class="ufc-bout' + (i === 0 ? " ufc-bout--main" : "") + (st.k === "live" ? " is-live" : "") + '">' +
      '<div class="ufc-bout-top"><span class="ufc-bill' + (i === 0 ? " ufc-bill--main" : "") + '">' + bill + '</span>' +
        (wc ? '<span class="ufc-wc">' + esc(wc) + '</span>' : '') +
        (st.label ? '<span class="ufc-st ufc-st--' + st.k + '">' + esc(st.label) + '</span>' : '') + '</div>' +
      '<div class="ufc-vs">' + side(A) + '<span class="ufc-x">VS</span>' + side(B, true) + '</div>' +
    '</div>';
  }
  function ufcCountdown(el, iso) {
    if (ufcCountTimer) { clearInterval(ufcCountTimer); ufcCountTimer = null; }
    function tick() {
      if (!el.isConnected) { clearInterval(ufcCountTimer); ufcCountTimer = null; return; }
      var ms = new Date(iso) - Date.now();
      if (ms <= 0) { el.innerHTML = '<span class="ufc-cd-live">🔴 FIGHT NIGHT</span>'; clearInterval(ufcCountTimer); ufcCountTimer = null; return; }
      var d = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000);
      el.innerHTML = (d ? '<b>' + d + '</b>d ' : '') + '<b>' + h + '</b>h <b>' + m + '</b>m ' + (d ? '' : '<b>' + s + '</b>s');
    }
    tick(); ufcCountTimer = setInterval(tick, 1000);
  }
  function initUFC() {
    var nx = doc.querySelector("[data-ufc-next]");
    if (!nx) { if (ufcTimer) { clearInterval(ufcTimer); ufcTimer = null; } if (ufcCountTimer) { clearInterval(ufcCountTimer); ufcCountTimer = null; } return; }
    var lastBox = doc.querySelector("[data-ufc-last]");
    if (!nx.children.length) nx.innerHTML = '<p class="rss-loading">Ringing the cage&hellip;</p>';
    function load() {
      fetch(UFC_API, { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
        if (!nx.isConnected) return;
        var evs = d.events || [];
        var ev = null;
        for (var i = 0; i < evs.length; i++) { if (!(evs[i].status && evs[i].status.type && evs[i].status.type.completed)) { ev = evs[i]; break; } }
        if (!ev) ev = evs[evs.length - 1];
        if (!ev) { nx.innerHTML = '<p class="embed-note">No upcoming card on the schedule right now.</p>'; return; }
        var comps = (ev.competitions || []).slice().reverse();   // ESPN lists early prelims first — the poster reads top down
        var v = ev.venues && ev.venues[0];
        var bc = null;
        for (var b = 0; b < comps.length && !bc; b++) { var bb = comps[b].broadcasts; if (bb && bb[0] && bb[0].names) bc = bb[0].names[0]; }
        var live = ev.status && ev.status.type && ev.status.type.state === "in";
        var names = ev.name.split(":");
        nx.innerHTML =
          '<div class="ufc-card' + (live ? " is-live" : "") + '">' +
            '<div class="ufc-head">' +
              '<div><span class="ufc-league">' + esc((names[0] || ev.name).trim()) + (live ? ' <span class="ufc-livepill">● LIVE</span>' : '') + '</span>' +
              '<h3 class="ufc-title">' + esc((names[1] || "").trim() || ev.shortName || "") + '</h3>' +
              '<span class="ufc-meta">' + esc(azDateTime(ev.date)) + ' AZ' +
                (v ? ' &middot; ' + esc(v.fullName) + (v.address ? ', ' + esc(v.address.city) : '') : '') +
                (bc ? ' &middot; ' + esc(bc) : '') + '</span></div>' +
              '<div class="ufc-cd" data-ufc-cd></div>' +
            '</div>' +
            '<div class="ufc-bouts">' + comps.map(function (c, i) { return ufcBoutRow(c, i, comps.length); }).join("") + '</div>' +
            '<div class="ufc-foot">Full card, billed order &middot; records &amp; results live from ESPN &middot; times Arizona</div>' +
          '</div>';
        var cd = nx.querySelector("[data-ufc-cd]");
        if (cd && !live) ufcCountdown(cd, ev.date);
        else if (cd) cd.innerHTML = '<span class="ufc-cd-live">🔴 FIGHT NIGHT</span>';
        if (ufcTimer) clearInterval(ufcTimer);
        ufcTimer = setInterval(load, live ? 30000 : 300000);   // 30s on fight night, 5 min otherwise
      }).catch(function () { if (nx.isConnected && !nx.querySelector(".ufc-card")) nx.innerHTML = '<p class="embed-note">The fight card is unavailable right now.</p>'; });
      if (lastBox) {
        var now = new Date(), past = new Date(+now - 60 * 86400000);
        function ymd(dt) { return dt.toISOString().slice(0, 10).replace(/-/g, ""); }
        fetch(UFC_API + "?dates=" + ymd(past) + "-" + ymd(now), { cache: "no-store" }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (d) {
          if (!lastBox.isConnected) return;
          var done = (d.events || []).filter(function (e) { return e.status && e.status.type && e.status.type.completed; });
          var ev = done[done.length - 1]; if (!ev) { lastBox.innerHTML = ""; return; }
          var comps = (ev.competitions || []).slice().reverse().slice(0, 5);
          lastBox.innerHTML =
            '<div class="ufc-lastcard"><div class="ufc-last-h"><b>' + esc(ev.name) + '</b><span>' + esc(azDateTime(ev.date)) + ' AZ</span></div>' +
            comps.map(function (c) {
              var w = (c.competitors || []).filter(function (x) { return x.winner; })[0];
              var l = (c.competitors || []).filter(function (x) { return !x.winner; })[0];
              var st = ufcBoutState(c);
              if (!w || !l) return "";
              return '<div class="ufc-res">' + ufcFlag(w.athlete) +
                '<span class="ufc-res-t"><b>' + esc(w.athlete.displayName) + '</b> def. ' + esc(l.athlete.displayName) + '</span>' +
                '<span class="ufc-res-st">' + esc(st.label) + '</span></div>';
            }).join("") + '</div>';
        }).catch(function () {});
      }
    }
    load();
  }

  /* =========================================================
     THE LIGHT CONSOLE — a photographer's day over Sedona, computed live:
     the whole day as a light timeline (night → blue → golden → flat day
     → golden → blue → night, with the astro-darkness markers), a NOW
     needle that creeps in real time, the current light called out with a
     countdown to the next window. Same validated solar math as the rest
     of the site. Plus tonight's SUNSET SCORE — read from the actual
     forecast cloud deck at sunset hour (mid/high clouds are the canvas
     that catches color; low clouds block the horizon).
     ========================================================= */
  var _plcTimer = null;
  function plcPhases(now) {
    var g = goldenTimes(now), B = g.evening.b;              // full solar block for today
    var sky = null; try { sky = computeSky(now); } catch (e) {}
    return {
      blueDawn: B.blueDawn, sunrise: B.sunrise, goldAmEnd: B.goldMornEnd,
      goldPmStart: B.goldEveStart, sunset: B.sunset, blueDusk: B.blueDusk,
      darkStart: sky && sky.dusk, darkEnd: sky && sky.dawn
    };
  }
  function initLightConsole() {
    var el = doc.querySelector("[data-photo-light]");
    if (!el) { if (_plcTimer) { clearInterval(_plcTimer); _plcTimer = null; } return; }
    var TZ = -7;
    function mins(dt) { if (!dt || isNaN(dt.valueOf())) return null; var u = new Date(dt.valueOf() + TZ * 3600000); return u.getUTCHours() * 60 + u.getUTCMinutes(); }
    function pct(m) { return (m / 1440 * 100).toFixed(2) + "%"; }
    var P;
    try { P = plcPhases(new Date()); } catch (e) { el.innerHTML = ""; return; }
    var bd = mins(P.blueDawn), sr = mins(P.sunrise), ga = mins(P.goldAmEnd),
        gp = mins(P.goldPmStart), ss = mins(P.sunset), bk = mins(P.blueDusk);
    var NIGHT = "#0c1024", BLUE = "#31549e", GOLD = "#f2a444", DAY = "#f7e9c9";
    var grad = "linear-gradient(90deg," +
      NIGHT + " 0 " + pct(bd) + "," + BLUE + " " + pct(bd) + " " + pct(sr) + "," +
      GOLD + " " + pct(sr) + " " + pct(ga) + "," + DAY + " " + pct(ga) + " " + pct(gp) + "," +
      GOLD + " " + pct(gp) + " " + pct(ss) + "," + BLUE + " " + pct(ss) + " " + pct(bk) + "," +
      NIGHT + " " + pct(bk) + " 100%)";
    function T(dt) { return skyTime(dt, TZ); }
    var marks = [[sr, "sunrise " + T(P.sunrise)], [ga, "golden ends " + T(P.goldAmEnd)], [gp, "golden " + T(P.goldPmStart)], [ss, "sunset " + T(P.sunset)]];
    el.innerHTML =
      '<div class="plc-card">' +
        '<div class="plc-now"><span class="plc-state" data-plc-state>&hellip;</span><span class="plc-count" data-plc-count></span></div>' +
        '<div class="plc-barwrap">' +
          '<div class="plc-bar" style="background:' + grad + '">' +
            (P.darkStart && mins(P.darkStart) != null ? '<i class="plc-astro" style="left:' + pct(mins(P.darkStart)) + '" title="astronomical darkness begins"></i>' : '') +
            '<i class="plc-needle" data-plc-needle></i>' +
          '</div>' +
          '<div class="plc-marks">' + marks.map(function (m) { return '<span style="left:' + pct(m[0]) + '">' + m[1] + '</span>'; }).join("") + '</div>' +
        '</div>' +
        '<div class="plc-chips">' +
          '<span class="plc-chip plc-chip--blue">🌌 Blue dawn ' + T(P.blueDawn) + '&ndash;' + T(P.sunrise) + '</span>' +
          '<span class="plc-chip plc-chip--gold">🌄 Golden AM ' + T(P.sunrise) + '&ndash;' + T(P.goldAmEnd) + '</span>' +
          '<span class="plc-chip plc-chip--gold">🌇 Golden PM ' + T(P.goldPmStart) + '&ndash;' + T(P.sunset) + '</span>' +
          '<span class="plc-chip plc-chip--blue">🌆 Blue dusk ' + T(P.sunset) + '&ndash;' + T(P.blueDusk) + '</span>' +
          (P.darkStart ? '<span class="plc-chip plc-chip--dark">✨ True dark ' + T(P.darkStart) + '&ndash;' + T(P.darkEnd) + '</span>' : '') +
        '</div>' +
        '<div class="plc-foot">Computed live for 34.87&deg;N 111.76&deg;W &middot; the needle moves with you</div>' +
      '</div>';
    var stateEl = el.querySelector("[data-plc-state]"), countEl = el.querySelector("[data-plc-count]"), needle = el.querySelector("[data-plc-needle]");
    function phaseNow() {
      var now = new Date(), m = mins(now);
      var steps = [
        [bd, "🌙 Night — long-exposure &amp; star country", NIGHT],
        [sr, "🌌 BLUE HOUR — cobalt sky, glowing town lights", BLUE],
        [ga, "🌄 GOLDEN LIGHT — the rocks are on fire, go", GOLD],
        [gp, "☀️ Flat midday light — scout, or shoot the canyons &amp; creek", "#a88f5e"],
        [ss, "🌇 GOLDEN LIGHT — the rocks are on fire, go", GOLD],
        [bk, "🌆 BLUE HOUR — cobalt sky, silhouettes &amp; town glow", BLUE],
        [1441, "🌙 Night — the stars are out", NIGHT]
      ];
      for (var i = 0; i < steps.length; i++) {
        if (m < steps[i][0]) {
          var left = steps[i][0] - m, next = i < steps.length - 1 ? steps[i][0] : null;
          return { label: steps[i][1], mins: left === 1441 - m && i === steps.length - 1 ? null : left };
        }
      }
      return { label: steps[0][1], mins: null };
    }
    function tick() {
      if (!el.isConnected) { clearInterval(_plcTimer); _plcTimer = null; return; }
      var now = new Date(), m = mins(now);
      if (needle) needle.style.left = pct(m);
      var ph = phaseNow();
      if (stateEl) stateEl.innerHTML = ph.label;
      if (countEl) countEl.textContent = ph.mins != null && ph.mins < 1441 ? (ph.mins >= 60 ? Math.floor(ph.mins / 60) + "h " + (ph.mins % 60) + "m" : ph.mins + "m") + " until the light changes" : "";
    }
    tick();
    if (_plcTimer) clearInterval(_plcTimer);
    _plcTimer = setInterval(tick, 30000);
  }
  /* =========================================================
     SEDONA, COMPUTED LIVE — the homepage mosaic. Eight tiles, every one
     a real live datum: four computed on-device the instant the page
     loads (moon, golden hour, card of the day, the sky), four fetched
     (creek gauge, Schumann, next UFC card, your Signal Hunt progress).
     One glance = proof this station runs on the real world.
     ========================================================= */
  function initHomePulse() {
    var el = doc.querySelector("[data-home-pulse]"); if (!el) return;
    function tile(href, ic, val, lab, sub) {
      return '<a class="hp-tile" href="' + href + '"><span class="hp-ic">' + ic + '</span>' +
        '<span class="hp-val">' + val + '</span><span class="hp-lab">' + lab + '</span>' +
        (sub ? '<span class="hp-sub">' + sub + '</span>' : '') + '</a>';
    }
    // computed instantly, no network
    var m = moonInfo();
    var g = null; try { g = goldenTimes(new Date()); } catch (e) {}
    function T(dt) { return skyTime(dt, -7); }
    var golden = g ? T(g.evening.b.goldEveStart) + "&ndash;" + T(g.evening.b.sunset) : "—";
    var deck = tarotDeck(), day = Math.floor((Date.now() / 86400000 + (-7 / 24)));
    var h = day * 2654435761 % 4294967296; h = (h ^ (h >>> 13)) >>> 0;
    var cod = deck[h % 78];
    var sky = null, rxN = 0; try { sky = skyNow(new Date()); rxN = sky.filter(function (b) { return b.retro; }).length; } catch (e) {}
    var sunZ = sky ? ZODIAC[sky[0].sign] : null;
    var st = {}; try { st = JSON.parse(localStorage.getItem("kazm-signal-hunt") || "{}"); } catch (e) {}
    var foundN = GC_WAYPOINTS.filter(function (w) { return st[w.code]; }).length;
    el.innerHTML =
      tile("vibe.html", m.icon, m.illum + "%", "tonight&rsquo;s moon", esc(m.name)) +
      tile("photography.html", "🌇", golden, "golden hour tonight", "the rocks catch fire") +
      tile("chakras.html", "🃏", esc(cod.name), "card of the day", "one card, whole canyon") +
      (sunZ ? tile("horoscope.html", sunZ.g, "Sun in " + sunZ.n, "the sky right now", rxN ? rxN + " planet" + (rxN > 1 ? "s" : "") + " retrograde ℞" : "all planets direct") : "") +
      tile("events.html#creek", "🌊", "<span data-hp-creek>&hellip;</span>", "oak creek", "<span data-hp-creeksub>USGS, live</span>") +
      tile("vibe.html#schumann", "📡", "<span data-hp-schu>&hellip;</span>", "earth&rsquo;s frequency", "<span data-hp-schusub>Schumann resonance</span>") +
      tile("sports.html#ufc", "🥊", "<span data-hp-ufc>&hellip;</span>", "next fight card", "<span data-hp-ufcsub>live from the cage</span>") +
      tile("events.html#geocaching", "🧭", foundN ? foundN + " of 5" : "Join the hunt", "signal hunt", foundN === 5 ? "COMPLETE — call it in!" : "GPS-verified, on-air glory");
    // the three fetched tiles
    fetch("https://waterservices.usgs.gov/nwis/iv/?format=json&sites=09504420&parameterCd=00010,00060&siteStatus=active", { cache: "no-store" })
      .then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
        var flow = null, wt = null;
        (d.value.timeSeries || []).forEach(function (ts) {
          var c = ts.variable.variableCode[0].value, v = parseFloat(ts.values[0].value[0].value);
          if (c === "00060") flow = v; if (c === "00010") wt = Math.round(v * 9 / 5 + 32);
        });
        var e1 = el.querySelector("[data-hp-creek]"), e2 = el.querySelector("[data-hp-creeksub]");
        if (e1 && flow != null) e1.innerHTML = flow.toFixed(0) + " cfs";
        if (e2 && flow != null) e2.textContent = (flow >= 15 && flow <= 120 ? "just right" : flow < 15 ? "running low" : "running high") + (wt ? " · " + wt + "°F water" : "");
      }).catch(function () {});
    fetch("schumann.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var e1 = el.querySelector("[data-hp-schu]"), e2 = el.querySelector("[data-hp-schusub]");
      if (d && d.available !== false && e1) { e1.innerHTML = (d.detected_hz || d.nominal_hz) + " Hz"; if (e2) e2.textContent = (d.activity || "") + " · energy " + (d.energy_score != null ? d.energy_score : "—"); }
    }).catch(function () {});
    fetch(UFC_API, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      var evs = (d && d.events) || [], ev = null;
      for (var i = 0; i < evs.length; i++) { if (!(evs[i].status && evs[i].status.type && evs[i].status.type.completed)) { ev = evs[i]; break; } }
      var e1 = el.querySelector("[data-hp-ufc]"), e2 = el.querySelector("[data-hp-ufcsub]");
      if (ev && e1) {
        var days = Math.max(0, Math.ceil((new Date(ev.date) - Date.now()) / 86400000));
        var live = ev.status.type.state === "in";
        e1.innerHTML = live ? "🔴 LIVE NOW" : "in " + days + " day" + (days === 1 ? "" : "s");
        if (e2) e2.textContent = ev.name.split(":")[0] + (ev.name.split(":")[1] ? " · " + ev.name.split(":")[1].trim() : "");
      }
    }).catch(function () {});
  }

  /* =========================================================
     THE REQUEST LINE — the oldest ritual in radio, wired to the real
     playout chain. request-library.json is the actual MegaSeg library
     exported from the studio Mac (the machine that feeds 106.5 FM,
     780 AM, and every relay). A request travels site -> n8n queue ->
     studio. Requests are accepted and logged, nothing more — the
     playout system is never touched by anything on this site. The
     section only appears when the studio bridge answers its probe.
     Extras, all real: a public jukebox wall of recent requests, mood
     suggestions computed from live Sedona conditions, a just-played
     guard read from the actual song history, and an on-air moment —
     the site notices when your requested song is really playing.
     ========================================================= */
  /* THE PULSE — one tap per song on the player: "more like this" or "not my
     vibe". Votes aggregate on the studio's nudge sheet (never touch playout)
     and, locally, tune this listener's own suggestions. */
  var PULSE_API = "https://n8n.mellowmountainradio.com/webhook/kazm-pulse";
  function pulseStore() { try { return JSON.parse(localStorage.getItem("kazm-pulse") || "{}"); } catch (e) { return {}; } }
  function pulseSave(st) {
    try {
      var keys = Object.keys(st);
      if (keys.length > 200) { keys.sort(function (x, y) { return (st[x].at || 0) - (st[y].at || 0); }); delete st[keys[0]]; }
      localStorage.setItem("kazm-pulse", JSON.stringify(st));
    } catch (e) {}
  }
  function pulseLovedArtists() {
    var st = pulseStore(), out = {};
    Object.keys(st).forEach(function (k) { if (st[k].v === 1 && st[k].ar) out[st[k].ar] = 1; });
    return out;
  }
  var pulseKey = "", pulseBound = false;
  function pulseSync(song) {
    var box = doc.querySelector("[data-pulse]"); if (!box) return;
    var t = song && song.title, a = (song && song.artist) || "";
    if (!t || rqNorm(t) === rqNorm("Mellow Mountain Radio")) { box.hidden = true; return; }
    pulseKey = rqNorm(t) + "|" + rqNorm(a);
    box.hidden = false;
    var st = pulseStore(), v = st[pulseKey] ? st[pulseKey].v : 0;
    var lb = box.querySelector("[data-pulse-love]"), nb = box.querySelector("[data-pulse-nah]");
    lb.classList.toggle("is-on", v === 1); nb.classList.toggle("is-on", v === -1);
    lb.disabled = nb.disabled = v !== 0;
    if (!pulseBound) {
      pulseBound = true;
      function vote(dir) {
        if (!pulseKey) return;
        var cur = pulseStore(); if (cur[pulseKey]) return;
        var now = lastNow || {};
        cur[pulseKey] = { v: dir, ar: rqNorm(now.artist), at: Date.now() };
        pulseSave(cur);
        lb.classList.toggle("is-on", dir === 1); nb.classList.toggle("is-on", dir === -1);
        lb.disabled = nb.disabled = true;
        fetch(PULSE_API, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: now.title, artist: now.artist, vote: dir === 1 ? "love" : "nah" }) }).catch(function () {});
      }
      lb.addEventListener("click", function () { vote(1); });
      nb.addEventListener("click", function () { vote(-1); });
    }
  }

  var REQUEST_HOOK = "https://n8n.mellowmountainradio.com/webhook/kazm-request-line";
  var REQUEST_BOARD = "https://n8n.mellowmountainradio.com/webhook/kazm-request-board";
  function rqNorm(x) { return String(x || "").toLowerCase().replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
  function rqOnAir(song) {
    if (!song || !song.title) return;
    var saved; try { saved = JSON.parse(localStorage.getItem("kazm-request-song") || "null"); } catch (e) { saved = null; }
    if (!saved || !saved.t || Date.now() - saved.at > 172800000) return;
    var key = saved.t + "|" + saved.a;
    try { if (localStorage.getItem("kazm-request-played") === key) return; } catch (e) {}
    var nt = rqNorm(song.title), st = rqNorm(saved.t);
    if (!nt || !st || (nt.indexOf(st) === -1 && st.indexOf(nt) === -1)) return;
    if (saved.a) {
      var na = rqNorm(song.artist), sa = rqNorm(saved.a);
      if (na && sa && na.indexOf(sa) === -1 && sa.indexOf(na) === -1) return;
    }
    try { localStorage.setItem("kazm-request-played", key); } catch (e) {}
    var t = doc.createElement("div"); t.className = "rq-onair"; t.setAttribute("role", "status");
    t.innerHTML = '<span class="rq-onair-ic">🎉</span><span class="rq-onair-t"><b>Your request is ON THE AIR</b>' +
      '“' + esc(saved.t) + '” — ' + esc(saved.a) + ' · playing right now on 106.5 FM &amp; 780 AM</span>' +
      '<button type="button" aria-label="Dismiss">&times;</button>';
    doc.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("is-in"); });
    t.querySelector("button").addEventListener("click", function () { t.remove(); });
    setTimeout(function () { if (t.isConnected) { t.classList.remove("is-in"); setTimeout(function () { t.remove(); }, 500); } }, 45000);
  }
  function rqChime() {
    try {
      var C = window.AudioContext || window.webkitAudioContext, c = new C();
      [659.25, 880].forEach(function (f, i) {
        var o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, c.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + i * 0.12 + 0.5);
        o.connect(g); g.connect(c.destination);
        o.start(c.currentTime + i * 0.12); o.stop(c.currentTime + i * 0.12 + 0.55);
      });
      setTimeout(function () { c.close(); }, 1500);
    } catch (e) {}
  }
  function rqAgo(iso) {
    var s = (Date.now() - new Date(iso).getTime()) / 1000;
    if (!(s >= 0)) return "";
    if (s < 90) return "just now";
    if (s < 5400) return Math.round(s / 60) + " min ago";
    if (s < 129600) return Math.round(s / 3600) + " hr ago";
    return Math.round(s / 86400) + " days ago";
  }
  function initRequests() {
    var el = doc.querySelector("[data-request-line]"); if (!el) return;
    Promise.all([
      fetch("request-library.json", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(REQUEST_HOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ probe: true }) })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(NOWPLAYING_API, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch("https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FPhoenix", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (res) {
      var songs = res[0], probe = res[1], np = res[2], wx = res[3];
      if (!songs || !songs.length || !probe || probe.success !== true) return; // bridge offline — stay hidden
      el.hidden = false;
      var grid = el.querySelector("[data-rq-grid]"), inp = el.querySelector("[data-rq-search]"),
          cnt = el.querySelector("[data-rq-count]"), status = el.querySelector("[data-rq-status]"),
          shuf = el.querySelector("[data-rq-shuffle]"), live = el.querySelector("[data-rq-live]"),
          mood = el.querySelector("[data-rq-mood]"), nameIn = el.querySelector("[data-rq-name]"),
          noteIn = el.querySelector("[data-rq-note]"), wallWrap = el.querySelector("[data-rq-wallwrap]"),
          wall = el.querySelector("[data-rq-wall]");

      // live listener count — same feed the player runs on
      var lc = np && np.listeners ? (np.listeners.current != null ? np.listeners.current : np.listeners.total) : null;
      if (live && lc != null && lc > 0) {
        live.hidden = false;
        live.innerHTML = '<i></i>' + lc + (lc === 1 ? " person is" : " people are") + " listening across the mountain right now — a request plays to all of them.";
      }

      // what actually aired lately, for the just-played guard
      var aired = {};
      ((np && np.song_history) || []).forEach(function (h) {
        if (h && h.song) aired[rqNorm(h.song.title) + "|" + rqNorm(h.song.artist)] = (h.played_at || 0) * 1000;
      });

      function card(s, i) {
        return '<div class="rq-card" data-i="' + i + '"><span class="rq-art" aria-hidden="true">&#9834;</span>' +
          '<span class="rq-meta"><b>' + esc(s.t) + '</b><i>' + esc(s.a) + '</i></span>' +
          '<button class="btn btn-primary rq-btn" type="button">Request</button></div>';
      }
      function dressArt() {
        grid.querySelectorAll(".rq-card").forEach(function (c) {
          var s = songs[+c.getAttribute("data-i")], artEl = c.querySelector(".rq-art");
          fetchArtwork(s.a, s.t).then(function (meta) {
            if (meta && meta.art && c.isConnected) { artEl.textContent = ""; artEl.style.backgroundImage = "url('" + meta.art + "')"; artEl.classList.add("has-art"); }
          });
        });
      }
      function render(ixs) { grid.innerHTML = ixs.map(function (i) { return card(songs[i], i); }).join(""); dressArt(); }
      function renderShuffle() {
        var pool = songs.map(function (_, i) { return i; });
        for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp; }
        var loved = pulseLovedArtists(), tuned = false;
        if (Object.keys(loved).length) {
          var fav = pool.filter(function (i) { return loved[rqNorm(songs[i].a)]; });
          if (fav.length) {
            tuned = true;
            var rest = pool.filter(function (i) { return !loved[rqNorm(songs[i].a)]; });
            pool = fav.slice(0, 4).concat(rest);
          }
        }
        render(pool.slice(0, 12));
        cnt.textContent = songs.length + " songs — the actual studio library, exported straight from the playout system. A dozen at random below, or search for the one stuck in your head." + (tuned ? " Tuned a little to your pulse." : "");
      }
      function apply() {
        var q = inp.value.trim().toLowerCase();
        if (!q) { renderShuffle(); return; }
        var hits = [];
        for (var i = 0; i < songs.length && hits.length < 24; i++) {
          if ((songs[i].t + " " + songs[i].a).toLowerCase().indexOf(q) !== -1) hits.push(i);
        }
        render(hits);
        cnt.textContent = hits.length ? hits.length + (hits.length === 24 ? "+" : "") + " match" + (hits.length === 1 ? "" : "es") + " in the library." : "Nothing in the library matches “" + inp.value.trim() + "” — try the artist’s name, or hit Surprise me.";
      }

      // THE MOUNTAIN'S MOOD — suggestions computed from real conditions,
      // matched against real library titles. Receipts in the label.
      (function () {
        if (!mood) return;
        var hour = new Date(Date.now() - 7 * 3600000).getUTCHours();
        var code = wx && wx.current ? wx.current.weather_code : null;
        var temp = wx && wx.current ? Math.round(wx.current.temperature_2m) : null;
        var g = null; try { g = goldenTimes(new Date()); } catch (e) {}
        var now = Date.now(), pick = null;
        function T(dt) { return skyTime(dt, -7); }
        if (code != null && code >= 51) pick = { why: "Weather says rain on the rocks right now", terms: ["rain", "storm", "water", "thunder"] };
        else if (g && now >= g.evening.b.goldEveStart.getTime() && now <= g.evening.b.sunset.getTime() + 1200000) pick = { why: "Golden hour is on — sunset at " + T(g.evening.b.sunset), terms: ["sun", "gold", "sail", "light", "horizon"] };
        else if (hour >= 21 || hour < 5) pick = { why: "Sedona after dark — " + (temp != null ? temp + "° and " : "") + "stars out", terms: ["night", "moon", "star", "dream", "midnight"] };
        else if (temp != null && temp >= 95) pick = { why: "It’s " + temp + "° out there — songs for the heat", terms: ["heat", "summer", "sun", "water", "shade"] };
        else if (hour < 11) pick = { why: "First light on the mesa" + (temp != null ? " — " + temp + "° and climbing" : ""), terms: ["morning", "day", "light", "easy"] };
        else pick = { why: "Blue-sky Sedona" + (temp != null ? " — " + temp + "° right now" : ""), terms: ["sky", "free", "easy", "ride", "highway", "wind"] };
        var m = [];
        for (var i = 0; i < songs.length && m.length < 20; i++) {
          var tl = songs[i].t.toLowerCase();
          for (var k = 0; k < pick.terms.length; k++) { if (tl.indexOf(pick.terms[k]) !== -1) { m.push(i); break; } }
        }
        if (m.length < 3) return;
        var lovedM = pulseLovedArtists();
        if (Object.keys(lovedM).length) {
          m = m.filter(function (i) { return lovedM[rqNorm(songs[i].a)]; }).concat(m.filter(function (i) { return !lovedM[rqNorm(songs[i].a)]; }));
        }
        m = m.slice(0, 6);
        mood.hidden = false;
        mood.innerHTML = '<span class="rq-mood-why">' + esc(pick.why) + ' &mdash; the library agrees:</span>' +
          m.map(function (i) { return '<button type="button" class="rq-mood-chip" data-t="' + esc(songs[i].t) + '">' + esc(songs[i].t) + '</button>'; }).join("");
        mood.addEventListener("click", function (ev) {
          var b = ev.target.closest ? ev.target.closest(".rq-mood-chip") : null; if (!b) return;
          inp.value = b.getAttribute("data-t"); apply();
        });
      })();

      // THE JUKEBOX WALL — recent real requests, public by design
      function drawWall() {
        fetch(REQUEST_BOARD, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
          var reqs = d && d.requests;
          if (!reqs || !reqs.length || !wallWrap) return;
          wallWrap.hidden = false;
          wall.innerHTML = reqs.map(function (r) {
            return '<div class="rq-wcard"><b>' + esc(r.title) + '</b><i>' + esc(r.artist || "") + '</i>' +
              '<span class="rq-wby">' + (r.name ? "— " + esc(r.name) : "— a listener") + (r.at ? ' · ' + rqAgo(r.at) : '') + '</span>' +
              (r.note ? '<span class="rq-wnote">“' + esc(r.note) + '”</span>' : '') + '</div>';
          }).join("");
        }).catch(function () {});
      }
      drawWall();

      var deb; inp.addEventListener("input", function () { clearTimeout(deb); deb = setTimeout(apply, 160); });
      shuf.addEventListener("click", function () { inp.value = ""; renderShuffle(); });
      grid.addEventListener("click", function (ev) {
        var b = ev.target && ev.target.closest ? ev.target.closest(".rq-btn") : null; if (!b || b.disabled) return;
        var c = b.closest(".rq-card"), s = songs[+c.getAttribute("data-i")]; if (!s) return;
        var last = 0; try { last = +localStorage.getItem("kazm-request-at") || 0; } catch (e) {}
        var wait = 15 * 60000 - (Date.now() - last);
        if (wait > 0) {
          status.textContent = "One request per listener every 15 minutes — yours is still warm in the studio. Try again in " + Math.ceil(wait / 60000) + " min.";
          status.className = "rq-status rq-status--err"; return;
        }
        // just-played guard: this is the real broadcast history talking
        var when = aired[rqNorm(s.t) + "|" + rqNorm(s.a)];
        if (when && Date.now() - when < 5400000 && !b.dataset.sure) {
          b.dataset.sure = "1"; b.textContent = "Request anyway";
          status.textContent = "Good ear — “" + s.t + "” actually aired " + rqAgo(new Date(when).toISOString()) + ". Tap again if you want it back, or dig for a deeper cut.";
          status.className = "rq-status rq-status--err"; return;
        }
        b.disabled = true; b.textContent = "Sending…";
        fetch(REQUEST_HOOK, { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: s.t, artist: s.a, name: nameIn ? nameIn.value.trim().slice(0, 60) : "", note: noteIn ? noteIn.value.trim().slice(0, 140) : "" }) })
          .then(function (r) { return r.json().catch(function () { return {}; }); })
          .then(function (d) {
            if (d.success === true) {
              c.classList.add("is-done"); b.textContent = "✓ Sent to the studio";
              status.textContent = "“" + s.t + "” is logged for the studio. No promises on air time — the playout stays ours — but every request gets read, and yours just got heard. Leave this site open: if it airs, we’ll tell you the moment it does.";
              status.className = "rq-status rq-status--ok";
              rqChime();
              try {
                localStorage.setItem("kazm-request-at", String(Date.now()));
                localStorage.setItem("kazm-request-song", JSON.stringify({ t: s.t, a: s.a, at: Date.now() }));
                localStorage.removeItem("kazm-request-played");
              } catch (e) {}
              setTimeout(drawWall, 800);
            } else {
              b.disabled = false; b.textContent = "Request";
              status.textContent = d.message || "Requests are backed up right now — give it a few minutes and try again.";
              status.className = "rq-status rq-status--err";
            }
          }).catch(function () {
            b.disabled = false; b.textContent = "Request";
            status.textContent = "Couldn’t reach the studio — check your connection and try again.";
            status.className = "rq-status rq-status--err";
          });
      });
      renderShuffle();
    });
  }

  /* =========================================================
     TODAY'S PLAYBOOK — the adventure page gets a brain. It reads the
     same live inputs the sections below run on (temperature, UV, air
     quality, the Oak Creek gauge, today's sun windows) and RANKS what's
     actually worth doing right now — numbers as receipts, honest
     warnings when the desert says no. Heuristics ours; numbers real.
     ========================================================= */
  function initPlaybook() {
    var el = doc.querySelector("[data-playbook]"); if (!el) return;
    el.innerHTML = '<p class="rss-loading">Reading the desert&hellip;</p>';
    var wx = fetch("https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.7610&current=temperature_2m,weather_code,uv_index,precipitation&temperature_unit=fahrenheit&timezone=America%2FPhoenix", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var aq = fetch("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=34.8697&longitude=-111.7610&current=us_aqi&timezone=America/Phoenix", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    var ck = fetch("https://waterservices.usgs.gov/nwis/iv/?format=json&sites=09504420&parameterCd=00010,00060&siteStatus=active", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    Promise.all([wx, aq, ck]).then(function (res) {
      if (!el.isConnected) return;
      var w = res[0] && res[0].current, a = res[1] && res[1].current;
      var t = w ? Math.round(w.temperature_2m) : null, uv = w ? Math.round(w.uv_index) : null, aqi = a ? Math.round(a.us_aqi) : null;
      var flow = null, wtemp = null;
      try {
        (res[2].value.timeSeries || []).forEach(function (ts) {
          var code = ts.variable.variableCode[0].value, v = parseFloat(ts.values[0].value[0].value);
          if (code === "00060") flow = v; if (code === "00010") wtemp = Math.round(v * 9 / 5 + 32);
        });
      } catch (e) {}
      var g = null, hour = new Date(Date.now() - 7 * 3600000).getUTCHours();
      try { g = goldenTimes(new Date()); } catch (e) {}
      function T(dt) { return skyTime(dt, -7); }
      var dawnWin = g ? T(g.evening.b.sunrise) + "&ndash;" + T(g.evening.b.goldMornEnd) : "dawn";
      var duskWin = g ? T(g.evening.b.goldEveStart) + "&ndash;" + T(g.evening.b.sunset) : "dusk";
      var hot = t != null && t >= 95, warm = t != null && t >= 88, smoky = aqi != null && aqi > 150, uvHigh = uv != null && uv >= 8;
      var plays = [];
      if (flow != null) {
        var swimOK = flow >= 15 && flow <= 120, s = 55;
        if (swimOK) s += 15; else s -= 30;
        if (warm) s += 20; if (hot) s += 10;
        if (smoky) s += 5;   // low-exertion escape on a smoke day
        plays.push({ s: s, ic: "🌊", n: "Get in the creek", a: "#creek",
          why: (swimOK ? "Oak Creek is running just right (" + flow.toFixed(1) + " cfs" + (wtemp ? ", " + wtemp + "°F water" : "") + ")" : "The creek is out of its sweet spot at " + flow.toFixed(1) + " cfs") + (warm ? " and it's " + t + "° out — the water wins" : "") + ".",
          win: "Any time — shade in the canyon all day" });
        plays.push({ s: s - 6, ic: "🛝", n: "Slide Rock", a: "#slide-rock",
          why: "Same sweet creek numbers up the canyon" + ([0, 6].indexOf(new Date().getDay()) > -1 ? " — it's a weekend, be at the gate early, it fills by mid-morning" : "") + ".",
          win: "Go early — the lot fills" });
      }
      var hs = 72; if (hot) hs -= 35; else if (warm) hs -= 18;
      if (smoky) hs -= 25; if (uvHigh && hour >= 10 && hour <= 16) hs -= 10;
      plays.push({ s: hs, ic: "🥾", n: "Hike the red rocks", a: "#hiking",
        why: (hot ? "It's " + t + "° — midday is a no; this is a dawn-patrol day" : warm ? t + "° and clear — beat the heat, go at the edges of the day" : "Great hiking weather at " + t + "°") + (smoky ? ". Air quality is rough (" + aqi + ") — keep it short and easy" : "") + ".",
        win: "🌄 " + dawnWin + " &middot; 🌇 " + duskWin });
      var bs = 68; if (hot) bs -= 40; else if (warm) bs -= 22; if (smoky) bs -= 30;
      plays.push({ s: bs, ic: "🚵", n: "Ride the slickrock", a: "#biking",
        why: (hot || warm ? "The dirt is dry and fast but " + t + "° punishes exertion — dawn window or skip" : "Dry, fast dirt and " + t + "° — prime riding") + (smoky ? "; heavy breathing + AQI " + aqi + " is a bad mix today" : "") + ".",
        win: "Before ~9 AM &middot; or " + duskWin });
      plays.push({ s: 62 + (warm ? 6 : 0), ic: "📷", n: "Shoot the light", a: "photography.html",
        why: "Golden hour is computed to the minute, and heat doesn't hurt a tripod. Check tonight's sunset score before you pick the spot.",
        win: "🌇 " + duskWin });
      plays.sort(function (x, y) { return y.s - x.s; });
      var medals = ["🥇", "🥈", "🥉"];
      var warns = [];
      if (hot) warns.push("🔥 " + t + "° — heat rules today: dawn, dusk, or water");
      if (uvHigh) warns.push("🧴 UV " + uv + " — burn time is minutes, not hours");
      if (smoky) warns.push("😷 AQI " + aqi + " — unhealthy air, go easy on the lungs");
      else if (aqi != null && aqi > 100) warns.push("😐 AQI " + aqi + " — sensitive folks take it easier");
      el.innerHTML =
        '<div class="pb-card">' +
          '<div class="pb-head"><span class="pb-eyebrow">Today&rsquo;s playbook &middot; computed from right now</span>' +
            '<span class="pb-cond">' + (t != null ? t + "°" : "") + (uv != null ? " &middot; UV " + uv : "") + (aqi != null ? " &middot; AQI " + aqi : "") + (flow != null ? " &middot; creek " + flow.toFixed(0) + " cfs" : "") + '</span></div>' +
          (warns.length ? '<div class="pb-warns">' + warns.map(function (x) { return '<span class="pb-warn">' + x + '</span>'; }).join("") + '</div>' : '') +
          '<div class="pb-plays">' + plays.slice(0, 3).map(function (p, i) {
            return '<a class="pb-play" href="' + p.a + '"><span class="pb-medal">' + medals[i] + '</span>' +
              '<span class="pb-body"><b>' + p.ic + ' ' + p.n + '</b><span class="pb-why">' + p.why + '</span>' +
              '<span class="pb-win">⏱ ' + p.win + '</span></span><span class="pb-go">&rarr;</span></a>';
          }).join("") + '</div>' +
          '<div class="pb-foot">Our call, your desert &mdash; every number above is live (Open-Meteo &middot; USGS gauge 09504420). Conditions change; so does this.</div>' +
        '</div>';
    });
  }
  /* =========================================================
     GEOCACHING — Sedona is world-class cache country, and since the
     big cache databases keep their APIs closed, we run our OWN hunt:
     the KAZM Signal Hunt. Five public landmarks with real coordinates
     (shown in the N ddd° mm.mmm′ format cachers navigate by), a live
     topo map, and a ranger: one tap and your real GPS position ranges
     every waypoint with distance and compass bearing, like a cacher's
     GPSr. Find all five, email the station, get your shoutout on air.
     ========================================================= */
  var GC_WAYPOINTS = [
    { code: "KAZM-01", n: "Uptown Sedona", lat: 34.8697, lon: -111.7610, clue: "Start where the town hums. The dial reads 106.5 here — so does everything else." },
    { code: "KAZM-02", n: "Chapel of the Holy Cross", lat: 34.8322, lon: -111.7666, clue: "A cross set in stone by a student of Wright. Look up from the parking switchbacks." },
    { code: "KAZM-03", n: "Bell Rock Vista", lat: 34.8010, lon: -111.7434, clue: "The butte that rings the valley in. First light sets it on fire — you learned that on the Photography page." },
    { code: "KAZM-04", n: "Cathedral Rock", lat: 34.8203, lon: -111.7930, clue: "The spires that pose for every postcard. The reflection shot is a short walk west." },
    { code: "KAZM-05", n: "Airport Mesa Overlook", lat: 34.8560, lon: -111.7782, clue: "The whole basin at your feet. Stay for the beacons — ours is out there blinking." }
  ];
  function gcDM(dec, isLat) {
    var hemi = isLat ? (dec >= 0 ? "N" : "S") : (dec >= 0 ? "E" : "W");
    var a = Math.abs(dec), d = Math.floor(a), m = (a - d) * 60;
    return hemi + " " + d + "&deg; " + (m < 10 ? "0" : "") + m.toFixed(3) + "&prime;";
  }
  function gcRange(lat1, lon1, lat2, lon2) {
    var rad = Math.PI / 180, R = 3958.8;   // miles
    var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var dist = 2 * R * Math.asin(Math.sqrt(a));
    var y = Math.sin(dLon) * Math.cos(lat2 * rad), x = Math.cos(lat1 * rad) * Math.sin(lat2 * rad) - Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos(dLon);
    var brg = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    var pts = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return { mi: dist, dir: pts[Math.round(brg / 22.5) % 16], deg: Math.round(brg) };
  }
  // ---- the Signal Hunt is a real game: GPS-verified finds saved on the
  // device, a live compass navigator, and a completion certificate you
  // redeem on the air. No login, no server — your phone IS the GPSr.
  var GC_KEY = "kazm-signal-hunt", gcWatch = null, gcHeading = null, gcTarget = -1;
  function gcState() { try { return JSON.parse(localStorage.getItem(GC_KEY) || "{}"); } catch (e) { return {}; } }
  function gcSave(st) { try { localStorage.setItem(GC_KEY, JSON.stringify(st)); } catch (e) {} }
  function gcFmtDist(mi) { return mi < 0.19 ? Math.round(mi * 5280) + " ft" : mi.toFixed(mi < 10 ? 1 : 0) + " mi"; }
  function gcCert(st) {
    var times = GC_WAYPOINTS.map(function (w) { return st[w.code] || 0; });
    var code = times.reduce(function (a, t) { return (a * 31 + Math.floor(t / 1000)) % 2176782336; }, 7).toString(36).toUpperCase();
    while (code.length < 6) code = "0" + code;
    return "SIGNAL-" + code;
  }
  function initGeocache() {
    var el = doc.querySelector("[data-geocache]"); if (!el) return;
    if (gcWatch != null) { try { navigator.geolocation.clearWatch(gcWatch); } catch (e) {} gcWatch = null; }
    gcTarget = -1;
    var progEl = doc.querySelector("[data-gc-progress]"), navEl = doc.querySelector("[data-gc-nav]"), certEl = doc.querySelector("[data-gc-cert]");
    function found() { var st = gcState(), n = 0; GC_WAYPOINTS.forEach(function (w) { if (st[w.code]) n++; }); return n; }
    function drawProgress() {
      if (!progEl) return;
      var st = gcState(), n = found();
      progEl.innerHTML = '<div class="gcp-track">' + GC_WAYPOINTS.map(function (w, i) {
        return '<span class="gcp-stamp' + (st[w.code] ? " is-found" : "") + '" title="' + esc(w.n) + '">' + (st[w.code] ? "✓" : (i + 1)) + '</span>';
      }).join('<i class="gcp-line"></i>') + '</div>' +
      '<span class="gcp-label">' + n + ' of 5 found' + (n > 0 && n < 5 ? ' &middot; keep hunting' : '') + '</span>' +
      (n > 0 ? ' <button class="gcp-reset" data-gc-reset>reset hunt</button>' : '');
      var rs = progEl.querySelector("[data-gc-reset]");
      if (rs) rs.addEventListener("click", function () { if (confirm("Start the Signal Hunt over? Your five finds will be cleared.")) { gcSave({}); drawProgress(); drawCards(); drawCert(); } });
    }
    function drawCert() {
      if (!certEl) return;
      if (found() < 5) { certEl.innerHTML = ""; certEl.hidden = true; return; }
      var st = gcState(), code = gcCert(st);
      certEl.hidden = false;
      certEl.innerHTML = '<div class="gc-cert"><span class="gc-cert-star">📡★📡</span>' +
        '<h3>SIGNAL HUNT COMPLETE</h3>' +
        '<p>All five waypoints, verified by GPS. Your completion code:</p>' +
        '<div class="gc-cert-code">' + code + '</div>' +
        '<p class="gc-cert-note">Call it in during any live show or <a href="contact.html">send it with your five photos</a> &mdash; you&rsquo;ll get your shoutout on the air, hunter.</p>' +
        '<button class="btn btn-secondary" data-gc-copy>⧉ Copy the code</button></div>';
      var cb = certEl.querySelector("[data-gc-copy]");
      if (cb) cb.addEventListener("click", function () { if (navigator.clipboard) navigator.clipboard.writeText("KAZM Signal Hunt complete — code " + code).then(function () { cb.textContent = "✓ Copied"; setTimeout(function () { cb.innerHTML = "⧉ Copy the code"; }, 1600); }); });
    }
    function drawCards() {
      var st = gcState();
      el.innerHTML = GC_WAYPOINTS.map(function (w, i) {
        var f = st[w.code];
        return '<article class="gc-wp' + (f ? " is-found" : "") + '"><div class="gc-wp-top"><span class="gc-code">' + w.code + '</span><h4>' + esc(w.n) + '</h4>' +
          (f ? '<span class="gc-found-badge">✓ FOUND ' + new Date(f).toLocaleDateString("en-US", { month: "short", day: "numeric" }) + '</span>' : '') + '</div>' +
          '<p class="gc-coords">' + gcDM(w.lat, true) + ' &nbsp; ' + gcDM(w.lon, false) + '</p>' +
          '<p class="gc-clue">' + w.clue + '</p>' +
          '<div class="gc-wp-foot"><p class="gc-range" data-gc-range="' + i + '">📡 range unknown &mdash; navigate to hunt it</p>' +
          '<button class="gc-navbtn" data-gc-go="' + i + '">🎯 Navigate</button></div></article>';
      }).join("");
      el.querySelectorAll("[data-gc-go]").forEach(function (b) {
        b.addEventListener("click", function () { startNav(+b.getAttribute("data-gc-go")); });
      });
    }
    // --- the navigator: live compass arrow + closing distance ---
    function startNav(i) {
      gcTarget = i;
      var w = GC_WAYPOINTS[i];
      if (!navEl) return;
      navEl.hidden = false;
      navEl.innerHTML = '<div class="gc-navpanel">' +
        '<div class="gc-nav-head"><span class="gc-nav-t">🎯 Hunting <b>' + w.code + '</b> &middot; ' + esc(w.n) + '</span><button class="gc-nav-x" data-gc-navx aria-label="Stop navigating">✕</button></div>' +
        '<div class="gc-nav-main"><div class="gc-compass"><i class="gc-arrow" data-gc-arrow>➤</i></div>' +
          '<div class="gc-nav-read"><b data-gc-dist>acquiring&hellip;</b><span data-gc-brg></span></div></div>' +
        '<button class="btn btn-primary gc-verify" data-gc-verify disabled>✓ Verify find (get within 250 ft)</button>' +
        '<p class="gc-nav-note">Compass needs a phone held flat; on iPhone tap Navigate again if the arrow doesn&rsquo;t move. No compass? Follow the bearing &mdash; it&rsquo;s true north.</p>' +
      '</div>';
      navEl.scrollIntoView({ behavior: "smooth", block: "center" });
      navEl.querySelector("[data-gc-navx]").addEventListener("click", stopNav);
      var vb = navEl.querySelector("[data-gc-verify]");
      vb.addEventListener("click", function () {
        if (vb.disabled) return;
        var st = gcState(); st[w.code] = Date.now(); gcSave(st);
        drawProgress(); drawCards(); drawCert();
        stopNav();
        if (found() === 5 && certEl) certEl.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      // iOS compass permission rides the same user gesture
      try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission().catch(function () {}); } catch (e) {}
      if (gcWatch == null && navigator.geolocation) {
        gcWatch = navigator.geolocation.watchPosition(onPos, function () {
          var d = navEl.querySelector("[data-gc-dist]"); if (d) d.textContent = "location denied";
        }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 });
      }
    }
    function stopNav() {
      gcTarget = -1;
      if (navEl) { navEl.hidden = true; navEl.innerHTML = ""; }
      if (gcWatch != null) { try { navigator.geolocation.clearWatch(gcWatch); } catch (e) {} gcWatch = null; }
    }
    function onPos(pos) {
      var la = pos.coords.latitude, lo = pos.coords.longitude;
      // range every card while we're at it
      GC_WAYPOINTS.forEach(function (w, i) {
        var r = gcRange(la, lo, w.lat, w.lon), out = el.querySelector('[data-gc-range="' + i + '"]');
        if (out) out.innerHTML = '📡 <b>' + gcFmtDist(r.mi) + '</b> ' + r.dir;
      });
      if (gcTarget < 0 || !navEl || navEl.hidden) return;
      var w = GC_WAYPOINTS[gcTarget], r = gcRange(la, lo, w.lat, w.lon);
      var d = navEl.querySelector("[data-gc-dist]"), bg = navEl.querySelector("[data-gc-brg]"), ar = navEl.querySelector("[data-gc-arrow]"), vb = navEl.querySelector("[data-gc-verify]");
      if (d) d.textContent = gcFmtDist(r.mi);
      if (bg) bg.innerHTML = r.dir + " &middot; " + r.deg + "&deg; true";
      if (ar) { var rot = r.deg - (gcHeading != null ? gcHeading : 0); ar.style.transform = "rotate(" + (rot - 90) + "deg)"; }
      if (vb) {
        var close = r.mi <= 0.0473;   // ~250 ft
        vb.disabled = !close;
        vb.textContent = close ? "✓ VERIFY FIND — you're here!" : "✓ Verify find (" + gcFmtDist(r.mi) + " to go)";
        vb.classList.toggle("is-ready", close);
      }
    }
    function onHead(e) {
      var h = (e.webkitCompassHeading != null) ? e.webkitCompassHeading : (e.absolute && e.alpha != null ? 360 - e.alpha : null);
      if (h != null) gcHeading = h;
    }
    window.addEventListener("deviceorientationabsolute", onHead, true);
    window.addEventListener("deviceorientation", onHead, true);
    drawProgress(); drawCards(); drawCert();
    // one-shot ranging for desktop scouts
    var btn = doc.querySelector("[data-gc-locate]");
    if (btn) btn.addEventListener("click", function () {
      if (!navigator.geolocation) { btn.textContent = "Location not available on this device"; return; }
      btn.textContent = "📡 Acquiring signal…";
      navigator.geolocation.getCurrentPosition(function (pos) {
        onPos(pos);
        btn.textContent = "📡 Ranged — happy hunting";
        setTimeout(function () { btn.textContent = "📡 Range me again"; }, 2500);
      }, function () { btn.textContent = "Location denied — enable it and try again"; });
    });
    // the hunt map
    var mapEl = doc.querySelector("[data-geocache-map]");
    if (mapEl && !mapEl._done) {
      mapEl._done = true;
      loadLeaflet(function (L) {
        if (!L || !mapEl.isConnected) return;
        var map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false, touchZoom: false, doubleClickZoom: false }).setView([34.838, -111.768], 12);
        L.tileLayer(TOPO_TILE, { maxZoom: 16, attribution: "USGS · The National Map" }).addTo(map);
        GC_WAYPOINTS.forEach(function (w) {
          L.circleMarker([w.lat, w.lon], { radius: 9, color: "#b3541e", weight: 2, fillColor: "#f2a444", fillOpacity: .85 })
            .addTo(map).bindPopup("<b>" + w.code + "</b><br>" + w.n);
        });
      });
    }
  }
  // every spot card says exactly when to be there — computed live
  function initSpotTimes() {
    var els = doc.querySelectorAll("[data-spot-when]"); if (!els.length) return;
    var P; try { P = plcPhases(new Date()); } catch (e) { return; }
    function T(dt) { return skyTime(dt, -7); }
    var says = {
      sunset: "🌇 Be there tonight " + T(P.goldPmStart) + "&ndash;" + T(P.sunset),
      sunrise: "🌄 Be there at dawn " + T(P.sunrise) + "&ndash;" + T(P.goldAmEnd),
      afternoon: "🌆 Best from mid-afternoon &middot; blue glow until " + T(P.blueDusk),
      midday: "☀️ Shoots great right through midday — go anytime",
      milky: "🌇 Golden " + T(P.goldPmStart) + " &middot; ✨ stars from " + T(P.darkStart),
      tower: "🔴 Beacons on at dusk " + T(P.sunset) + " &middot; ✨ Milky Way behind the mast from " + T(P.darkStart)
    };
    els.forEach(function (el) { var k = el.getAttribute("data-spot-light"); if (says[k]) el.innerHTML = says[k]; });
  }
  function initSunsetScore() {
    var el = doc.querySelector("[data-sunset-score]"); if (!el) return;
    el.innerHTML = '<p class="rss-loading">Reading the cloud deck&hellip;</p>';
    var P; try { P = plcPhases(new Date()); } catch (e) { el.innerHTML = ""; return; }
    fetch("https://api.open-meteo.com/v1/forecast?latitude=34.8697&longitude=-111.761&hourly=cloud_cover_low,cloud_cover_mid,cloud_cover_high&forecast_days=2&timezone=America%2FPhoenix", { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        if (!el.isConnected) return;
        var u = new Date(P.sunset.valueOf() - 7 * 3600000);
        var key = u.toISOString().slice(0, 13).replace("T", "T");   // match local hour
        var idx = d.hourly.time.findIndex(function (t) { return t.slice(0, 13) === key.slice(0, 13); });
        if (idx < 0) throw 0;
        var lo = d.hourly.cloud_cover_low[idx], mid = d.hourly.cloud_cover_mid[idx], hi = d.hourly.cloud_cover_high[idx];
        var canvas = Math.max(mid, hi), score, label, note;
        if (lo > 65) { score = 25; label = "Socked in"; note = "A low deck on the horizon blocks the show — shoot moody instead."; }
        else if (canvas >= 25 && canvas <= 70) { score = 88; label = "Epic potential"; note = "Mid/high clouds overhead with a clear horizon — that's the canvas that catches fire."; }
        else if (canvas > 85) { score = 48; label = "Heavy deck"; note = "Nearly full cloud overhead — muted and moody unless the sun finds the horizon gap."; }
        else if (canvas > 70) { score = 68; label = "Good chance of color"; note = "A heavy but broken deck — dramatic if the sun finds a gap."; }
        else if (canvas > 10) { score = 72; label = "Decent color likely"; note = "Some cloud to catch the light — worth being in position."; }
        else { score = 55; label = "Clean &amp; clear"; note = "Crisp light on the rocks, simple sky — great for the classics, no fireworks overhead."; }
        score = Math.max(15, Math.round(score - lo * 0.25));
        el.innerHTML =
          '<div class="ssc"><div class="ssc-top"><span class="ssc-num">' + score + '<small>/100</small></span>' +
            '<div><span class="ssc-label">' + label + '</span><span class="ssc-when">sunset ' + skyTime(P.sunset, -7) + '</span></div></div>' +
          '<p class="ssc-note">' + note + '</p>' +
          '<div class="ssc-deck"><span>low ' + lo + '%</span><span>mid ' + mid + '%</span><span>high ' + hi + '%</span></div>' +
          '<p class="ssc-foot">Read from the forecast cloud deck at sunset hour (Open-Meteo) &mdash; a forecast-based read, not a promise.</p></div>';
      })
      .catch(function () { if (el.isConnected) el.innerHTML = '<p class="embed-note">The cloud forecast is unavailable right now.</p>'; });
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

  /* =========================================================
     THE SONG TIME MACHINE (timemachine.html)
     Every spin logged by the n8n play-log workflow the moment it
     airs; this page reads the log. Real plays only — never seeded.
     ========================================================= */
  /* =========================================================
     THE SONG TIME MACHINE (timemachine.html)
     Tune through time on a radio dial: every day since the log
     began is on the band. Real plays only — never seeded.
     ========================================================= */
  function initTimeMachine() {
    var root = doc.querySelector("[data-tm]"); if (!root || root.getAttribute("data-init")) return;
    root.setAttribute("data-init", "1");
    var off = doc.querySelector("[data-tm-off]");
    var PLAYLOG = "https://n8n.mellowmountainradio.com/webhook/kazm-playlog";
    var CHARTS = "https://n8n.mellowmountainradio.com/webhook/kazm-charts";
    var dial = root.querySelector("[data-tm-dial]"), dateIn = root.querySelector("[data-tm-date]"),
      timeIn = root.querySelector("[data-tm-time]"), timeRange = root.querySelector("[data-tm-timerange]"),
      goBtn = root.querySelector("[data-tm-go]"), ansEl = root.querySelector("[data-tm-answer]"),
      dayWrap = root.querySelector("[data-tm-daywrap]"), dayH = root.querySelector("[data-tm-day-h]"),
      dayEl = root.querySelector("[data-tm-day]"), noteEl = root.querySelector("[data-tm-note]"),
      statsEl = root.querySelector("[data-tm-stats]"), podiumEl = root.querySelector("[data-tm-podium]"),
      topEl = root.querySelector("[data-tm-top]"), artEl = root.querySelector("[data-tm-artists]"),
      debEl = root.querySelector("[data-tm-debuts]"),
      roDay = root.querySelector("[data-tm-readout-day]"), roTime = root.querySelector("[data-tm-readout-time]");
    root.hidden = true;
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var dayData = null;
    // the light of each hour — the day log wears the sky's own colors
    var HOURC = ["#141a33","#141a33","#141a33","#141a33","#1c2140","#3a2c55","#c96f4a","#e8a05c","#7d9dc4","#87a9cc","#8fb2d4","#94b8da","#97bbdd","#94b8da","#8fb2d4","#87a9cc","#d9995c","#e8873f","#a04b63","#4a3466","#232a4c","#141a33","#141a33","#141a33"];
    // light chips get dark ink, dark chips get cream — always readable
    var HOURTX = HOURC.map(function (c) {
      var r = parseInt(c.slice(1, 3), 16), g2 = parseInt(c.slice(3, 5), 16), b = parseInt(c.slice(5, 7), 16);
      return (r * .299 + g2 * .587 + b * .114) > 120 ? "#1c2130" : "#f6f0dd";
    });
    function tmEsc(x) { return (x == null ? "" : String(x)).replace(/[&<>"]/g, function (m) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]; }); }
    function fmt12(t) { var hm = t.split(":"), h = +hm[0]; return ((h % 12) || 12) + ":" + hm[1] + (h < 12 ? " AM" : " PM"); }
    function fmtDate(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" }); }
    function fmtShort(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" }); }
    function dstr(dt) { return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }
    function countUp(el, target, suffix) {
      if (reduced) { el.textContent = target.toLocaleString() + (suffix || ""); return; }
      var t0c = performance.now();
      (function tick(now) {
        var p = Math.min(1, (now - t0c) / 900), v = Math.round(target * (1 - Math.pow(1 - p, 3)));
        el.textContent = v.toLocaleString() + (suffix || "");
        if (p < 1) requestAnimationFrame(tick);
      })(t0c);
    }
    /* ── THE DIAL ─────────────────────────────────────────── */
    var D = { since: null, today: null, sel: 0, pos: 0, vel: 0, drag: null, raf: 0, px: 13 };
    function dayIndex(d) { return Math.round((new Date(d + "T12:00:00Z") - new Date(D.since + "T12:00:00Z")) / 86400000); }
    function indexDate(i) { var dt = new Date(D.since + "T12:00:00Z"); dt.setUTCDate(dt.getUTCDate() + i); return dt.toISOString().slice(0, 10); }
    function drawDial() {
      if (!dial || !D.since || !D.today) return;
      var W2 = dial.clientWidth || 800, H2 = 96, dpr = Math.min(2, window.devicePixelRatio || 1);
      if (dial.width !== W2 * dpr) { dial.width = W2 * dpr; dial.height = H2 * dpr; }
      var g = dial.getContext("2d");
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W2, H2);
      var maxI = dayIndex(D.today), cx = W2 / 2;
      var i0 = Math.floor(D.pos - cx / D.px) - 1, i1 = Math.ceil(D.pos + cx / D.px) + 1;
      for (var i = Math.max(0, i0); i <= Math.min(maxI, i1); i++) {
        var x2 = cx + (i - D.pos) * D.px;
        var dt = new Date(D.since + "T12:00:00Z"); dt.setUTCDate(dt.getUTCDate() + i);
        var isMonth = dt.getUTCDate() === 1, isSun = dt.getUTCDay() === 0;
        var near = Math.max(0, 1 - Math.abs(i - D.pos) / (cx / D.px));
        var a = .45 + near * .5;
        g.strokeStyle = "rgba(255,217,138," + a.toFixed(2) + ")";
        g.lineWidth = isMonth ? 2 : 1;
        var th = isMonth ? 34 : (isSun ? 20 : 11);
        g.beginPath(); g.moveTo(x2, H2 - 18); g.lineTo(x2, H2 - 18 - th); g.stroke();
        if (isMonth) {
          g.fillStyle = "rgba(255,231,183," + (.68 + near * .32).toFixed(2) + ")";
          g.font = "700 11px Lato, sans-serif"; g.textAlign = "center";
          g.fillText(dt.toLocaleDateString([], { month: "short", timeZone: "UTC" }).toUpperCase() + " ’" + String(dt.getUTCFullYear()).slice(2), x2, H2 - 4);
        }
      }
      // band edges fade
      var fadeL = g.createLinearGradient(0, 0, 70, 0);
      fadeL.addColorStop(0, "rgba(16,21,44,1)"); fadeL.addColorStop(1, "rgba(16,21,44,0)");
      g.fillStyle = fadeL; g.fillRect(0, 0, 70, H2);
      var fadeR = g.createLinearGradient(W2 - 70, 0, W2, 0);
      fadeR.addColorStop(0, "rgba(16,21,44,0)"); fadeR.addColorStop(1, "rgba(16,21,44,1)");
      g.fillStyle = fadeR; g.fillRect(W2 - 70, 0, 70, H2);
    }
    function setReadout() {
      if (roTime && timeIn.value) roTime.textContent = fmt12(timeIn.value);
      if (!D.since || !D.today) return;
      var d = indexDate(Math.round(Math.max(0, Math.min(dayIndex(D.today), D.pos))));
      if (roDay) roDay.textContent = fmtShort(d);
    }
    function dialSettle() {
      var maxI = dayIndex(D.today);
      D.sel = Math.round(Math.max(0, Math.min(maxI, D.pos)));
      D.pos = D.sel;
      drawDial(); setReadout();
      var d = indexDate(D.sel);
      if (!dayData || dayData.day !== d) loadDay(d, timeIn.value ? renderAnswer : null);
    }
    function dialAnim() {
      D.raf = 0;
      if (D.drag) return;
      D.pos += D.vel; D.vel *= .92;
      var maxI = dayIndex(D.today);
      if (D.pos < 0) { D.pos = 0; D.vel = 0; }
      if (D.pos > maxI) { D.pos = maxI; D.vel = 0; }
      drawDial(); setReadout();
      if (Math.abs(D.vel) > .02) D.raf = requestAnimationFrame(dialAnim);
      else dialSettle();
    }
    if (dial) {
      dial.addEventListener("pointerdown", function (e) {
        dial.setPointerCapture(e.pointerId);
        D.drag = { x: e.clientX, pos: D.pos, moved: false, lastX: e.clientX, lastT: performance.now(), v: 0 };
        if (D.raf) { cancelAnimationFrame(D.raf); D.raf = 0; }
      });
      dial.addEventListener("pointermove", function (e) {
        if (!D.drag) return;
        var dx = e.clientX - D.drag.x;
        if (Math.abs(dx) > 3) D.drag.moved = true;
        D.pos = Math.max(-2, Math.min(dayIndex(D.today) + 2, D.drag.pos - dx / D.px));
        var now = performance.now(), dt2 = now - D.drag.lastT;
        if (dt2 > 0) D.drag.v = -(e.clientX - D.drag.lastX) / D.px / (dt2 / 16.7);
        D.drag.lastX = e.clientX; D.drag.lastT = now;
        drawDial(); setReadout();
      });
      function dialUp(e) {
        if (!D.drag) return;
        var wasClick = !D.drag.moved;
        D.vel = reduced ? 0 : Math.max(-6, Math.min(6, D.drag.v));
        var rect = dial.getBoundingClientRect();
        D.drag = null;
        if (wasClick) {
          D.pos = D.pos + (e.clientX - rect.left - rect.width / 2) / D.px;
          dialSettle();
        } else if (Math.abs(D.vel) > .02 && !reduced) D.raf = requestAnimationFrame(dialAnim);
        else dialSettle();
      }
      dial.addEventListener("pointerup", dialUp);
      dial.addEventListener("pointercancel", function () { D.drag = null; dialSettle(); });
      window.addEventListener("resize", drawDial);
    }
    /* ── ANSWER + DAY LOG ─────────────────────────────────── */
    function setUrl() {
      if (!dayData) return;
      try {
        var u = new URL(location.href);
        u.searchParams.set("d", dayData.day);
        if (timeIn.value) u.searchParams.set("t", timeIn.value); else u.searchParams.delete("t");
        history.replaceState(null, "", u);
      } catch (e) {}
    }
    function renderAnswer() {
      if (!dayData || !timeIn.value) { ansEl.hidden = true; return; }
      var t = timeIn.value, plays = dayData.plays || [];
      var hit = -1;
      for (var i = 0; i < plays.length; i++) { if (plays[i].t <= t) hit = i; else break; }
      var html;
      if (hit < 0) {
        html = '<p class="tm-miss">Nothing on the log yet at ' + fmt12(t) + " that day — " +
          (plays.length ? "the first spin logged was at " + fmt12(plays[0].t) + "." : "no spins were logged that day.") + "</p>";
      } else {
        var p = plays[hit], before = plays[hit - 1], after = plays[hit + 1];
        html = '<div class="tm-hit"><div class="tm-hit-clock"><em>ON THE AIR AT</em><span>' + fmt12(t) + "</span></div>" +
          '<div class="tm-hit-song"><b>' + tmEsc(p.ti) + "</b>" + (p.ar ? "<span>" + tmEsc(p.ar) + "</span>" : "") +
          "<em>needle dropped at " + fmt12(p.t) + "</em></div></div>" +
          '<div class="tm-tape">' +
          (before ? '<button type="button" class="tm-tape-seg" data-tt="' + before.t + '"><i>&#9664;</i><div><b>' + tmEsc(before.ti) + "</b><span>" + fmt12(before.t) + "</span></div></button>" : "<span></span>") +
          '<div class="tm-tape-now">&#9673;</div>' +
          (after ? '<button type="button" class="tm-tape-seg tm-tape-seg--r" data-tt="' + after.t + '"><div><b>' + tmEsc(after.ti) + "</b><span>" + fmt12(after.t) + "</span></div><i>&#9654;</i></button>" : "<span></span>") +
          "</div>";
      }
      var apply = function () {
        ansEl.innerHTML = html; ansEl.hidden = false;
        ansEl.querySelectorAll(".tm-tape-seg").forEach(function (b) {
          b.addEventListener("click", function () { setTime(b.getAttribute("data-tt")); renderAnswer(); });
        });
        setUrl(); setReadout();
        if (hit >= 0) {
          var row = dayEl.querySelector('[data-i="' + hit + '"]');
          if (row) {
            dayEl.querySelectorAll(".is-hit").forEach(function (r) { r.classList.remove("is-hit"); });
            row.classList.add("is-hit"); row.scrollIntoView({ block: "nearest" });
          }
        }
      };
      if (reduced) { apply(); return; }
      ansEl.hidden = false;
      ansEl.classList.add("is-tuning");
      setTimeout(function () { apply(); ansEl.classList.remove("is-tuning"); }, 300);
    }
    function setTime(t) {
      timeIn.value = t;
      if (timeRange) { var hm = t.split(":"); timeRange.value = (+hm[0]) * 60 + (+hm[1]); }
      setReadout();
    }
    function renderDay() {
      if (!dayData) return;
      dayH.textContent = fmtDate(dayData.day) + " — " + (dayData.plays || []).length + " spins logged";
      if (!(dayData.plays || []).length) {
        dayEl.innerHTML = '<p class="embed-note">' + (dayData.since && dayData.day < dayData.since
          ? "The log begins " + fmtDate(dayData.since) + " — radio only remembers forward from there."
          : "No spins logged this day.") + "</p>";
      } else {
        dayEl.innerHTML = dayData.plays.map(function (p, i) {
          var hr = +p.t.split(":")[0];
          return '<button type="button" class="tm-row" data-i="' + i + '" style="--hc:' + HOURC[hr] + ';--ht:' + HOURTX[hr] + '"><span class="tm-row-t">' + fmt12(p.t) + '</span><span class="tm-row-s"><b>' + tmEsc(p.ti) + "</b>" + (p.ar ? " — " + tmEsc(p.ar) : "") + "</span></button>";
        }).join("");
        dayEl.querySelectorAll(".tm-row").forEach(function (r) {
          r.addEventListener("click", function () {
            var p = dayData.plays[+r.getAttribute("data-i")];
            setTime(p.t); renderAnswer();
          });
        });
      }
      dayWrap.hidden = false;
      noteEl.textContent = dayData.since
        ? "The log begins " + fmtDate(dayData.since) + " and runs to right now — every entry is a real spin from the air, spots and all. Times are Sedona time."
        : "";
    }
    function loadDay(d, then) {
      if (dayH) dayH.textContent = "tuning…";
      fetch(PLAYLOG + (d ? "?d=" + encodeURIComponent(d) : ""), { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (j) {
          if (!j || !j.ok) return;
          dayData = j;
          dateIn.value = j.day;
          if (j.since) { dateIn.min = j.since; if (!D.since) { D.since = j.since; } }
          dateIn.max = j.today;
          D.today = j.today;
          if (D.since) { D.pos = D.sel = dayIndex(j.day); drawDial(); setReadout(); }
          renderDay();
          if (then) then();
        }).catch(function () {});
    }
    /* ── CHARTS ───────────────────────────────────────────── */
    function renderCharts(c) {
      var since = c.since ? fmtDate(c.since) : null;
      statsEl.innerHTML = '<span class="tm-stat"><b data-n="' + c.spins + '">0</b> music spins this week</span>' +
        '<span class="tm-stat"><b data-n="' + c.uniques + '">0</b> different songs</span>' +
        (since ? '<span class="tm-stat">the log remembers back to <b>' + tmEsc(since) + "</b></span>" : "");
      statsEl.querySelectorAll("b[data-n]").forEach(function (b) { countUp(b, +b.getAttribute("data-n")); });
      var top = c.top || [];
      if (podiumEl) {
        var med = ["gold", "silver", "bronze"], order = [1, 0, 2];
        podiumEl.innerHTML = top.length >= 3 ? order.map(function (oi) {
          var s = top[oi];
          return '<div class="tm-pod tm-pod--' + med[oi] + '"><span class="tm-pod-rank">' + (oi + 1) + '</span><b>' + tmEsc(s.ti) + "</b><span class=\"tm-pod-ar\">" + tmEsc(s.ar) + '</span><span class="tm-pod-n">' + s.n + " spins</span></div>";
        }).join("") : "";
      }
      var rest = top.slice(3);
      var max = (rest[0] && rest[0].n) || 1;
      topEl.innerHTML = rest.map(function (s, i) {
        return '<li><div class="tm-top-meta" data-rk="' + (i + 4) + '"><b>' + tmEsc(s.ti) + "</b><span>" + tmEsc(s.ar) + "</span></div>" +
          '<div class="tm-bar"><i data-w="' + Math.round(s.n / max * 100) + '"></i><em>' + s.n + "&times;</em></div></li>";
      }).join("") || '<li class="embed-note">Not enough plays logged yet — give it a day on the air.</li>';
      requestAnimationFrame(function () {
        topEl.querySelectorAll(".tm-bar i").forEach(function (b) { b.style.width = b.getAttribute("data-w") + "%"; });
      });
      artEl.innerHTML = (c.topArtists || []).map(function (a) {
        return '<span class="tm-chip">' + tmEsc(a.ar) + " <b>" + a.n + "&times;</b></span>";
      }).join("");
      debEl.innerHTML = (c.debuts || []).map(function (dd) {
        var when = new Date(dd.first).toLocaleDateString([], { month: "short", day: "numeric", timeZone: "America/Phoenix" });
        return '<div class="tm-debut"><span class="tm-badge">FIRST EVER PLAY</span><b>' + tmEsc(dd.ti) + "</b><span>" + tmEsc(dd.ar) + "</span><em>debuted " + when + (dd.n > 1 ? " · " + dd.n + " spins since" : "") + "</em></div>";
      }).join("") || '<p class="embed-note">No debuts in the last 30 days — the classics are holding the fort.</p>';
    }
    /* ── WIRING ───────────────────────────────────────────── */
    goBtn.addEventListener("click", function () {
      if (dayData && dateIn.value === dayData.day) renderAnswer();
      else if (dateIn.value) loadDay(dateIn.value, renderAnswer);
    });
    dateIn.addEventListener("change", function () { if (dateIn.value) loadDay(dateIn.value, timeIn.value ? renderAnswer : null); });
    timeIn.addEventListener("change", function () { if (timeIn.value) { setTime(timeIn.value); renderAnswer(); } });
    if (timeRange) timeRange.addEventListener("input", function () {
      var m = +timeRange.value, t = String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
      timeIn.value = t; setReadout();
    });
    if (timeRange) timeRange.addEventListener("change", function () { renderAnswer(); });
    var probeN = 0;
    function probe() {
      probeN++;
      fetch(CHARTS, { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (c) {
          if (!c || !c.ok) throw new Error("off");
          if (off) off.hidden = true;
          root.hidden = false;
          renderCharts(c);
          if (c.since) D.since = c.since;
          var qs = new URLSearchParams(location.search);
          var d0 = qs.get("d"), t0 = qs.get("t");
          if (t0 && /^\d{2}:\d{2}$/.test(t0)) setTime(t0);
          else setTime(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "America/Phoenix" }));
          loadDay(d0 && /^\d{4}-\d{2}-\d{2}$/.test(d0) ? d0 : null, t0 ? renderAnswer : null);
        })
        .catch(function () {
          // a blip is not an outage: retry quickly, then keep listening
          if (probeN < 3) { setTimeout(probe, 2500 * probeN); return; }
          if (off) off.hidden = false;
          if (probeN < 23 && root.isConnected) setTimeout(probe, 30000);
        });
    }
    probe();
  }

  /* ---- Staff page: "Meet X" audio intros ----
     Real per-person clips at audio/staff/<slug>-intro.mp3 — none exist yet,
     so every button fails silently (caught play() rejection) rather than
     erroring or looking broken. Add the files later and these just work. */
  function initStaffIntros() {
    var btns = doc.querySelectorAll("[data-staff-intro]");
    if (!btns.length) return;
    var current = null, audioCtx = null;

    // Loki's "audio intro" is a real dog bark — synthesized with the Web
    // Audio API rather than a canned mp3, so it works with no asset and
    // varies a little each time. Two quick "woof" bursts: a pitch-dropping
    // sawtooth + a shaped noise transient through a bandpass, each with a
    // sharp amplitude envelope. Honest as a mascot sound effect, not data.
    function bark(btn) {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      try {
        if (!audioCtx) audioCtx = new Ctx();
        if (audioCtx.state === "suspended") audioCtx.resume();
      } catch (e) { return; }
      var ctx = audioCtx, t = ctx.currentTime;
      function woof(t0, pitch) {
        var osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(pitch, t0);
        osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, t0 + 0.16);
        var n = Math.floor(ctx.sampleRate * 0.22), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
        var noise = ctx.createBufferSource(); noise.buffer = buf;
        var bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = pitch * 2.2; bp.Q.value = 0.9;
        var g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(0.85, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
        osc.connect(bp); noise.connect(bp); bp.connect(g); g.connect(ctx.destination);
        osc.start(t0); osc.stop(t0 + 0.22);
        noise.start(t0); noise.stop(t0 + 0.22);
      }
      var base = 380 + Math.random() * 90;
      woof(t, base);
      woof(t + 0.24, base * (0.9 + Math.random() * 0.15));
      btn.classList.add("is-playing");
      window.setTimeout(function () { btn.classList.remove("is-playing"); }, 650);
    }

    btns.forEach(function (btn) {
      var slug = btn.getAttribute("data-staff-intro");
      // The station dog barks — no mp3, just a woof on every click.
      if (slug === "loki") {
        btn.addEventListener("click", function () {
          if (current) { current.audio.pause(); current.audio.currentTime = 0; current.btn.classList.remove("is-playing"); current = null; }
          bark(btn);
        });
        return;
      }
      var audio = new Audio("audio/staff/" + slug + "-intro.mp3");
      audio.preload = "none";
      audio.addEventListener("ended", function () { btn.classList.remove("is-playing"); });
      btn.addEventListener("click", function () {
        if (current && current.audio !== audio) { current.audio.pause(); current.audio.currentTime = 0; current.btn.classList.remove("is-playing"); }
        if (audio.paused) {
          audio.play().then(function () { btn.classList.add("is-playing"); current = { audio: audio, btn: btn }; })
            .catch(function () { /* no clip yet — button just stays put */ });
        } else {
          audio.pause(); audio.currentTime = 0; btn.classList.remove("is-playing"); current = null;
        }
      });
    });
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
    initWildlife();
    initWildPulse();
    initWildBoard();
    initNatureDash();
    initPhotoSubjects();
    initSounds();
    initMountainNotes();
    initDidYouKnow();
    initKidsSpot();
    initNatureMap();
    initTrailMaps();
    initTraffic();
    initSchumann();
    initCosmic();
    initStargaze();
    initLunar();
    initHoroscope();
    initChakras();
    initTarot();
    initSoundHealing();
    initUFC();
    initGolden();
    initLightConsole();
    initSunsetScore();
    initSpotTimes();
    initGeocache();
    initRoads();
    initSkyPage();
    initJeep();
    initLounge();
    initTape();
    initWindow();
    initTimeMachine();
    initPlaybook();
    initHomePulse();
    initRequests();
    initCosmicAudio();
    initGoldenMode();
    initSolstice();
    initStaffIntros();
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
