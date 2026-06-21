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
  var playing = false;

  function setLabel(text) {
    labels.forEach(function (l) { l.textContent = text; });
  }
  function setPlayingState(state) {
    playing = state;
    doc.body.classList.toggle("is-playing", state);
    listenButtons.forEach(function (b) {
      b.classList.toggle("is-playing", state);
      b.setAttribute("aria-pressed", String(state));
    });
    setLabel(state ? "Pause" : "Listen Live");
  }

  if (audio && listenButtons.length) {
    listenButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
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

  /* ---------- now playing ----------
     Sample data so the card feels alive. To wire real metadata,
     poll your Live365 (or other) now-playing endpoint and update
     these three nodes. Example:
       fetch("https://api.live365.com/station/a56104")
         .then(r => r.json()).then(updateNowPlaying);
  ------------------------------------------------------------ */
  var nowTrack = doc.querySelector("[data-now-track]");
  var nowArtist = doc.querySelector("[data-now-artist]");
  var nowAlbum = doc.querySelector("[data-now-album]");

  var sampleQueue = [
    { track: "You Make Loving Fun", artist: "Fleetwood Mac", album: "from Rumours" },
    { track: "What a Fool Believes", artist: "The Doobie Brothers", album: "from Minute by Minute" },
    { track: "Peg", artist: "Steely Dan", album: "from Aja" },
    { track: "Sara Smile", artist: "Hall & Oates", album: "from Daryl Hall & John Oates" },
    { track: "Dance With Me", artist: "Orleans", album: "from Let There Be Music" }
  ];
  var qi = 0;

  function updateNowPlaying(data) {
    if (!nowTrack) return;
    nowTrack.textContent = data.track;
    if (nowArtist) nowArtist.textContent = data.artist;
    if (nowAlbum) nowAlbum.textContent = data.album || "";
  }

  if (nowTrack) {
    setInterval(function () {
      qi = (qi + 1) % sampleQueue.length;
      updateNowPlaying(sampleQueue[qi]);
    }, 12000);
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
