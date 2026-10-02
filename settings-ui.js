// Builds the settings form from a schema and keeps the preview in step.
import {
  DEFAULTS,
  FONTS,
  apply,
  exportSettings,
  importSettings,
  inspectSettings,
  load,
  reset,
  save,
} from "./settings.js";
import { createField } from "./ui-controls.js";
import { datestamp, download, readJson } from "./backup-file.js";

// Each entry: [key, label, kind, options]
//   range  -> { min, max, step, unit }
//   select -> { choices }
//   toggle / color take no options.
const SCHEMA = [
  ["Type", [
    ["fontFamily", "Font", "select", { choices: FONTS }],
    ["lyricSize", "Lyric size", "range", { min: 1, max: 4.5, step: 0.05, unit: "rem" }],
    ["lyricWeight", "Weight", "select", { choices: [300, 400, 500, 600, 700] }],
    ["lyricLineHeight", "Line height", "range", { min: 1, max: 2.2, step: 0.02 }],
    ["lyricTracking", "Letter spacing", "range", { min: -0.05, max: 0.2, step: 0.005, unit: "em" }],
    ["lyricCase", "Capitalisation", "select", { choices: ["none", "uppercase", "lowercase", "capitalize"] }],
  ]],

  ["Position", [
    ["lyricAlign", "Text align", "select", { choices: ["left", "center", "right"] }],
    ["focusPosition", "Active line height", "range", { min: 15, max: 85, step: 1, unit: "%" }],
    ["lyricGap", "Line spacing", "range", { min: 2, max: 70, step: 1, unit: "px" }],
    ["padX", "Side padding", "range", { min: 0, max: 220, step: 2, unit: "px" }],
    ["padTop", "Top padding", "range", { min: 0, max: 100, step: 2, unit: "px" }],
    ["padBottom", "Bottom padding", "range", { min: 0, max: 100, step: 2, unit: "px" }],
    ["maxWidth", "Max width", "range", { min: 0, max: 2400, step: 20, unit: "px", zero: "full" }],
  ]],

  ["Emphasis", [
    ["activeAlpha", "Active line", "range", { min: 0.4, max: 1, step: 0.02 }],
    ["nearAlpha", "Nearby lines", "range", { min: 0.05, max: 1, step: 0.02 }],
    ["farAlpha", "Distant lines", "range", { min: 0, max: 1, step: 0.02 }],
    ["nearCount", "Nearby line count", "range", { min: 0, max: 6, step: 1 }],
    ["inactiveBlur", "Inactive blur", "range", { min: 0, max: 6, step: 0.1, unit: "px" }],
    ["fadeEdges", "Fade top & bottom", "toggle"],
    ["scrollSpeed", "Scroll speed", "range", { min: 0, max: 2000, step: 25, unit: "ms" }],
    ["leadMs", "Timing offset (− delays)", "range", { min: -2000, max: 2000, step: 10, unit: "ms" }],
  ]],

  ["Background", [
    ["bgEnabled", "Album ambience", "toggle"],
    ["bgBlur", "Blur intensity", "range", { min: 0, max: 220, step: 2, unit: "px" }],
    ["bgBrightness", "Brightness", "range", { min: 0.1, max: 1.6, step: 0.02 }],
    ["bgSaturate", "Saturation", "range", { min: 0, max: 3, step: 0.05 }],
    ["bgScale", "Zoom", "range", { min: 1, max: 2, step: 0.01, unit: "×" }],
    ["veil", "Darkening veil", "range", { min: 0, max: 0.95, step: 0.02 }],
    ["baseColor", "Base colour", "color"],
  ]],

  ["Header", [
    ["showHeader", "Show header", "toggle"],
    ["showArtwork", "Show artwork", "toggle"],
    ["showArtist", "Show artist", "toggle"],
    ["headerAlign", "Header align", "select", { choices: ["flex-start", "center", "flex-end"], labels: ["left", "center", "right"] }],
    ["artSize", "Artwork size", "range", { min: 20, max: 120, step: 2, unit: "px" }],
    ["titleSize", "Title size", "range", { min: 0.6, max: 2, step: 0.02, unit: "rem" }],
    ["artistSize", "Artist size", "range", { min: 0.5, max: 1.6, step: 0.02, unit: "rem" }],
  ]],

  ["Effects", [
    ["motion", "Motion", "select", { choices: ["auto", "full", "reduced"], labels: ["follow device", "always full", "always reduced"] }],
    ["effectsEnabled", "Play lyric effects", "toggle"],
    ["effectDensity", "Particle amount", "range", { min: 0.2, max: 2.5, step: 0.1, unit: "×" }],
    ["effectScale", "Effect size", "range", { min: 0.2, max: 6, step: 0.1, unit: "×" }],
  ]],

  ["Behaviour", [
    ["showFooter", "Show status bar", "toggle"],
    ["pollMs", "Spotify poll interval", "range", { min: 1000, max: 10000, step: 250, unit: "ms" }],
  ]],
];

