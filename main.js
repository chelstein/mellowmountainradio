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
  }

  if (audio && listenButtons.length) {
    listenButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (player) { player.classList.add("show"); doc.body.classList.add("has-player"); }
        if (playing) {
          audio.pause();
          return;
        }
        setLabel("Connecting...");
        audio.play().catch(function () {
          setLabel("Listen Live");
          // Autoplay blocked or stream unreachable; surface a gentle hint.
          window.alert("Tap once more to start the live stream.");
        });
      });
    });
    audio.addEventListener("playing", function () { setPlayingState(true); });
    audio.addEventListener("pause", function () { setPlayingState(false); });
    audio.addEventListener("error", function () {
      setPlayingState(false);
      setLabel("Listen Live");
    });
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
        var url = res && res.artworkUrl100 ? res.artworkUrl100.replace("100x100", "512x512") : null;
        artCache[key] = url;
        return url;
      })
      .catch(function () { artCache[key] = null; return null; });
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
        fetchArtwork(s.artist, s.title).then(function (url) {
          var u = url || s.art;
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
          if (song.album) setAll(albumEls, "from " + song.album);
          fetchArtwork(song.artist, song.title).then(function (url) { applyNowArt(url || song.art || null); });
        }
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
