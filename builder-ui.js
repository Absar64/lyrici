// The effects builder: drag an effect from the palette onto a word, tune it,
// and it is remembered against that song.
import { EFFECTS, controlsFor, createEngine, getEffect } from "./effects.js";
import {
  exportBundle,
  forgetSong,
  importBundle,
  inspectBundle,
  loadSong,
  newAssignment,
  saveSong,
  savedSongs,
} from "./effects-store.js";
import { buildCues, formatTime, splitWords, wordTimeMs } from "./cues.js";
import { fetchLyrics } from "./lyrics.js";
import { currentlyPlaying } from "./spotify.js";
import { createField } from "./ui-controls.js";
import { datestamp, download, readJson } from "./backup-file.js";
import { apply as applySettings, load as loadSettings, save as saveSettings } from "./settings.js";

const el = {
  art: document.getElementById("art"),
  title: document.getElementById("title"),
  artist: document.getElementById("artist"),
  picker: document.getElementById("song-picker"),
  score: document.getElementById("score"),
  cards: document.getElementById("cards"),
  count: document.getElementById("count"),
  bulk: document.getElementById("bulk"),
  clear: document.getElementById("clear"),
  rehearse: document.getElementById("rehearse"),
  exportSong: document.getElementById("export-song"),
  exportAll: document.getElementById("export-all"),
  importButton: document.getElementById("import"),
  importFile: document.getElementById("import-file"),
  libraryNote: document.getElementById("library-note"),
};

const state = {
  track: null,
  lines: [],            // synced lyric lines for the loaded song
  assignments: [],
  selection: null,      // { line, from, to }
  openId: null,
  rehearsal: null,
  songs: [],            // picker entries: { id, track, label }
};

applySettings(loadSettings());

const engine = createEngine({
  behind: document.getElementById("fx-behind"),
  front: document.getElementById("fx-front"),
  stage: el.score,
});

/* ================= palette ================= */

function buildPalette() {
  for (const effect of EFFECTS) {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.draggable = true;
    chip.dataset.effect = effect.id;
    chip.title = effect.blurb;

    const icon = document.createElement("div");
    icon.className = "chip__icon";
    icon.textContent = effect.icon;

    const text = document.createElement("div");
    const name = document.createElement("div");
    name.className = "chip__name";
    name.textContent = effect.name;
    const blurb = document.createElement("div");
    blurb.className = "chip__blurb";
    blurb.textContent = effect.blurb;
    text.append(name, blurb);

    chip.append(icon, text);

    chip.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", effect.id);
      event.dataTransfer.effectAllowed = "copy";
      chip.classList.add("is-dragging");
    });
    chip.addEventListener("dragend", () => chip.classList.remove("is-dragging"));

    // Clicking a chip applies it to the current selection — the keyboard-free
    // path for anyone who would rather not drag.
    chip.addEventListener("click", () => {
      if (state.selection) addAssignment(effect.id, state.selection);
    });

    document.getElementById(effect.kind === "burst" ? "palette-burst" : "palette-text").append(chip);
  }
}

/* ================= song loading ================= */

async function gatherSongs() {
  const songs = savedSongs().map((entry) => ({
    id: entry.id,
    track: entry.track,
    label: `${entry.track.name} — ${entry.track.artist} (${entry.assignments.length})`,
  }));

  try {
    const now = await currentlyPlaying();
    if (now) {
      const existing = songs.findIndex((song) => song.id === now.track.id);
      if (existing >= 0) songs.splice(existing, 1);
      songs.unshift({ id: now.track.id, track: now.track, label: `▶ ${now.track.name} — ${now.track.artist}` });
    }
  } catch {
    // Not signed in, or Spotify unreachable: the saved songs are still editable.
  }

  state.songs = songs;
  el.picker.replaceChildren(
    ...songs.map((song) => {
      const option = document.createElement("option");
      option.value = song.id;
      option.textContent = song.label;
      return option;
    })
  );

  if (!songs.length) {
    const option = document.createElement("option");
    option.textContent = "Nothing playing — start a song in Spotify";
    el.picker.append(option);
  }

  return songs;
}

