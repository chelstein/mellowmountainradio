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
          '<a role="menuitem" href="news.html#local">Local News</a><a role="menuitem" href="news.html#national">National News</a><a role="menuitem" href="news.html#world">World News</a><a role="menuitem" href="news.html#weather">Traffic &amp; Weather</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="sports"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Sports</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="sports.html#mlb">MLB &middot; Diamondbacks</a><a role="menuitem" href="sports.html#nba">NBA &middot; Suns</a><a role="menuitem" href="sports.html#nfl">NFL &middot; Cardinals</a><a role="menuitem" href="sports.html#college">College &middot; ASU, U of A, NAU</a><a role="menuitem" href="sports.html#ufc">UFC</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="music"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Music &amp; More</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="shows.html">Shows</a><a role="menuitem" href="podcasts.html">Podcasts</a><a role="menuitem" href="schedule.html">Program Schedule</a><a role="menuitem" href="contests.html">Contests</a><a role="menuitem" href="music.html">The Sound</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="events"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">Events</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="events.html#hiking">Hiking</a><a role="menuitem" href="events.html#ski">Ski Report</a><a role="menuitem" href="events.html#biking">Mountain Biking</a><a role="menuitem" href="events.html">All Adventures</a>' +
        '</div></li>' +
        '<li class="has-menu" data-nav="about"><button class="nav-trigger" aria-expanded="false" aria-haspopup="true">About</button><div class="mega" role="menu">' +
          '<a role="menuitem" href="about.html">About KAZM</a><a role="menuitem" href="staff.html">Staff</a><a role="menuitem" href="contact.html">Contact</a><a role="menuitem" href="advertising.html">Advertising</a>' +
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
      '<nav class="footer-col" aria-label="Listen"><h4>Listen</h4><a href="index.html">Home</a><a href="shows.html">Shows</a><a href="schedule.html">Program Schedule</a><a href="music.html">Music &amp; More</a><a href="podcasts.html">Podcasts</a></nav>' +
      '<nav class="footer-col" aria-label="Community"><h4>Community</h4><a href="news.html">News</a><a href="sports.html">Sports</a><a href="news.html#weather">Traffic &amp; Weather</a><a href="events.html">Events</a><a href="contests.html">Contests</a></nav>' +
      '<nav class="footer-col" aria-label="Station"><h4>Station</h4><a href="about.html">About</a><a href="advertising.html">Advertising</a><a href="staff.html">Staff</a><a href="contact.html">Contact</a><a href="http://tee.pub/lic/XYLqEd6IJr8" target="_blank" rel="noopener">Merch</a></nav>' +
    '</div>' +
    '<div class="wrap footer-bottom">' +
      '<p class="footer-freq"><strong>106.5</strong> FM <span class="dot-sep" aria-hidden="true"></span> <strong>780</strong> AM <span class="dot-sep" aria-hidden="true"></span> Sedona, Arizona</p>' +
      '<nav class="footer-legal" aria-label="Legal"><a href="https://publicfiles.fcc.gov/am-profile/KAZM" target="_blank" rel="noopener">Public Inspection File</a><a href="https://publicfiles.fcc.gov/am-profile/KAZM/political-files" target="_blank" rel="noopener">Political File</a><a href="https://publicfiles.fcc.gov/am-profile/KAZM/applications-and-related-materials" target="_blank" rel="noopener">FCC Applications</a><a href="contact.html">Contact</a></nav>' +
      '<p class="footer-copy">&copy; <span data-year>2026</span> Cutter Grind Broadcasting LLC. All rights reserved.</p>' +
    '</div></footer>';

  var PLAYER_HTML =
    '<div class="player" data-player aria-live="polite"><div class="player-inner wrap">' +
      '<div class="player-meta">' +
        '<img class="player-art" data-now-art src="Color%20logo%20-%20no%20background.svg" alt="" aria-hidden="true" />' +
        '<span class="player-eq eq" data-eq aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
        '<span class="player-onair"><span class="onair-dot" aria-hidden="true"></span> On air <span class="player-listeners" data-listeners></span></span>' +
        '<span class="player-track"><span class="player-title" data-now-track>Mellow Mountain Radio</span><span class="player-artist" data-now-artist>106.5 FM &amp; 780 AM</span></span>' +
      '</div>' +
      '<button class="player-btn" data-listen aria-pressed="false" aria-label="Play or pause the live stream">' + ICON_PLAY + ICON_PAUSE + '<span class="player-btn-label" data-listen-label>Listen Live</span></button>' +
    '</div></div>' +
    '<audio id="stream" preload="none" crossorigin="anonymous"><source src="https://streaming.mellowmountainradio.com/listen/mellowmountainradio/radio.mp3" type="audio/mpeg" /><source src="https://streaming.live365.com/a56104" type="audio/mpeg" /></audio>';

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
    setLabel("Connecting...");
    var p = audio.play();
    if (p && p.catch) p.catch(function () { setLabel("Listen Live"); });
  }
  if (audio) {
    audio.addEventListener("playing", function () { setPlayingState(true); });
    audio.addEventListener("pause", function () { setPlayingState(false); });
    audio.addEventListener("error", function () { setPlayingState(false); setLabel("Listen Live"); });
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

  var SCOREBOARD_BASE = "https://n8n.mellowmountainradio.com/webhook/api/scoreboard/";
  function azGameTime(iso) {
    if (!iso) return "Time TBD";
    if (/T\d\d:\d\dZ$/.test(iso)) iso = iso.replace("Z", ":00Z");
    try { return new Date(iso).toLocaleString("en-US", { timeZone: "America/Phoenix", weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }); }
    catch (e) { return "Time TBD"; }
  }
  function loadScoreboard(card) {
    var sport = card.getAttribute("data-sport");
    var timeEl = card.querySelector("[data-sb-time]");
    var awayLogo = card.querySelector("[data-sb-away-logo]"), homeLogo = card.querySelector("[data-sb-home-logo]");
    var awayEl = card.querySelector("[data-sb-away]"), homeEl = card.querySelector("[data-sb-home]");
    function setLogo(img, url, abbr) {
      if (!img) return;
      if (url) { img.onload = function () { img.classList.add("loaded"); }; img.onerror = function () { img.style.visibility = "hidden"; }; img.src = url; img.alt = (abbr || "") + " logo"; }
      else { img.style.visibility = "hidden"; }
    }
    fetch(SCOREBOARD_BASE + sport, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(sport + " " + r.status); return r.json(); })
      .then(function (d) {
        var hasGame = d && !d.error && (d.startTime || d.homeLogo || d.awayLogo);
        if (!hasGame) { card.classList.add("score-card--off"); if (timeEl) timeEl.textContent = "No game scheduled"; if (awayEl) awayEl.textContent = ""; if (homeEl) homeEl.textContent = ""; return; }
        setLogo(awayLogo, d.awayLogo, d.awayAbbr); setLogo(homeLogo, d.homeLogo, d.homeAbbr);
        if (awayEl) awayEl.textContent = d.awayAbbr || "Away";
        if (homeEl) homeEl.textContent = d.homeAbbr || "Home";
        if (timeEl) timeEl.textContent = azGameTime(d.startTime);
      })
      .catch(function () { if (timeEl) timeEl.textContent = "Schedule unavailable"; });
  }
  function initScoreboards() { doc.querySelectorAll(".score-card[data-sport]").forEach(loadScoreboard); }

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
    var starts = [6, 10, 15, 18, 22];
    var hour = new Date().getHours(), current = 0;
    for (var i = 0; i < starts.length; i++) { if (hour >= starts[i]) current = i; }
    if (items[current]) items[current].classList.add("is-live");
  }

  function initPage() {
    initReveal();
    initScoreboards();
    initFeeds();
    initHeritage();
    initSchedule();
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

  /* ---------- first paint ---------- */
  initPage();
})();
