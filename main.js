/* =========================================================
   KAZM / Mellow Mountain Radio - front-end behavior
   - Sticky header state
   - Mobile nav + dropdown toggles
   - Scroll reveal (IntersectionObserver)
   - Live stream play/pause (Live365)
   - Now Playing (sample rotation; swap for real metadata feed)
   - Highlight the current show in today's lineup
   ========================================================= */
(function () {
  "use strict";

  var doc = document;

  /* =========================================================
     SHARED CHROME (header + footer + player) injected on every page
     so there is one source of truth across the whole site.
     ========================================================= */
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

  var headerSlot = doc.querySelector("[data-site-header]");
  if (headerSlot) headerSlot.innerHTML = HEADER_HTML;
  var footerSlot = doc.querySelector("[data-site-footer]");
  if (footerSlot) footerSlot.innerHTML = FOOTER_HTML;
  if (!doc.querySelector("[data-player]")) doc.body.insertAdjacentHTML("beforeend", PLAYER_HTML);

  // active nav state
  var pageKey = doc.body.getAttribute("data-page");
  if (pageKey) {
    var activeLi = doc.querySelector('.nav-list [data-nav="' + pageKey + '"]');
    if (activeLi) activeLi.classList.add("nav-current");
  }

  /* ---------- footer year ---------- */
  var yearEl = doc.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- sticky header ---------- */
  var header = doc.querySelector("[data-header]");
  function onScroll() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- mobile menu ---------- */
  var menuToggle = doc.querySelector("[data-menu-toggle]");
  var nav = doc.querySelector(".primary-nav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
      doc.body.style.overflow = open ? "hidden" : "";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) {
        nav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        doc.body.style.overflow = "";
      }
    });
  }

  /* ---------- dropdown triggers (touch / keyboard) ---------- */
  doc.querySelectorAll(".nav-trigger").forEach(function (trigger) {
    var menu = trigger.nextElementSibling;
    trigger.addEventListener("click", function () {
      var isOpen = menu.classList.contains("open");
      doc.querySelectorAll(".mega.open").forEach(function (m) {
        if (m !== menu) {
          m.classList.remove("open");
          var t = m.previousElementSibling;
          if (t) t.setAttribute("aria-expanded", "false");
        }
      });
      menu.classList.toggle("open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
    });
  });
  doc.addEventListener("click", function (e) {
    if (!e.target.closest(".has-menu")) {
      doc.querySelectorAll(".mega.open").forEach(function (m) {
        m.classList.remove("open");
        var t = m.previousElementSibling;
        if (t) t.setAttribute("aria-expanded", "false");
      });
    }
  });

  /* ---------- scroll reveal ---------- */
  var reveals = doc.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- live stream player ---------- */
  var audio = doc.getElementById("stream");
  var listenButtons = doc.querySelectorAll("[data-listen]");
  var labels = doc.querySelectorAll("[data-listen-label]");
  var player = doc.querySelector("[data-player]");
  var playing = false;

  function setLabel(text) {
    labels.forEach(function (l) { l.textContent = text; });
  }
  function setPlayingState(state) {
    playing = state;
    doc.body.classList.toggle("is-playing", state);
    if (player) { player.classList.add("show"); doc.body.classList.add("has-player"); }
    listenButtons.forEach(function (b) {
      b.classList.toggle("is-playing", state);
      b.setAttribute("aria-pressed", String(state));
    });
    setLabel(state ? "Pause" : "Listen Live");
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = state ? "playing" : "paused";
    updateTabTitle();
  }

  var DEFAULT_TITLE = doc.title;
  var lastNow = null;
  function updateTabTitle() {
    if (playing && lastNow) {
      document.title = "▶ " + lastNow.artist + " · " + lastNow.title + " | KAZM";
    } else {
      document.title = DEFAULT_TITLE;
    }
  }

  function togglePlay() {
    if (!audio) return;
    if (player) { player.classList.add("show"); doc.body.classList.add("has-player"); }
    if (playing) { audio.pause(); return; }
    setLabel("Connecting...");
    var p = audio.play();
    if (p && p.catch) p.catch(function () { setLabel("Listen Live"); });
  }

  if (audio && listenButtons.length) {
    listenButtons.forEach(function (btn) { btn.addEventListener("click", togglePlay); });
    audio.addEventListener("playing", function () { setPlayingState(true); });
    audio.addEventListener("pause", function () { setPlayingState(false); });
    audio.addEventListener("error", function () { setPlayingState(false); setLabel("Listen Live"); });

    // Spacebar toggles the stream (unless typing or focused on a control).
    doc.addEventListener("keydown", function (e) {
      var tag = (e.target && e.target.tagName) || "";
      if ((e.code === "Space" || e.key === " ") && !/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(tag)) {
        e.preventDefault();
        togglePlay();
      }
    });

    // Media Session API: OS lock-screen + media-key control of the live stream.
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.setActionHandler("play", function () { audio.play(); });
        navigator.mediaSession.setActionHandler("pause", function () { audio.pause(); });
        navigator.mediaSession.setActionHandler("stop", function () { audio.pause(); });
      } catch (e) {}
    }
  }

  /* ---------- now playing + recently played (live AzuraCast feed) ----------
     One poll powers the Now Playing card, the sticky player bar, and the
     Recently Played crate. Every recent track links to an Apple Music search.
  ------------------------------------------------------------ */
  var NOWPLAYING_API = "https://streaming.mellowmountainradio.com/api/nowplaying/mellowmountainradio";
  var trackEls = doc.querySelectorAll("[data-now-track]");
  var artistEls = doc.querySelectorAll("[data-now-artist]");
  var albumEls = doc.querySelectorAll("[data-now-album]");
  var artEls = doc.querySelectorAll("[data-now-art]");
  var historyEl = doc.querySelector("[data-history]");
  var LOGO_FALLBACK = "Color%20logo%20-%20no%20background.svg";
  var listenerEls = doc.querySelectorAll("[data-listeners]");

  function setListeners(n) {
    listenerEls.forEach(function (el) {
      if (n && n > 0) { el.textContent = n + " listening"; el.classList.add("show"); }
      else { el.textContent = ""; el.classList.remove("show"); }
    });
  }

  function setAll(nodes, text) {
    if (text == null) return;
    nodes.forEach(function (n) { n.textContent = text; });
  }

  /* Album art: Apple Music (iTunes Search) gives the best covers. We cache by
     artist|title and fall back to the AzuraCast art, then the station logo. */
  var artCache = {};
  function fetchArtwork(artist, title) {
    var key = (artist || "") + "|" + (title || "");
    if (artCache[key] !== undefined) return Promise.resolve(artCache[key]);
    var term = ((artist || "") + " " + (title || "")).trim();
    if (!term) return Promise.resolve(null);
    return fetch("https://itunes.apple.com/search?term=" + encodeURIComponent(term) + "&entity=song&limit=1")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var res = d && d.results && d.results[0];
        var meta = {
          art: res && res.artworkUrl100 ? res.artworkUrl100.replace("100x100", "512x512") : null,
          album: res && res.collectionName ? res.collectionName : null
        };
        artCache[key] = meta;
        return meta;
      })
      .catch(function () { artCache[key] = { art: null, album: null }; return artCache[key]; });
  }

  function applyNowArt(url) {
    artEls.forEach(function (img) {
      if (url) {
        img.onerror = function () { img.onerror = null; img.src = LOGO_FALLBACK; img.classList.remove("is-art"); };
        img.src = url;
        img.classList.add("is-art");
      } else {
        img.src = LOGO_FALLBACK;
        img.classList.remove("is-art");
      }
    });
  }

  function appleMusicUrl(artist, title) {
    var term = ((artist || "") + " " + (title || "")).trim();
    return "https://music.apple.com/us/search?term=" + encodeURIComponent(term);
  }

  var APPLE_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M17.05 12.04c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3.01-.79-1.55.02-2.98.9-3.78 2.29-1.61 2.8-.41 6.94 1.16 9.21.77 1.11 1.69 2.36 2.89 2.31 1.16-.05 1.6-.75 3-.75 1.4 0 1.8.75 3.02.72 1.25-.02 2.04-1.13 2.8-2.25.88-1.29 1.24-2.54 1.26-2.6-.03-.01-2.42-.93-2.44-3.69zM14.79 5.3c.64-.78 1.07-1.86.95-2.94-.92.04-2.04.61-2.7 1.39-.59.69-1.11 1.79-.97 2.85 1.03.08 2.08-.52 2.72-1.3z"/></svg>';

  function renderHistory(history) {
    if (!historyEl || !history || !history.length) return;
    var frag = doc.createDocumentFragment();
    history.slice(0, 8).forEach(function (item) {
      var song = item.song || {};
      var li = doc.createElement("li");
      var a = doc.createElement("a");
      a.className = "recent-card";
      a.href = appleMusicUrl(song.artist, song.title);
      a.target = "_blank";
      a.rel = "noopener";
      a.setAttribute("aria-label", "Find " + (song.title || "this track") + " by " + (song.artist || "") + " on Apple Music");

      var art = doc.createElement("span");
      art.className = "recent-art";
      (function (artEl, s) {
        fetchArtwork(s.artist, s.title).then(function (meta) {
          var u = (meta && meta.art) || s.art;
          if (u) { artEl.style.backgroundImage = "url('" + u + "')"; artEl.classList.add("has-art"); }
        });
      })(art, song);
      var badge = doc.createElement("span");
      badge.className = "recent-apple";
      badge.innerHTML = APPLE_SVG;
      art.appendChild(badge);

      var meta = doc.createElement("span");
      meta.className = "recent-meta";
      var t = doc.createElement("span"); t.className = "recent-title"; t.textContent = song.title || "Unknown";
      var ar = doc.createElement("span"); ar.className = "recent-artist"; ar.textContent = song.artist || "";
      meta.appendChild(t); meta.appendChild(ar);

      a.appendChild(art);
      a.appendChild(meta);
      li.appendChild(a);
      frag.appendChild(li);
    });
    historyEl.innerHTML = "";
    historyEl.appendChild(frag);
  }

  function fetchNowPlaying() {
    fetch(NOWPLAYING_API, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("np " + r.status); return r.json(); })
      .then(function (data) {
        var song = data && data.now_playing && data.now_playing.song;
        if (song) {
          setAll(trackEls, song.title || "Mellow Mountain Radio");
          setAll(artistEls, song.artist || "106.5 FM & 780 AM");
          lastNow = { title: song.title || "Mellow Mountain Radio", artist: song.artist || "KAZM" };
          updateTabTitle();
          fetchArtwork(song.artist, song.title).then(function (meta) {
            var artUrl = (meta && meta.art) || song.art || null;
            applyNowArt(artUrl);
            var album = song.album || (meta && meta.album) || "";
            setAll(albumEls, album ? "from " + album : "");
            if ("mediaSession" in navigator && window.MediaMetadata) {
              navigator.mediaSession.metadata = new MediaMetadata({
                title: lastNow.title,
                artist: lastNow.artist,
                album: album || "Mellow Mountain Radio",
                artwork: [{ src: artUrl || "Color%20logo%20with%20background.png", sizes: "512x512", type: "image/jpeg" }]
              });
            }
          });
        }
        var lc = data && data.listeners ? (data.listeners.current != null ? data.listeners.current : data.listeners.total) : null;
        setListeners(lc);
        renderHistory(data && data.song_history);
      })
      .catch(function () { /* keep last known values on screen */ });
  }

  if (trackEls.length || historyEl) {
    fetchNowPlaying();
    setInterval(fetchNowPlaying, 20000);
  }

  /* ---------- live sports scoreboards (n8n webhooks) ---------- */
  var SCOREBOARD_BASE = "https://n8n.mellowmountainradio.com/webhook/api/scoreboard/";

  function azGameTime(iso) {
    if (!iso) return "Time TBD";
    if (/T\d\d:\d\dZ$/.test(iso)) iso = iso.replace("Z", ":00Z"); // add missing seconds
    try {
      return new Date(iso).toLocaleString("en-US", {
        timeZone: "America/Phoenix", weekday: "short", month: "short",
        day: "numeric", hour: "numeric", minute: "2-digit"
      });
    } catch (e) { return "Time TBD"; }
  }

  function loadScoreboard(card) {
    var sport = card.getAttribute("data-sport");
    var timeEl = card.querySelector("[data-sb-time]");
    var awayLogo = card.querySelector("[data-sb-away-logo]");
    var homeLogo = card.querySelector("[data-sb-home-logo]");
    var awayEl = card.querySelector("[data-sb-away]");
    var homeEl = card.querySelector("[data-sb-home]");

    function setLogo(img, url, abbr) {
      if (!img) return;
      if (url) {
        img.onload = function () { img.classList.add("loaded"); };
        img.onerror = function () { img.style.visibility = "hidden"; };
        img.src = url;
        img.alt = (abbr || "") + " logo";
      } else {
        img.style.visibility = "hidden";
      }
    }

    fetch(SCOREBOARD_BASE + sport, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(sport + " " + r.status); return r.json(); })
      .then(function (d) {
        var hasGame = d && !d.error && (d.startTime || d.homeLogo || d.awayLogo);
        if (!hasGame) {
          card.classList.add("score-card--off");
          if (timeEl) timeEl.textContent = "No game scheduled";
          if (awayEl) awayEl.textContent = "";
          if (homeEl) homeEl.textContent = "";
          return;
        }
        setLogo(awayLogo, d.awayLogo, d.awayAbbr);
        setLogo(homeLogo, d.homeLogo, d.homeAbbr);
        if (awayEl) awayEl.textContent = d.awayAbbr || "Away";
        if (homeEl) homeEl.textContent = d.homeAbbr || "Home";
        if (timeEl) timeEl.textContent = azGameTime(d.startTime);
      })
      .catch(function () { if (timeEl) timeEl.textContent = "Schedule unavailable"; });
  }

  doc.querySelectorAll(".score-card[data-sport]").forEach(loadScoreboard);

  /* ---------- RSS / Atom news feeds ----------
     Any element with data-rss="<feed url>" is filled with the latest items.
     Tries the feed directly (same-origin in production), then a CORS proxy.
  ------------------------------------------------------------ */
  function stripHtml(str) {
    if (!str) return "";
    var d = doc.createElement("div");
    d.innerHTML = str;
    return (d.textContent || "").replace(/\s+/g, " ").trim();
  }
  function feedText(node, tag) {
    var el = node.getElementsByTagName(tag)[0];
    return el ? el.textContent : "";
  }
  function feedDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return "";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  function parseFeed(text) {
    var xml = new DOMParser().parseFromString(text, "text/xml");
    var items = [];
    var entries = xml.getElementsByTagName("entry");
    if (entries.length) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        var link = "";
        var links = e.getElementsByTagName("link");
        if (links.length) link = links[0].getAttribute("href") || "";
        items.push({
          title: feedText(e, "title"),
          link: link,
          date: feedDate(feedText(e, "updated") || feedText(e, "published")),
          summary: stripHtml(feedText(e, "summary") || feedText(e, "content"))
        });
      }
    } else {
      var its = xml.getElementsByTagName("item");
      for (var j = 0; j < its.length; j++) {
        var it = its[j];
        items.push({
          title: feedText(it, "title"),
          link: feedText(it, "link"),
          date: feedDate(feedText(it, "pubDate")),
          summary: stripHtml(feedText(it, "description"))
        });
      }
    }
    return items;
  }
  function fetchFeed(url) {
    return fetch(url, { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error("direct"); return r.text(); })
      .then(parseFeed)
      .catch(function () {
        return fetch("https://api.allorigins.win/raw?url=" + encodeURIComponent(url), { cache: "no-store" })
          .then(function (r) { if (!r.ok) throw new Error("proxy"); return r.text(); })
          .then(parseFeed);
      });
  }
  function renderFeed(el, items, limit) {
    if (!items || !items.length) { el.innerHTML = '<p class="embed-note">No stories posted yet.</p>'; return; }
    var html = "";
    items.slice(0, limit).forEach(function (it) {
      var t = it.title || "Untitled";
      var open = it.link ? '<a href="' + it.link + '" target="_blank" rel="noopener">' : "<span>";
      var close = it.link ? "</a>" : "</span>";
      var sum = it.summary ? it.summary.slice(0, 180) + (it.summary.length > 180 ? "..." : "") : "";
      html += '<article class="rss-item">' +
        (it.date ? '<span class="rss-date">' + it.date + "</span>" : "") +
        "<h3>" + open + t + close + "</h3>" +
        (sum ? '<p class="rss-summary">' + sum + "</p>" : "") +
      "</article>";
    });
    el.innerHTML = html;
  }
  doc.querySelectorAll("[data-rss]").forEach(function (el) {
    var url = el.getAttribute("data-rss");
    var limit = parseInt(el.getAttribute("data-rss-limit") || "8", 10);
    el.innerHTML = '<p class="rss-loading">Loading the latest headlines...</p>';
    fetchFeed(url)
      .then(function (items) { renderFeed(el, items, limit); })
      .catch(function () { el.innerHTML = '<p class="embed-note">The news feed is unavailable right now. Tune in for the latest on air.</p>'; });
  });

  /* ---------- heritage logo rotator (1974 -> today) ---------- */
  var rotator = doc.querySelector("[data-logo-rotator]");
  if (rotator) {
    var logos = rotator.querySelectorAll(".heritage-logo");
    var eraLabel = rotator.querySelector("[data-era-label]");
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (logos.length > 1 && !reduceMotion) {
      var li = 0;
      logos.forEach(function (l, i) { if (l.classList.contains("is-active")) li = i; });
      setInterval(function () {
        logos[li].classList.remove("is-active");
        li = (li + 1) % logos.length;
        logos[li].classList.add("is-active");
        if (eraLabel) eraLabel.textContent = logos[li].getAttribute("data-era") || "";
      }, 3200);
    }
  }

  /* ---------- highlight current show ---------- */
  var lineup = doc.querySelector("[data-schedule]");
  if (lineup) {
    var items = lineup.querySelectorAll("li");
    var starts = [6, 10, 15, 18, 22]; // 6a, 10a, 3p, 6p, 10p (MST, 24h)
    var hour = new Date().getHours();
    var current = 0;
    for (var i = 0; i < starts.length; i++) {
      if (hour >= starts[i]) current = i;
    }
    if (items[current]) items[current].classList.add("is-live");
  }
})();
