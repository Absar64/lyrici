// Lyric effects: a registry of animations plus the runtime that plays them.
//
// Burst effects are particles drawn on a canvas, anchored to the word being
// sung. Text effects are CSS animations applied to the word element itself.
// Both read their numbers from an assignment's params, so every effect is
// customisable per word, per song.

/* ================= registry ================= */

// `controls` drives the parameter editor in the builder:
//   [key, label, kind, options]  — kind is range | select | color | toggle
export const EFFECTS = [
  /* ---- background bursts ---- */
  {
    id: "hearts",
    name: "Hearts",
    kind: "burst",
    icon: "♥",
    blurb: "Hearts drift upward from the word",
    defaults: { count: 24, size: 30, speed: 1, spread: 90, life: 2600, sway: 1, origin: "word", layer: "behind" },
  },
  {
    id: "kiss",
    name: "Kiss",
    kind: "burst",
    icon: "💋",
    blurb: "Kisses burst outward and tumble down",
    defaults: { count: 16, size: 34, speed: 1.2, spread: 360, life: 1900, sway: 0.2, origin: "word", layer: "behind" },
  },
  {
    id: "balloons",
    name: "Balloons",
    kind: "burst",
    icon: "🎈",
    blurb: "Balloons rise slowly, swaying as they go",
    defaults: { count: 12, size: 46, speed: 0.6, spread: 60, life: 5200, sway: 1.6, origin: "bottom", layer: "behind" },
  },
  {
    id: "confetti",
    name: "Confetti",
    kind: "burst",
    icon: "▰",
    blurb: "A shower of spinning paper",
    defaults: { count: 70, size: 11, speed: 1.4, spread: 160, life: 2400, sway: 0.4, origin: "word", layer: "front" },
  },
  {
    id: "sparkles",
    name: "Sparkles",
    kind: "burst",
    icon: "✦",
    blurb: "Twinkles that flare around the word",
    defaults: { count: 28, size: 18, speed: 0.5, spread: 360, life: 1500, sway: 0.3, origin: "word", layer: "front" },
  },
  {
    id: "stardust",
    name: "Stardust",
    kind: "burst",
    icon: "✧",
    blurb: "Slow glittering fall from above",
    defaults: { count: 40, size: 14, speed: 0.5, spread: 220, life: 3400, sway: 1.2, origin: "top", layer: "behind" },
  },

  {
    id: "flames",
    name: "Flames",
    kind: "burst",
    icon: "🔥",
    blurb: "Fire licks upward and shrinks away",
    defaults: { count: 30, size: 26, speed: 1, spread: 50, life: 1800, sway: 0.6, origin: "word", layer: "behind" },
  },
  {
    id: "snow",
    name: "Snow",
    kind: "burst",
    icon: "❄",
    blurb: "Flakes drift down across the screen",
    defaults: { count: 60, size: 16, speed: 0.5, spread: 120, life: 6000, sway: 1.4, origin: "top", layer: "behind" },
  },
  {
    id: "bubbles",
    name: "Bubbles",
    kind: "burst",
    icon: "◌",
    blurb: "Soft bubbles wobble upward",
    defaults: { count: 26, size: 26, speed: 0.7, spread: 70, life: 4200, sway: 1.2, origin: "word", layer: "behind" },
  },
  {
    id: "petals",
    name: "Petals",
    kind: "burst",
    icon: "❀",
    blurb: "Blossom tumbles down on the breeze",
    defaults: { count: 34, size: 22, speed: 0.6, spread: 160, life: 4800, sway: 1.5, origin: "top", layer: "behind" },
  },
  {
    id: "notes",
    name: "Music notes",
    kind: "burst",
    icon: "♪",
    blurb: "Notes float up from the word",
    defaults: { count: 18, size: 30, speed: 0.9, spread: 80, life: 2800, sway: 1.1, origin: "word", layer: "behind" },
  },
  {
    id: "fireworks",
    name: "Fireworks",
    kind: "burst",
    icon: "✺",
    blurb: "A bright shell bursts and falls away",
    defaults: { count: 90, size: 7, speed: 1.6, spread: 360, life: 2000, sway: 0.2, origin: "centre", layer: "front" },
  },

  /* ---- text effects ---- */
  {
    id: "slam",
    name: "Slam",
    kind: "text",
    icon: "⤓",
    blurb: "Crashes in oversized and settles hard",
    defaults: { duration: 700, scale: 3.2, shake: true, color: "#ffffff" },
  },
  {
    id: "emphasis",
    name: "Big & loud",
    kind: "text",
    icon: "A",
    blurb: "Swells large and bright, then eases back",
    defaults: { duration: 900, scale: 1.7, shake: false, color: "#ffffff" },
  },
  {
    id: "spotlight",
    name: "Spotlight",
    kind: "text",
    icon: "◎",
    blurb: "Everything dims but this word",
    defaults: { duration: 1600, scale: 1.12, dim: 0.06, color: "#ffffff" },
  },
  {
    id: "shake",
    name: "Shake",
    kind: "text",
    icon: "≈",
    blurb: "Rattles in place",
    defaults: { duration: 600, scale: 1.08, shake: false, color: "#ffffff" },
  },
  {
    id: "glow",
    name: "Glow",
    kind: "text",
    icon: "☀",
    blurb: "Blooms with light and fades",
    defaults: { duration: 1400, scale: 1.1, color: "#ffd9a0" },
  },
  {
    id: "flash",
    name: "Colour flash",
    kind: "text",
    icon: "◐",
    blurb: "Snaps to a colour and back",
    defaults: { duration: 800, scale: 1.0, color: "#ff5f8f" },
  },
  {
    id: "bounce",
    name: "Bounce",
    kind: "text",
    icon: "⇅",
    blurb: "Hops up and lands with a squash",
    defaults: { duration: 900, scale: 1.3, shake: false, color: "#ffffff" },
  },
  {
    id: "glitch",
    name: "Glitch",
    kind: "text",
    icon: "⌁",
    blurb: "Tears apart into colour fringes",
    defaults: { duration: 700, scale: 1.1, shake: false, color: "#7dd3fc" },
  },
  {
    id: "neon",
    name: "Neon flicker",
    kind: "text",
    icon: "≋",
    blurb: "Stutters on like a tube sign",
    defaults: { duration: 1600, scale: 1.08, color: "#8be9fd" },
  },
  {
    id: "rainbow",
    name: "Rainbow",
    kind: "text",
    icon: "◉",
    blurb: "Sweeps through the spectrum",
    defaults: { duration: 1800, scale: 1.15, color: "#ff5f8f" },
  },
  {
    id: "rise",
    name: "Rise",
    kind: "text",
    icon: "↑",
    blurb: "Fades up into place from below",
    defaults: { duration: 1000, scale: 1, color: "#ffffff" },
  },
  {
    id: "pulse",
    name: "Heartbeat",
    kind: "text",
    icon: "♡",
    blurb: "Two beats, like a pulse",
    defaults: { duration: 1200, scale: 1.35, color: "#ffffff" },
  },
];