async function loadTrack(track) {
  state.track = track;
  state.selection = null;
  state.openId = null;
  state.assignments = loadSong(track.id);

  el.title.textContent = track.name;
  el.artist.textContent = track.artist;
  if (track.artwork) el.art.src = track.artwork;
  else el.art.removeAttribute("src");

  el.score.replaceChildren(message("Loading lyrics…"));

  const lyrics = await fetchLyrics(track);
  if (state.track?.id !== track.id) return;

  if (lyrics.kind !== "synced") {
    state.lines = [];
    el.score.replaceChildren(
      message(
        lyrics.kind === "plain"
          ? "Only unsynced lyrics exist for this track, so there are no timings to attach effects to."
          : "No lyrics found for this track."
      )
    );
  } else {
    state.lines = lyrics.lines;
    renderScore();
  }

  renderCards();
}

function message(text) {
  const node = document.createElement("p");
  node.className = "empty";
  node.textContent = text;
  return node;
}

/* ================= lyric sheet ================= */

function assignmentsAt(line, word) {
  return state.assignments.filter((a) => a.line === line && word >= a.from && word <= a.to);
}

function renderScore() {
  const frag = document.createDocumentFragment();

  state.lines.forEach((line, lineIndex) => {
    const words = splitWords(line.text);
    if (!words.length) return;

    const row = document.createElement("div");
    row.className = "score__line";

    const stamp = document.createElement("span");
    stamp.className = "score__stamp";
    stamp.textContent = formatTime(line.time * 1000);
    row.append(stamp);

    words.forEach((text, wordIndex) => {
      const span = document.createElement("span");
      span.className = "score__word word";
      span.dataset.line = lineIndex;
      span.dataset.word = wordIndex;
      span.textContent = text;

      const here = assignmentsAt(lineIndex, wordIndex);
      if (here.length) {
        span.classList.add("has-fx");
        span.dataset.fx = getEffect(here[0].effectId)?.name ?? "";
      }

      const selection = state.selection;
      if (selection && selection.line === lineIndex && wordIndex >= selection.from && wordIndex <= selection.to) {
        span.classList.add("is-picked");
      }

      span.addEventListener("click", (event) => pickWord(lineIndex, wordIndex, event.shiftKey));
      span.addEventListener("dragover", (event) => {
        event.preventDefault();
        span.classList.add("is-over");
      });
      span.addEventListener("dragleave", () => span.classList.remove("is-over"));
      span.addEventListener("drop", (event) => {
        event.preventDefault();
        span.classList.remove("is-over");
        const effectId = event.dataTransfer.getData("text/plain");
        if (!getEffect(effectId)) return;

        // Dropping inside the current selection covers the whole phrase.
        const selection = state.selection;
        const inside = selection && selection.line === lineIndex
          && wordIndex >= selection.from && wordIndex <= selection.to;
        addAssignment(effectId, inside ? selection : { line: lineIndex, from: wordIndex, to: wordIndex });
      });

      row.append(span);
    });

    frag.append(row);
  });

  el.score.replaceChildren(frag);
}

function pickWord(line, word, extend) {
  if (extend && state.selection && state.selection.line === line) {
    const anchor = state.selection.anchor ?? state.selection.from;
    state.selection = { line, from: Math.min(anchor, word), to: Math.max(anchor, word), anchor };
  } else {
    state.selection = { line, from: word, to: word, anchor: word };
  }
  renderScore();
}

function wordElements(assignment) {
  const spans = [];
  for (let i = assignment.from; i <= assignment.to; i += 1) {
    const span = el.score.querySelector(`[data-line="${assignment.line}"][data-word="${i}"]`);
    if (span) spans.push(span);
  }
  return spans;
}

/* ================= assignments ================= */

function persist() {
  saveSong(state.track.id, state.track, state.assignments);
}

function addAssignment(effectId, range) {
  const effect = getEffect(effectId);
  const words = splitWords(state.lines[range.line].text).slice(range.from, range.to + 1).join(" ");

  const assignment = newAssignment(effect, { line: range.line, from: range.from, to: range.to, words });
  state.assignments.push(assignment);
  state.openId = assignment.id;
  persist();
  renderScore();
  renderCards();
  preview(assignment); // immediate feedback on what was just dropped
}

function removeAssignment(id) {
  state.assignments = state.assignments.filter((a) => a.id !== id);
  persist();
  renderScore();
  renderCards();
}

function preview(assignment) {
  const effect = getEffect(assignment.effectId);
  const spans = wordElements(assignment);
  if (!spans.length) return;

  if (effect.kind === "text") spans.forEach((span) => engine.play(assignment, span));
  else engine.play(assignment, spans[Math.floor(spans.length / 2)]);
}

