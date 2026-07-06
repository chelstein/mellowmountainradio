// Ambient wildlife on the painted scene. Each entry is a real crop of
// Chuck's own painting, feather-masked so it's invisible at rest, with a
// slow weight-shift/breathing motion — deliberately the only literal
// motion added to the artwork, so it doesn't tip into looking cheap.
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

export function mountWildlife(sceneEl) {
  if (!sceneEl) return null;
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) return null;
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
  return img;
}