const BY_ID = new Map(EFFECTS.map((effect) => [effect.id, effect]));

export const getEffect = (id) => BY_ID.get(id);

// Controls shown for an effect, derived from the kind plus a few specials.
export function controlsFor(effect) {
  if (effect.kind === "burst") {
    return [
      ["count", "Amount", "range", { min: 1, max: 160, step: 1 }],
      ["size", "Size", "range", { min: 4, max: 90, step: 1, unit: "px" }],
      ["speed", "Speed", "range", { min: 0.2, max: 3, step: 0.05, unit: "×" }],
      ["spread", "Spread", "range", { min: 10, max: 360, step: 5, unit: "°" }],
      ["life", "Lifetime", "range", { min: 400, max: 8000, step: 100, unit: "ms" }],
      ["sway", "Sway", "range", { min: 0, max: 3, step: 0.1, unit: "×" }],
      ["origin", "Starts from", "select", { choices: ["word", "centre", "bottom", "top"] }],
      ["layer", "Depth", "select", { choices: ["behind", "front"], labels: ["behind lyrics", "in front"] }],
    ];
  }

  const controls = [
    ["duration", "Duration", "range", { min: 200, max: 4000, step: 50, unit: "ms" }],
    ["scale", "Intensity", "range", { min: 1, max: 4, step: 0.02, unit: "×" }],
  ];
  if (effect.id === "spotlight") controls.push(["dim", "Everything else", "range", { min: 0, max: 0.6, step: 0.01 }]);
  if ("shake" in effect.defaults) controls.push(["shake", "Shake the screen", "toggle"]);
  controls.push(["color", "Colour", "color"]);
  return controls;
}