function cueTime(assignment) {
  return wordTimeMs(state.lines, assignment.line, assignment.from) + (assignment.offsetMs ?? 0);
}

function renderCards() {
  const sorted = [...state.assignments].sort((a, b) => cueTime(a) - cueTime(b));

  el.count.textContent = sorted.length
    ? `${sorted.length} effect${sorted.length === 1 ? "" : "s"}, saved automatically.`
    : "Nothing yet. Drag an effect onto a word.";
  el.bulk.hidden = !sorted.length;

  const frag = document.createDocumentFragment();

  for (const assignment of sorted) {
    const effect = getEffect(assignment.effectId);
    if (!effect) continue;

    const card = document.createElement("div");
    card.className = "card";
    const open = state.openId === assignment.id;
    if (open) card.classList.add("is-open");

    const head = document.createElement("div");
    head.className = "card__head";

    const icon = document.createElement("span");
    icon.className = "chip__icon";
    icon.textContent = effect.icon;

    const labels = document.createElement("div");
    const name = document.createElement("div");
    name.className = "card__name";
    name.textContent = effect.name;
    const words = document.createElement("div");
    words.className = "card__words";
    words.textContent = assignment.words;
    labels.append(name, words);

    const time = document.createElement("span");
    time.className = "card__time";
    time.textContent = formatTime(cueTime(assignment));

    head.append(icon, labels, time);
    head.addEventListener("click", () => {
      state.openId = open ? null : assignment.id;
      renderCards();
    });
    card.append(head);

    if (open) {
      const body = document.createElement("div");
      body.className = "card__body";

      for (const [key, label, kind, options] of controlsFor(effect)) {
        body.append(
          createField({
            label,
            kind,
            options,
            value: assignment.params[key] ?? effect.defaults[key],
            onChange: (value) => {
              assignment.params[key] = value;
              persist();
            },
          })
        );
      }

      body.append(
        createField({
          label: "Timing nudge",
          kind: "range",
          options: { min: -3000, max: 3000, step: 50, unit: "ms" },
          value: assignment.offsetMs ?? 0,
          onChange: (value) => {
            assignment.offsetMs = value;
            persist();
            time.textContent = formatTime(cueTime(assignment));
          },
        })
      );

      const row = document.createElement("div");
      row.className = "card__row";

      const play = document.createElement("button");
      play.className = "mini";
      play.type = "button";
      play.textContent = "Preview";
      play.addEventListener("click", () => preview(assignment));

      const remove = document.createElement("button");
      remove.className = "mini mini--danger";
      remove.type = "button";
      remove.textContent = "Remove";
      remove.addEventListener("click", () => removeAssignment(assignment.id));

      row.append(play, remove);
      body.append(row);
      card.append(body);
    }

    frag.append(card);
  }

  el.cards.replaceChildren(frag);
  describeLibrary();
}

/* ================= rehearsal ================= */

// Runs the song's cues on a virtual clock so effects can be timed without
// waiting for the track to come round again on Spotify.
function toggleRehearsal() {
  if (state.rehearsal) {
    cancelAnimationFrame(state.rehearsal.frame);
    state.rehearsal = null;
    el.rehearse.textContent = "Rehearse";
    engine.clear();
    return;
  }

  const cues = buildCues(state.lines, state.assignments);
  if (!cues.length) return;

  const startAt = cues[0].at - 900;
  const began = performance.now();
  let next = 0;

  el.rehearse.textContent = "Stop";

  const step = () => {
    const at = startAt + (performance.now() - began);

    while (next < cues.length && cues[next].at <= at) {
      const cue = cues[next];
      preview(cue.assignment);
      wordElements(cue.assignment)[0]?.scrollIntoView({ block: "center", behavior: "smooth" });
      next += 1;
    }

    if (next >= cues.length && at > cues[cues.length - 1].at + 2500) {
      toggleRehearsal();
      return;
    }
    state.rehearsal.frame = requestAnimationFrame(step);
  };

  state.rehearsal = { frame: requestAnimationFrame(step) };
}

/* ================= import / export ================= */

