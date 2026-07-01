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
          '<a role="menuitem" href="library.html">Library Events</a><a role="menuitem" href="events.html#hiking">Hiking</a><a role="menuitem" href="events.html#ski">Ski Report</a><a role="menuitem" href="events.html#biking">Mountain Biking</a><a role="menuitem" href="events.html">All Adventures</a>' +
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
      '<nav class="footer-col" aria-label="Listen"><h4>Listen</h4><a href="index.html">Home</a><a href="concerts.html">Concerts</a><a href="movies.html">Movies</a><a href="shows.html">Shows</a><a href="schedule.html">Program Schedule</a><a href="music.html">Music &amp; More</a><a href="podcasts.html">Podcasts</a></nav>' +
      '<nav class="footer-col" aria-label="Community"><h4>Community</h4><a href="news.html">News</a><a href="sports.html">Sports</a><a href="news.html#traffic">Traffic &amp; Weather</a><a href="library.html">Library Events</a><a href="events.html">Events</a><a href="contests.html">Contests</a></nav>' +
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
        '<span class="player-eq eq" data-eq aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
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
    var c = v <= 50 ? ["Good", "g"] : v <= 100 ? ["Moderate", "m"] : v <= 150 ? ["Unhealthy for sensitive groups", "u1"]
      : v <= 200 ? ["Unhealthy", "u2"] : v <= 300 ? ["Very unhealthy", "u3"] : ["Hazardous", "hz"];
    return { v: Math.round(v), label: c[0], cls: c[1] };
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
  function renderHike(box, d, fire) {
    var c = d.current, day = d.daily, w = wxInfo(c.weather_code, c.is_day), i = day.sunrise.length - 1;
    var temp = Math.round(c.temperature_2m), uv = Math.round((day.uv_index_max || [])[i] || 0), dry = trailDry(day);
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
        advStat("UV index", uv + " · " + uvWord) + advStat("Fire", fireV) + '</div>' +
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
      Promise.all([fetch(u, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }), fp]).then(function (res) {
        var d = res[0];
        if (!d || !d.current) { if (hike) hike.innerHTML = advErr(); if (bike) bike.innerHTML = advErr(); return; }
        if (hike && hike.isConnected) renderHike(hike, d, res[1]);
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
    initAdventures();
    initTraffic();
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

  /* ---------- first paint ---------- */
  initPage();
})();