/* ================= particle spawning ================= */

const rand = (min, max) => min + Math.random() * (max - min);
const pick = (list) => list[Math.floor(Math.random() * list.length)];

const GLYPHS = {
  hearts: ["❤️", "💗", "💖", "💘"],
  kiss: ["💋", "😘", "💄"],
  balloons: ["🎈"],
  sparkles: ["✦", "✧", "★", "✨"],
  stardust: ["✧", "·", "✦", "⋆"],
  flames: ["🔥"],
  snow: ["❄", "❅", "❆", "·"],
  petals: ["🌸", "❀", "✿", "🌺"],
  notes: ["♪", "♫", "♬", "♩"],
};

const CONFETTI_COLORS = ["#ff5f8f", "#ffd166", "#6ee7b7", "#7dd3fc", "#c4b5fd", "#fb923c"];
const FIREWORK_COLORS = ["#ffd166", "#ff5f8f", "#7dd3fc", "#ffffff", "#c4b5fd", "#6ee7b7"];

// Where a burst begins, in the canvas's own coordinates. `view` is the canvas
// box and `rect` the word's position already translated into it — never the
// window, whose size differs from the canvas on iOS, where the dynamic
// toolbars make innerHeight and the fixed-position box disagree.
function originPoint(origin, rect, view) {
  const w = view.width;
  const h = view.height;
  switch (origin) {
    case "bottom": return { x: rand(0, w), y: h + 40, scatter: true };
    case "top": return { x: rand(0, w), y: -40, scatter: true };
    case "centre": return { x: w / 2, y: h / 2, scatter: false };
    default: return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, scatter: false }
      : { x: w / 2, y: h / 2, scatter: false };
  }
}

// Each effect gets its own motion. Velocities are px/s, accelerations px/s².
function spawn(effect, params, rect, view) {
  const count = Math.max(1, Math.round(params.count));
  const particles = [];

  for (let i = 0; i < count; i += 1) {
    const point = originPoint(params.origin, rect, view);
    const base = {
      x: point.x + (point.scatter ? 0 : rand(-26, 26)),
      y: point.y + (point.scatter ? 0 : rand(-14, 14)),
      size: params.size * rand(0.7, 1.3),
      rot: rand(-0.4, 0.4),
      vr: rand(-1.6, 1.6),
      age: 0,
      shrink: false,
      life: (params.life / 1000) * rand(0.8, 1.15),
      swayAmp: rand(8, 26) * params.sway,
      swayRate: rand(0.9, 2.1),
      swayPhase: rand(0, Math.PI * 2),
      drag: 1,
      twinkle: 0,
      kind: "glyph",
      glyph: pick(GLYPHS[effect.id] ?? ["•"]),
      color: null,
    };

    const spreadRad = (params.spread * Math.PI) / 180;

    switch (effect.id) {
      case "hearts": {
        const angle = -Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(150, 300) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v * 0.4, vy: Math.sin(angle) * v, ax: 0, ay: 60 });
        break;
      }
      case "kiss": {
        const angle = rand(0, spreadRad) - spreadRad / 2 - Math.PI / 2;
        const v = rand(220, 460) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, ax: 0, ay: 900, drag: 0.995, vr: rand(-5, 5) });
        break;
      }
      case "balloons": {
        const angle = -Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(70, 130) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v * 0.3, vy: Math.sin(angle) * v, ax: 0, ay: -6, vr: rand(-0.5, 0.5) });
        break;
      }
      case "confetti": {
        const angle = -Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(260, 620) * params.speed;
        Object.assign(base, {
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          ax: 0,
          ay: 780,
          drag: 0.985,
          vr: rand(-9, 9),
          kind: "rect",
          color: pick(CONFETTI_COLORS),
        });
        break;
      }
      case "sparkles": {
        const angle = rand(0, Math.PI * 2);
        const v = rand(30, 160) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v, vy: Math.sin(angle) * v, ax: 0, ay: 10, drag: 0.94, twinkle: rand(6, 13) });
        break;
      }
      case "flames": {
        const angle = -Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(130, 260) * params.speed;
        // Negative gravity keeps flames accelerating upward as they shrink.
        Object.assign(base, { vx: Math.cos(angle) * v * 0.5, vy: Math.sin(angle) * v, ax: 0, ay: -120, shrink: true, twinkle: rand(14, 24) });
        break;
      }
      case "snow": {
        const angle = Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(40, 90) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v * 0.4, vy: Math.sin(angle) * v, ax: 0, ay: 8, vr: rand(-0.6, 0.6) });
        break;
      }
      case "bubbles": {
        const angle = -Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(60, 130) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v * 0.4, vy: Math.sin(angle) * v, ax: 0, ay: -10, drag: 0.995, kind: "bubble", vr: 0 });
        break;
      }
      case "petals": {
        const angle = Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(50, 110) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v * 0.6, vy: Math.sin(angle) * v, ax: 0, ay: 14, vr: rand(-2.4, 2.4) });
        break;
      }
      case "notes": {
        const angle = -Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(90, 190) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v * 0.45, vy: Math.sin(angle) * v, ax: 0, ay: 20, vr: rand(-1.2, 1.2) });
        break;
      }
      case "fireworks": {
        const angle = rand(0, Math.PI * 2);
        // A shell throws its sparks at an even spread of speeds, which is what
        // gives the burst its round edge rather than a ragged one.
        const v = rand(80, 520) * params.speed;
        Object.assign(base, {
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          ax: 0,
          ay: 240,
          drag: 0.975,
          kind: "dot",
          color: pick(FIREWORK_COLORS),
          twinkle: rand(8, 18),
        });
        break;
      }
      default: { // stardust
        const angle = Math.PI / 2 + rand(-spreadRad, spreadRad) / 2;
        const v = rand(40, 110) * params.speed;
        Object.assign(base, { vx: Math.cos(angle) * v * 0.5, vy: Math.sin(angle) * v, ax: 0, ay: 20, twinkle: rand(3, 8) });
      }
    }

    particles.push(base);
  }

  return particles;
}

