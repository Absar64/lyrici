// Per-song effect assignments, remembered in localStorage.
//
// Shape:
//   { [trackId]: { track: {...meta}, savedAt, assignments: [assignment] } }
//
// assignment:
//   { id, effectId, line, from, to, words, offsetMs, params }

const STORE = "spotify_lyrics_effects";

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORE)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  localStorage.setItem(STORE, JSON.stringify(data));
}

/** Every song that has effects saved, newest first — the builder's song list. */
export function savedSongs() {
  return Object.entries(readAll())
    .map(([id, entry]) => ({ id, ...entry }))
    .sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

export function loadSong(trackId) {
  return readAll()[trackId]?.assignments ?? [];
}

export function saveSong(trackId, track, assignments) {
  const all = readAll();
  if (!assignments.length) delete all[trackId];
  else all[trackId] = { track, savedAt: Date.now(), assignments };
  writeAll(all);
}

export function forgetSong(trackId) {
  const all = readAll();
  delete all[trackId];
  writeAll(all);
}

export function newAssignment(effect, { line, from, to, words }) {
  return {
    id: `fx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    effectId: effect.id,
    line,
    from,
    to,
    words,
    offsetMs: 0,
    params: { ...effect.defaults },
  };
}

/* ================= backup ================= */

export const BUNDLE_KIND = "spotify-lyrics-effects";
const BUNDLE_VERSION = 1;

/** A portable snapshot: one song when given an id, otherwise every song. */
export function exportBundle(trackId = null) {
  const all = readAll();
  const songs = trackId ? (all[trackId] ? { [trackId]: all[trackId] } : {}) : all;

  return {
    kind: BUNDLE_KIND,
    version: BUNDLE_VERSION,
    exportedAt: new Date().toISOString(),
    songs,
  };
}

// Imported files are data from outside this app, so nothing is trusted: each
// song and assignment is rebuilt field by field, and anything malformed is
// counted as skipped rather than written into storage.
function cleanAssignment(raw) {
  if (!raw || typeof raw.effectId !== "string") return null;

  const line = Number(raw.line);
  const from = Number(raw.from);
  const to = Number(raw.to);
  if (![line, from, to].every(Number.isInteger) || line < 0 || from < 0 || to < from) return null;

  return {
    id: typeof raw.id === "string" ? raw.id : `fx_${Math.random().toString(36).slice(2, 10)}`,
    effectId: raw.effectId,
    line,
    from,
    to,
    words: typeof raw.words === "string" ? raw.words : "",
    offsetMs: Number.isFinite(Number(raw.offsetMs)) ? Number(raw.offsetMs) : 0,
    params: raw.params && typeof raw.params === "object" ? { ...raw.params } : {},
  };
}

/** What a file contains, for the confirmation shown before importing. */
export function inspectBundle(data) {
  if (!data || data.kind !== BUNDLE_KIND || typeof data.songs !== "object") {
    return { ok: false, reason: "This is not a lyric effects file." };
  }

  const songs = Object.values(data.songs).filter((song) => song && Array.isArray(song.assignments));
  return {
    ok: true,
    songs: songs.length,
    effects: songs.reduce((total, song) => total + song.assignments.length, 0),
    hasSettings: Boolean(data.settings),
  };
}

/** Merge a bundle into storage. Songs already present are replaced. */
export function importBundle(data, { replace = false } = {}) {
  const all = replace ? {} : readAll();
  let songs = 0;
  let effects = 0;
  let skipped = 0;

  for (const [trackId, song] of Object.entries(data.songs ?? {})) {
    if (!song || !song.track || !Array.isArray(song.assignments)) {
      skipped += 1;
      continue;
    }

    const assignments = song.assignments.map(cleanAssignment).filter(Boolean);
    skipped += song.assignments.length - assignments.length;
    if (!assignments.length) continue;

    all[trackId] = {
      track: song.track,
      savedAt: Number(song.savedAt) || Date.now(),
      assignments,
    };
    songs += 1;
    effects += assignments.length;
  }

  writeAll(all);
  return { songs, effects, skipped };
}

/** Fires when the builder saves from another tab, so playback keeps up. */
export function onChange(handler) {
  addEventListener("storage", (event) => {
    if (event.key === STORE) handler();
  });
}
