// Every adjustable option lives here. `apply()` writes them onto the document
// as CSS custom properties and data attributes, so the stylesheet does the work
// and both the app and the settings preview stay in step.

const STORE = "spotify_lyrics_settings";

export const DEFAULTS = {
  // type
  fontFamily: "Quicksand",
  lyricSize: 2.1,          // rem
  lyricWeight: 500,
  lyricLineHeight: 1.26,
  lyricTracking: -0.005,   // em
  lyricAlign: "left",
  lyricCase: "none",
  lyricGap: 22,            // px between lines

  // lyric layout
  focusPosition: 50,       // % down the stage where the active line sits
  padX: 60,                // px
  padTop: 26,
  padBottom: 18,
  maxWidth: 1400,          // px, 0 = full width
  fadeEdges: true,

  // emphasis
  activeAlpha: 0.92,
  nearAlpha: 0.40,
  farAlpha: 0.22,
  nearCount: 2,            // lines either side treated as "near"
  inactiveBlur: 1.4,       // px
  scrollSpeed: 750,        // ms
  leadMs: 220,             // highlight this far ahead of the timestamp

  // background
  bgEnabled: true,
  bgBlur: 90,              // px
  bgBrightness: 0.72,
  bgSaturate: 1.6,
  bgScale: 1.25,
  veil: 0.5,               // darkening wash over the artwork
  baseColor: "#0d0d10",

  // header
  showHeader: true,
  showArtwork: true,
  showArtist: true,
  headerAlign: "left",
  artSize: 40,             // px
  titleSize: 0.94,         // rem
  artistSize: 0.78,        // rem

  // behaviour
  showFooter: true,
  pollMs: 2500,

  // lyric effects (built per song in the effects builder)
  effectsEnabled: true,
  effectDensity: 1,
};

export const FONTS = [
  "Quicksand",
  "Nunito",
  "Manrope",
  "Comfortaa",
  "Figtree",
  "Inter",
  "system-ui",
];

export function load() {
  try {
    return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORE)) || {}) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function save(settings) {
  localStorage.setItem(STORE, JSON.stringify(settings));
}

export function reset() {
  localStorage.removeItem(STORE);
}

export function apply(s, root = document.documentElement) {
  const css = {
    "--font": s.fontFamily === "system-ui" ? "system-ui, sans-serif" : `"${s.fontFamily}", system-ui, sans-serif`,
    "--lyric-size": `${s.lyricSize}rem`,
    "--lyric-weight": s.lyricWeight,
    "--lyric-leading": s.lyricLineHeight,
    "--lyric-tracking": `${s.lyricTracking}em`,
    "--lyric-align": s.lyricAlign,
    "--lyric-case": s.lyricCase,
    "--lyric-gap": `${s.lyricGap}px`,

    "--pad-x": `${s.padX}px`,
    "--pad-top": `${s.padTop}px`,
    "--pad-bottom": `${s.padBottom}px`,
    "--max-width": s.maxWidth > 0 ? `${s.maxWidth}px` : "none",

    "--ink": `rgba(255, 255, 255, ${s.activeAlpha})`,
    "--ink-dim": `rgba(255, 255, 255, ${s.nearAlpha})`,
    "--ink-faint": `rgba(255, 255, 255, ${s.farAlpha})`,
    "--inactive-blur": `${s.inactiveBlur}px`,
    "--scroll-speed": `${s.scrollSpeed}ms`,

    "--blur": `${s.bgBlur}px`,
    "--bg-brightness": s.bgBrightness,
    "--bg-saturate": s.bgSaturate,
    "--bg-scale": s.bgScale,
    "--veil": s.veil,
    "--base": s.baseColor,

    "--art-size": `${s.artSize}px`,
    "--title-size": `${s.titleSize}rem`,
    "--artist-size": `${s.artistSize}rem`,
    "--header-align": s.headerAlign,
  };

  for (const [key, value] of Object.entries(css)) root.style.setProperty(key, value);

  const flags = {
    bg: s.bgEnabled,
    fade: s.fadeEdges,
    header: s.showHeader,
    artwork: s.showArtwork,
    artist: s.showArtist,
    footer: s.showFooter,
    effects: s.effectsEnabled,
  };

  for (const [name, on] of Object.entries(flags)) root.dataset[name] = on ? "on" : "off";
}

// Fires when settings are saved in another tab, so an open lyrics view keeps up
// with the settings page without a reload.
export function onChange(handler) {
  addEventListener("storage", (event) => {
    if (event.key === STORE) handler(load());
  });
}