function slug(text) {
  return (text || "untitled")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

function describeLibrary() {
  const songs = savedSongs();
  const effects = songs.reduce((total, song) => total + song.assignments.length, 0);
  el.libraryNote.textContent = songs.length
    ? `${songs.length} song${songs.length === 1 ? "" : "s"}, ${effects} effect${effects === 1 ? "" : "s"} saved here.`
    : "Nothing saved yet.";
  el.exportSong.disabled = !state.track || !state.assignments.length;
  el.exportAll.disabled = !songs.length;
}

function exportThisSong() {
  if (!state.track) return;
  const name = `${slug(state.track.artist)}-${slug(state.track.name)}`;
  download(`lyric-effects-${name}.json`, exportBundle(state.track.id));
}

function exportEverything() {
  const bundle = exportBundle();
  // The full backup carries the look of the app too, so a restore puts
  // everything back, not just the effects.
  bundle.settings = loadSettings();
  download(`lyric-effects-all-${datestamp()}.json`, bundle);
}

// One path for both ways in: a picked file and pasted text differ only in how
// the JSON is obtained.
async function importData(data) {
  const summary = inspectBundle(data);
  if (!summary.ok) {
    alert(summary.reason);
    return false;
  }

  const lines = [
    `Import ${summary.effects} effect${summary.effects === 1 ? "" : "s"} across ${summary.songs} song${summary.songs === 1 ? "" : "s"}?`,
    "",
    "Songs you already have effects for will be replaced.",
  ];
  if (summary.hasSettings) lines.push("This file also contains appearance settings, which will be applied.");
  if (!confirm(lines.join("\n"))) return;

  const result = importBundle(data);
  if (summary.hasSettings) {
    saveSettings({ ...loadSettings(), ...data.settings });
    applySettings(loadSettings());
  }

  const skipped = result.skipped ? `, ${result.skipped} skipped as unreadable` : "";
  alert(`Imported ${result.effects} effect${result.effects === 1 ? "" : "s"} across ${result.songs} song${result.songs === 1 ? "" : "s"}${skipped}.`);

  // Reload so the picker, the lyric sheet and the cards all reflect the import.
  const songs = await gatherSongs();
  const current = songs.find((song) => song.id === state.track?.id) ?? songs[0];
  if (current) {
    el.picker.value = current.id;
    await loadTrack(current.track);
  }
  describeLibrary();
  return true;
}

async function importFromFile(file) {
  const data = await readJson(file);
  if (!data) {
    alert("That file could not be read as JSON.");
    return;
  }
  await importData(data);
}

/* ================= wiring ================= */

el.picker.addEventListener("change", () => {
  const song = state.songs.find((entry) => entry.id === el.picker.value);
  if (song) loadTrack(song.track);
});

el.clear.addEventListener("click", () => {
  state.assignments = [];
  forgetSong(state.track.id);
  renderScore();
  renderCards();
});

el.rehearse.addEventListener("click", toggleRehearsal);
el.exportSong.addEventListener("click", exportThisSong);
el.exportAll.addEventListener("click", exportEverything);
el.importButton.addEventListener("click", () => el.importFile.click());

const pasteBox = document.getElementById("paste-box");
const pasteText = document.getElementById("paste-text");

function closePaste() {
  pasteBox.hidden = true;
  pasteText.value = "";
}

document.getElementById("paste-open").addEventListener("click", () => {
  pasteBox.hidden = !pasteBox.hidden;
  if (!pasteBox.hidden) pasteText.focus();
});

document.getElementById("paste-cancel").addEventListener("click", closePaste);

document.getElementById("paste-apply").addEventListener("click", async () => {
  const text = pasteText.value.trim();
  if (!text) return;

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    alert("That is not valid JSON.");
    return;
  }

  if (await importData(data)) closePaste();
});
el.importFile.addEventListener("change", async () => {
  const [file] = el.importFile.files;
  if (file) await importFromFile(file);
  el.importFile.value = ""; // so the same file can be picked again
});

// Clicking away from a word drops the selection.
el.score.addEventListener("click", (event) => {
  if (event.target === el.score && state.selection) {
    state.selection = null;
    renderScore();
  }
});

// iOS and Android fire no HTML5 drag events, so on touch the flow is
// tap a word, then tap an effect. The palette already works that way.
if (typeof matchMedia === "function" && matchMedia("(hover: none)").matches) {
  const hint = document.querySelector(".rail__hint");
  if (hint) hint.textContent = "Tap a word to select it, then tap an effect. Tap a second word with the first still selected to cover a phrase.";
}

(async () => {
  buildPalette();
  const songs = await gatherSongs();
  if (songs.length) {
    el.picker.value = songs[0].id;
    await loadTrack(songs[0].track);
  } else {
    el.score.replaceChildren(
      message("Start a song in Spotify, or open a song you have already given effects to.")
    );
    renderCards();
  }
})();