const PREVIEW_LINES = [
  "A placeholder line of lyrics",
  "so you can see the spacing",
  "and how the active line reads",
  "against everything around it",
  "while you tune the settings",
  "line after line after line",
  "until it looks the way you want",
  "and then you can go back",
  "to the song that is playing",
];

let settings = load();

const fieldsRoot = document.getElementById("fields");
const pv = {
  bg: document.getElementById("pv-bg"),
  art: document.getElementById("pv-art"),
  stage: document.getElementById("pv-stage"),
  lyrics: document.getElementById("pv-lyrics"),
};

/* ---------- form ---------- */

function buildForm() {
  const frag = document.createDocumentFragment();

  for (const [groupName, rows] of SCHEMA) {
    const group = document.createElement("fieldset");
    group.className = "group";

    const legend = document.createElement("legend");
    legend.className = "group__name";
    legend.textContent = groupName;
    group.append(legend);

    for (const [key, label, kind, options = {}] of rows) {
      group.append(
        createField({
          label,
          kind,
          options,
          value: settings[key],
          onChange: (value) => update(key, value),
        })
      );
    }

    frag.append(group);
  }

  fieldsRoot.replaceChildren(frag);
}

/* ---------- preview ---------- */

function buildPreview() {
  pv.lyrics.replaceChildren(
    ...PREVIEW_LINES.map((text) => {
      const node = document.createElement("div");
      node.className = "line";
      node.textContent = text;
      return node;
    })
  );
  // A soft gradient stands in for album artwork, so the preview works offline.
  const art = "linear-gradient(135deg, #7d5bd6 0%, #c9566b 52%, #e8a062 100%)";
  pv.bg.style.backgroundImage = art;
  pv.art.style.background = art;
  pv.art.removeAttribute("src");
}

function focusPreview() {
  const nodes = [...pv.lyrics.children];
  const active = Math.floor(nodes.length / 2);
  nodes.forEach((node, i) => {
    node.classList.toggle("is-active", i === active);
    node.classList.toggle("is-near", i !== active && Math.abs(i - active) <= settings.nearCount);
  });
  const node = nodes[active];
  const offset = node.offsetTop + node.offsetHeight / 2 - pv.stage.clientHeight * (settings.focusPosition / 100);
  pv.lyrics.style.transform = `translateY(${-offset}px)`;
}

/* ---------- state ---------- */

function render() {
  apply(settings);
  // The preview sits inside this page, so the page root carries the settings.
  requestAnimationFrame(focusPreview);
}

function update(key, value) {
  settings[key] = value;
  save(settings);
  render();
}

/* ---------- backup ---------- */

const note = document.getElementById("backup-note");

function say(message) {
  note.textContent = message;
}

document.getElementById("export").addEventListener("click", () => {
  download(`lyrics-settings-${datestamp()}.json`, exportSettings());
  say("Settings exported.");
});

const picker = document.getElementById("import-file");
const pasteBox = document.getElementById("paste-box");
const pasteText = document.getElementById("paste-text");

// One path for both ways in: a picked file and pasted text differ only in how
// the JSON is obtained.
function applyImported(data) {
  const summary = inspectSettings(data);
  if (!summary.ok) {
    say(summary.reason);
    return false;
  }

  const source = summary.fromBackup ? " from a full backup" : "";
  if (!confirm(`Apply ${summary.count} settings${source}? This replaces how the app currently looks.`)) return false;

  const result = importSettings(data);
  settings = result.settings;
  buildForm();
  render();

  const ignored = result.ignored ? `, ${result.ignored} not recognised` : "";
  say(`Applied ${result.applied} settings${ignored}.`);
  return true;
}

document.getElementById("import").addEventListener("click", () => picker.click());

picker.addEventListener("change", async () => {
  const [file] = picker.files;
  picker.value = ""; // so the same file can be picked twice
  if (!file) return;

  const data = await readJson(file);
  if (!data) {
    say("That file could not be read as JSON.");
    return;
  }
  applyImported(data);
});

function closePaste() {
  pasteBox.hidden = true;
  pasteText.value = "";
}

document.getElementById("paste-open").addEventListener("click", () => {
  pasteBox.hidden = !pasteBox.hidden;
  if (!pasteBox.hidden) pasteText.focus();
});

document.getElementById("paste-cancel").addEventListener("click", closePaste);

document.getElementById("paste-apply").addEventListener("click", () => {
  const text = pasteText.value.trim();
  if (!text) {
    say("Nothing pasted yet.");
    return;
  }

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    say("That is not valid JSON.");
    return;
  }

  if (applyImported(data)) closePaste();
});

document.getElementById("reset").addEventListener("click", () => {
  reset();
  settings = { ...DEFAULTS };
  buildForm();
  render();
  say("Back to defaults.");
});

addEventListener("resize", focusPreview);

buildForm();
buildPreview();
render();
