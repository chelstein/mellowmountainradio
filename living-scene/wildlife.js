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
// its own drawn frame, which doesn't exist. So the idle state machine
// below only ever does what genuinely reads as "a grazing deer moving
// around its patch" with this one pose — continuous slow breathing, an
// occasional weight-shift lean, and a rare small step to fresh grass —
// scheduled at random 20–90s intervals so it never falls into a
// mechanical loop. Everything is a transform on the single <img>; the
// pose itself never changes, because there's no second frame to change
// it to.
function startDeerIdle(img) {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return; // static deer only — no motion for reduced-motion users

  let homeX = 0;                    // resting horizontal offset (px), drifts with steps
  let curX = 0, targetX = 0;        // eased horizontal position
  let curRot = 0, targetRot = 0;    // eased lean (deg), around the feet
  let hopT0 = -1;                   // step-hop animation start (performance.now), -1 = idle
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
    // a step adds a brief, small vertical hop (weight transferring onto a
    // hoof) so a step reads as a step, not a slide
    let hop = 0;
    if (hopT0 >= 0) {
      const p = (now - hopT0) / 520;
      if (p >= 1) { hopT0 = -1; } else { hop = -Math.sin(p * Math.PI) * 2.2; }
    }
    img.style.transform =
      "translate(" + curX.toFixed(2) + "px," + (bob + hop).toFixed(2) + "px) " +
      "rotate(" + curRot.toFixed(3) + "deg) scaleY(" + sy.toFixed(4) + ") scaleX(" + sx.toFixed(4) + ")";
    raf = window.requestAnimationFrame(frame);
  }

  function weightShift() {
    // lean onto one side for a few seconds, then settle back to square
    const dir = Math.random() < 0.5 ? -1 : 1;
    targetRot = dir * (0.35 + Math.random() * 0.4);
    targetX = homeX + dir * (0.8 + Math.random() * 1.2);
    window.setTimeout(function () { targetRot = 0; targetX = homeX; }, 2600 + Math.random() * 3200);
  }

  function step() {
    // one small step to fresh grass, staying inside a tight home range so
    // the deer never wanders into the fence/dish or off the plate
    const dir = homeX > 6 ? -1 : homeX < -6 ? 1 : (Math.random() < 0.5 ? -1 : 1);
    homeX = Math.max(-13, Math.min(13, homeX + dir * (4 + Math.random() * 5)));
    targetX = homeX;
    hopT0 = performance.now();
  }

  function scheduleNext() {
    // "average movement every 20–90 seconds" — mostly just breathing,
    // with a discrete behavior at a random long interval, weighted toward
    // the smaller weight-shift over the rarer step
    const delay = 20000 + Math.random() * 70000;
    timer = window.setTimeout(function () {
      if (!img.isConnected) return;
      if (Math.random() < 0.7) weightShift(); else step();
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