/* ================= runtime ================= */

export function createEngine({ behind, front, stage = document.body, density = 1 }) {
  const canvases = { behind, front };
  const contexts = {
    behind: behind.getContext("2d"),
    front: front.getContext("2d"),
  };
  const pools = { behind: [], front: [] };
  const painted = { behind: false, front: false };
  let running = false;
  let last = 0;
  let scale = density;
  let ratio = 1;

  // Frame cost, smoothed. Used to thin out new bursts on slower machines
  // rather than letting the frame rate collapse.
  let frameCost = 16;
  let quality = 1;

  // The canvas's own box, in CSS pixels. Everything is drawn and culled in
  // these coordinates.
  let view = { left: 0, top: 0, width: 0, height: 0 };

  // The layout the canvases need is set here rather than relying on the
  // stylesheet having arrived. On a cold load the module can run before the CSS
  // applies, and measuring then returns the canvas's default 300x150, which was
  // written back into the backing store and left every burst scaled and
  // offset from its word.
  for (const canvas of Object.values(canvases)) {
    canvas.style.position = "fixed";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
  }

  function resize() {
    ratio = Math.min(devicePixelRatio || 1, 2);

    // Measured from the element, not from window.innerWidth/innerHeight. On
    // iOS those differ from a fixed-position box as the toolbars grow and
    // shrink, and a backing store sized to the window would stretch across a
    // box of another size, putting every particle somewhere other than the
    // word it belongs to.
    const rect = behind.getBoundingClientRect();
    const sane = rect.width > 1 && rect.height > 1;
    view = sane
      ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
      : { left: 0, top: 0, width: innerWidth, height: innerHeight };

    for (const [name, canvas] of Object.entries(canvases)) {
      canvas.width = Math.max(1, Math.round(view.width * ratio));
      canvas.height = Math.max(1, Math.round(view.height * ratio));
      contexts[name].setTransform(ratio, 0, 0, ratio, 0, 0);
    }
  }

  /** A viewport rect (what getBoundingClientRect returns) in canvas coordinates. */
  function toCanvasSpace(rect) {
    if (!rect) return null;
    return {
      left: rect.left - view.left,
      top: rect.top - view.top,
      width: rect.width,
      height: rect.height,
    };
  }

  /* ---------- drawing ----------
     Measured rather than assumed. The glyphs themselves are not the expensive
     part — the browser keeps its own raster cache for those. The cost was the
     canvas state churn around them: assigning `font` per particle measured
     ~33ms per 1500 draws, and save()/restore() per particle another ~6ms.
     Here the font is set once per frame and each particle's size is carried by
     the transform matrix instead, which measured ~3.6ms for identical output.
     Pre-rendered sprites were tried and were slower still, so they are not
     used: a scaled drawImage costs more than the text call it replaced. */

  const GLYPH_EM = 64; // every glyph is drawn at this size, then scaled by the matrix
  const GLYPH_FONT = `${GLYPH_EM}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", serif`;

  // Canvas state mirrored in JS, so it is only written when it actually changes.
  let lastFill = "";
  let lastShadow = "";
  let shadowOn = false;

  function setFill(ctx, color) {
    if (color !== lastFill) {
      ctx.fillStyle = color;
      lastFill = color;
    }
  }

  // Shadow is only wanted on the glowing sparks; left on, it would quietly
  // make every other particle expensive.
  function clearShadow(ctx) {
    if (shadowOn) {
      ctx.shadowBlur = 0;
      shadowOn = false;
    }
  }

  function beginLayer(ctx) {
    ctx.font = GLYPH_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    lastFill = "";
    lastShadow = "";
    shadowOn = false;
  }

  function draw(ctx, p) {
    // Fade in over the first 12% of life, out over the last 35%.
    const t = p.age / p.life;
    let alpha = t < 0.12 ? t / 0.12 : t > 0.65 ? 1 - (t - 0.65) / 0.35 : 1;
    if (p.twinkle) alpha *= 0.55 + 0.45 * Math.sin(p.age * p.twinkle);

    alpha = alpha < 0 ? 0 : alpha > 1 ? 1 : alpha;
    if (alpha <= 0.01) return;

    const size = p.shrink ? p.size * (1 - t * 0.7) : p.size;
    const cos = Math.cos(p.rot);
    const sin = Math.sin(p.rot);
    ctx.globalAlpha = alpha;

    if (p.kind === "glyph") {
      const k = (ratio * size) / GLYPH_EM;
      ctx.setTransform(k * cos, k * sin, -k * sin, k * cos, ratio * p.x, ratio * p.y);
      clearShadow(ctx);
      setFill(ctx, p.color ?? "#fff");
      ctx.fillText(p.glyph, 0, 0);
      return;
    }

    ctx.setTransform(ratio * cos, ratio * sin, -ratio * sin, ratio * cos, ratio * p.x, ratio * p.y);

    if (p.kind === "rect") {
      clearShadow(ctx);
      setFill(ctx, p.color);
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    } else if (p.kind === "dot") {
      if (p.color !== lastShadow) {
        ctx.shadowColor = p.color;
        lastShadow = p.color;
      }
      ctx.shadowBlur = size * 2.5;
      shadowOn = true;
      setFill(ctx, p.color);
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // A rim plus one offset highlight reads as a bubble without a texture.
      clearShadow(ctx);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = Math.max(1, size * 0.045);
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      setFill(ctx, "rgba(255, 255, 255, 0.10)");
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-size * 0.17, -size * 0.17, size * 0.1, 0, Math.PI * 2);
      setFill(ctx, "rgba(255, 255, 255, 0.85)");
      ctx.fill();
    }
  }

  function frame(now) {
    const elapsed = now - last;
    const dt = Math.min(elapsed / 1000, 0.05);
    last = now;
    let alive = 0;

    // Smoothed frame cost drives `quality`, which thins later bursts. Judged
    // against 22ms (~45fps) so it only kicks in once frames are genuinely late.
    frameCost += (elapsed - frameCost) * 0.1;
    if (frameCost > 22 && quality > 0.45) quality = Math.max(0.45, quality - 0.05);
    else if (frameCost < 15 && quality < 1) quality = Math.min(1, quality + 0.02);

    for (const name of ["behind", "front"]) {
      const ctx = contexts[name];
      const pool = pools[name];

      // Clearing a full-screen canvas is not free, so an empty layer that was
      // already cleared last frame is left alone.
      if (pool.length || painted[name]) {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, view.width, view.height);
      }
      painted[name] = pool.length > 0;
      if (pool.length) beginLayer(ctx);

      const next = [];

      for (const p of pool) {
        p.age += dt;
        if (p.age >= p.life) continue;

        p.vx = (p.vx + p.ax * dt) * p.drag;
        p.vy = (p.vy + p.ay * dt) * p.drag;
        p.swayPhase += p.swayRate * dt;
        p.x += p.vx * dt + Math.sin(p.swayPhase) * p.swayAmp * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        // Give particles a generous margin before culling, so slow risers
        // are not killed the moment they leave the top edge.
        if (p.y < -200 || p.y > view.height + 200 || p.x < -200 || p.x > view.width + 200) continue;

        draw(ctx, p);
        next.push(p);
      }

      // Leave the context clean: a shadow or alpha left set would otherwise
      // follow into the other layer and into next frame's clear.
      clearShadow(ctx);
      ctx.globalAlpha = 1;

      pools[name] = next;
      alive += next.length;
    }

    if (alive) requestAnimationFrame(frame);
    else running = false;
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  // A ceiling on live particles, so overlapping effects in a busy chorus can
  // never pile up into a frame rate the machine cannot hold.
  const MAX_PARTICLES = 650;

  function runBurst(effect, params, element) {
    // Re-measure first: on iOS the box moves as the toolbars appear, and a
    // stale box would anchor the burst to the wrong place on screen.
    if (!view.width || !view.height) resize();
    const rect = toCanvasSpace(element?.getBoundingClientRect() ?? null);
    const layer = params.layer === "front" ? "front" : "behind";
    const pool = pools[layer];

    const wanted = Math.max(1, Math.round(params.count * scale * quality));
    const room = MAX_PARTICLES - (pools.behind.length + pools.front.length);
    const count = Math.min(wanted, Math.max(1, room));

    pool.push(...spawn(effect, { ...params, count }, rect, view));

    // If the cap is still exceeded, the oldest particles make way: they are
    // the ones already fading out, so dropping them is the least visible.
    const over = pools.behind.length + pools.front.length - MAX_PARTICLES;
    if (over > 0) pool.splice(0, Math.min(over, pool.length - count));

    start();
  }

  function runText(effect, params, element) {
    if (!element) return;
    const duration = params.duration ?? 800;

    element.style.setProperty("--fx-duration", `${duration}ms`);
    element.style.setProperty("--fx-scale", params.scale ?? 1.2);
    element.style.setProperty("--fx-color", params.color ?? "#ffffff");

    const className = `fx-${effect.id}`;
    element.classList.remove(className);
    void element.offsetWidth; // restart the animation if it is already running
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), duration + 60);

    if (effect.id === "spotlight") {
      stage.style.setProperty("--fx-dim", params.dim ?? 0.06);
      stage.classList.add("is-spotlit");
      element.classList.add("is-spotlit-word");
      setTimeout(() => {
        stage.classList.remove("is-spotlit");
        element.classList.remove("is-spotlit-word");
      }, duration);
    }

    if (params.shake) {
      document.body.classList.add("fx-screenshake");
      setTimeout(() => document.body.classList.remove("fx-screenshake"), Math.min(duration, 700));
    }
  }

  addEventListener("resize", resize);
  addEventListener("orientationchange", resize);
  // iOS reports toolbar growth and pinch-zoom here rather than through resize.
  visualViewport?.addEventListener("resize", resize);
  visualViewport?.addEventListener("scroll", resize);
  resize();

  return {
    /** Play one assignment against the element holding its word(s). */
    play(assignment, element) {
      const effect = getEffect(assignment.effectId);
      if (!effect) return;
      const params = { ...effect.defaults, ...assignment.params };
      if (effect.kind === "burst") runBurst(effect, params, element);
      else runText(effect, params, element);
    },
    setDensity(value) {
      scale = value;
    },
    clear() {
      pools.behind = [];
      pools.front = [];
      for (const name of ["behind", "front"]) {
        // draw() leaves an arbitrary transform behind, so reset before clearing.
        contexts[name].setTransform(ratio, 0, 0, ratio, 0, 0);
        contexts[name].clearRect(0, 0, view.width, view.height);
        painted[name] = false;
      }
    },
  };
}
