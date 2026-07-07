// Ambient wildlife on the painted scene. Each entry is a real crop of
// Chuck's own painting, feather-masked so it's invisible at rest.
//
// Sedona's real wildlife includes coyote, javelina, rabbit, and bobcat
// alongside deer, but this painting only has a deer drawn into the
// scene — there's no source art for the others to crop from. Adding
// them means either a reference photo/painting of each at this spot,
// or an AI-generated crop in matching style (untested, may need a few
// tries to not look pasted-in). Until then, deer is the only entry.
//
// Sprite crop position is expressed as % of the 1536x1024 source image.
const CRITTERS = [
  {
    name: "deer",
    sprite: "living-scene/deer-sprite.png",
    leftPct: 55.99, topPct: 62.5, widthPct: 11.72, heightPct: 12.7,
  },
];

// The deer sprite is a single frozen crop — a mule deer with its head
// down, grazing. That one pose is an honest ceiling on what can be
// animated: a real head-lift, ear-twitch, or tail-flick would each need
// its own drawn frame, which doesn't exist.
//
// The sprite crop is also a real constraint on how FAR it can move: its
// feather mask is a soft vignette over the whole crop box, not a tight
// silhouette of just the deer, and the same crop is still baked into
// lounge-foreground.webp underneath it (that's what makes it invisible
// at rest in the first place — the two exactly overlap). A real step to
// a new spot would slide that soft box away from its own twin and show
// both at once, a double-exposed mess neither photo nor painting would
// ever show. So idle motion here stays honestly small and in place —
// breathing and a weight-shift lean — nothing that asks the sprite to
// leave the one spot it's actually cut for.
function startDeerIdle(img) {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // static deer only — no motion for reduced-motion users

  let curX = 0, targetX = 0;        // eased weight-shift offset (px), small and reversible
  let curRot = 0, targetRot = 0;    // eased lean (deg), around the feet
  let bobPhase = Math.random() * 6.283; // grazing nibble bob, its own slow phase
  let raf = null, timer = null;

  function frame(now) {
    if (!img.isConnected) { cancel(); return; }
    // continuous slow breathing — flanks rise from the feet
    const breathe = Math.sin(now / 2300);
    const sy = 1 + 0.012 * breathe;
    const sx = 1 - 0.006 * breathe;
    // a slow, shallow grazing nibble: a little extra downward bob now and
    // then, never rhythmic enough to read as a loop
    bobPhase += 0.0016;
    const bob = Math.max(0, Math.sin(bobPhase)) * 0.6; // px, downward
    // ease position + lean toward their targets
    curX += (targetX - curX) * 0.05;
    curRot += (targetRot - curRot) * 0.05;
    img.style.transform =
      "translate(" + curX.toFixed(2) + "px," + bob.toFixed(2) + "px) " +
      "rotate(" + curRot.toFixed(3) + "deg) scaleY(" + sy.toFixed(4) + ") scaleX(" + sx.toFixed(4) + ")";
    raf = window.requestAnimationFrame(frame);
  }

  function weightShift() {
    // lean onto one side for a few seconds, then settle back to square —
    // small enough (under 2px, under a degree) to stay inside the soft
    // feather's own tolerance rather than exposing it
    const dir = Math.random() < 0.5 ? -1 : 1;
    targetRot = dir * (0.3 + Math.random() * 0.35);
    targetX = dir * (0.6 + Math.random() * 0.9);
    window.setTimeout(function () { targetRot = 0; targetX = 0; }, 2600 + Math.random() * 3200);
  }

  function scheduleNext() {
    // a weight-shift at a random long interval so it never falls into a
    // mechanical loop
    const delay = 20000 + Math.random() * 70000;
    timer = window.setTimeout(function () {
      if (!img.isConnected) return;
      weightShift();
      scheduleNext();
    }, delay);
  }

  function cancel() {
    if (raf) window.cancelAnimationFrame(raf);
    if (timer) window.clearTimeout(timer);
    raf = null; timer = null;
  }

  raf = window.requestAnimationFrame(frame);
  scheduleNext();
}

export function mountWildlife(sceneEl) {
  if (!sceneEl) return null;
  const critter = CRITTERS[Math.floor(Math.random() * CRITTERS.length)];
  const img = document.createElement("img");
  img.src = critter.sprite;
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.className = "lounge-deer";
  img.style.left = critter.leftPct + "%";
  img.style.top = critter.topPct + "%";
  img.style.width = critter.widthPct + "%";
  img.style.height = critter.heightPct + "%";
  sceneEl.appendChild(img);
  startDeerIdle(img);
  return img;
}
