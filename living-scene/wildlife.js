// A single, extremely restrained bit of ambient life: the painted deer
// gets a slow, barely-perceptible weight-shift/breathing motion. This
// is deliberately the ONLY moving foreground creature — a satellite
// dish or a full walk-cycle deer on a still painting reads as fake
// fast, so we spent the "believable motion" budget on one thing done
// quietly rather than several things done cheaply.
//
// Sprite crop position, expressed as a % of the 1536x1024 source image,
// matches deer-sprite.png exactly (feather-masked so it's invisible at
// rest — see the crop math used to produce it).
const SPRITE = { leftPct: 55.99, topPct: 62.5, widthPct: 11.72, heightPct: 12.7 };

export function mountDeer(root) {
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return null;
  const img = document.createElement("img");
  img.src = "living-scene/deer-sprite.png";
  img.alt = "";
  img.setAttribute("aria-hidden", "true");
  img.className = "lounge-deer";
  img.style.left = SPRITE.leftPct + "%";
  img.style.top = SPRITE.topPct + "%";
  img.style.width = SPRITE.widthPct + "%";
  img.style.height = SPRITE.heightPct + "%";
  root.appendChild(img);
  return img;
}
