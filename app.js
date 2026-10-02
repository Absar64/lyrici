import { beginLogin, isSignedIn, signOut } from "./auth.js";
import { fetchLyrics } from "./lyrics.js";
import { currentlyPlaying } from "./spotify.js";
import { apply as applySettings, load as loadSettings, onChange as onSettingsChange } from "./settings.js";
import { createEngine, getEffect } from "./effects.js";
import { loadSong, onChange as onEffectsChange } from "./effects-store.js";
import { buildCues, splitWords } from "./cues.js";

// Appearance and behaviour both come from the settings page. Applied before
// anything renders so the first paint already uses the user's choices.
let cfg = loadSettings();
applySettings(cfg);

const el = {
  metaBar: document.getElementById("meta"),
  art: document.getElementById("art"),
  title: document.getElementById("title"),
  artist: document.getElementById("artist"),
  stage: document.getElementById("stage"),
  lyrics: document.getElementById("lyrics"),
  notice: document.getElementById("notice"),
  login: document.getElementById("login"),
  logout: document.getElementById("logout"),
  status: document.getElementById("status"),
};

const bgLayers = [document.getElementById("bg-a"), document.getElementById("bg-b")];
let bgFront = 0;
let bgImage = null;

const state = {
  trackId: null,
  lines: [],       // [{ time, text }] when synced lyrics exist
  nodes: [],       // rendered .line elements, index-aligned with `lines`
  words: [],       // per line, the .word spans effects are anchored to
  activeIndex: -1,
  isPlaying: false,
  positionMs: 0,   // playback position as last reported by Spotify
  sampledAt: 0,    // performance.now() when that position was reported
  cues: [],        // effect cues for this track, sorted by time
  nextCue: 0,      // pointer into cues; everything before it has fired
  lastSeen: 0,     // previous frame's position, to notice seeks
};

const engine = createEngine({
  behind: document.getElementById("fx-behind"),
  front: document.getElementById("fx-front"),
  stage: el.lyrics,
  density: cfg.effectDensity,
  sizeScale: cfg.effectScale,
});

/* ---------- presentation ---------- */

function setStatus(text) {
  el.status.textContent = text;
}

function showNotice(lead, sub, { withLogin = false } = {}) {
  el.notice.hidden = false;
  el.notice.querySelector(".notice__lead").textContent = lead;
  el.notice.querySelector(".notice__sub").textContent = sub ?? "";
  el.login.hidden = !withLogin;
}

function hideNotice() {
  el.notice.hidden = true;
}

function paintBackground(url) {
  if (url === bgImage) return;
  bgImage = url;
  const next = (bgFront + 1) % 2;
  bgLayers[next].style.backgroundImage = url ? `url("${url}")` : "none";
  bgLayers[next].classList.add("is-on");
  bgLayers[bgFront].classList.remove("is-on");
  bgFront = next;
}

function paintHeader(track) {
  el.metaBar.hidden = false;
  el.art.hidden = !track.artwork;
  if (track.artwork) el.art.src = track.artwork;
  el.title.textContent = track.name;
  el.artist.textContent = track.artist;
  document.title = `${track.name} — ${track.artist}`;
}

function clearLyrics() {
  el.lyrics.replaceChildren();
  el.lyrics.style.transform = "translateY(0)";
  el.lyrics.classList.remove("lyrics--plain", "is-spotlit");
  state.lines = [];
  state.nodes = [];
  state.words = [];
  state.cues = [];
  state.nextCue = 0;
  state.activeIndex = -1;
  engine.clear();
}

// Lines are built word by word: each word is its own span so an effect can be
// anchored to it, both for text animations and as a burst's origin point.
function renderSynced(lines) {
  const frag = document.createDocumentFragment();
  state.nodes = [];
  state.words = [];

  for (const { text } of lines) {
    const node = document.createElement("div");
    node.className = text ? "line" : "line is-break";

    const spans = splitWords(text).map((word) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      // Read back by the glow twin in effects.css via content: attr(data-text).
      span.dataset.text = word;
      return span;
    });

    spans.forEach((span, i) => {
      if (i) node.append(" ");
      node.append(span);
    });

    frag.append(node);
    state.nodes.push(node);
    state.words.push(spans);
  }

  el.lyrics.replaceChildren(frag);
  state.lines = lines;
}

function renderPlain(text) {
  el.lyrics.classList.add("lyrics--plain");
  const frag = document.createDocumentFragment();
  for (const row of text.split(/\r?\n/)) {
    const node = document.createElement("div");
    node.className = "line";
    node.textContent = row;
    frag.append(node);
  }
  el.lyrics.replaceChildren(frag);
}

// Centre the active line in the stage and soften its neighbours.
function focusLine(index) {
  if (index === state.activeIndex) return;
  state.activeIndex = index;

  state.nodes.forEach((node, i) => {
    node.classList.toggle("is-active", i === index);
    node.classList.toggle("is-near", i !== index && Math.abs(i - index) <= cfg.nearCount);
  });

  const node = state.nodes[index];
  if (!node) return;
  const anchor = el.stage.clientHeight * (cfg.focusPosition / 100);
  const offset = node.offsetTop + node.offsetHeight / 2 - anchor;
  el.lyrics.style.transform = `translateY(${-offset}px)`;
}

/* ---------- timing ---------- */

// Spotify is polled every few seconds; between polls the local clock carries the
// position forward so highlighting moves smoothly instead of in jumps.
function estimatedPositionMs() {
  if (!state.isPlaying) return state.positionMs;
  return state.positionMs + (performance.now() - state.sampledAt);
}

/**
 * Playback position shifted by the timing offset: the clock the lyrics are
 * read against. Everything tied to a word — which line is active, and when an
 * effect fires — works from this, so they can never drift apart.
 */
function lyricClockMs() {
  return estimatedPositionMs() + cfg.leadMs;
}

function indexAt(seconds) {
  let lo = 0;
  let hi = state.lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (state.lines[mid].time <= seconds) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/* ---------- effect cues ---------- */

function rebuildCues() {
  if (!state.lines.length || !state.trackId) {
    state.cues = [];
    return;
  }
  state.cues = buildCues(state.lines, loadSong(state.trackId));
  state.nextCue = 0;
  seekCues(lyricClockMs());
}

// Move the cue pointer to the first cue at or after `positionMs`, so seeking
// neither replays what has passed nor swallows what is still ahead.
function seekCues(positionMs) {
  let index = 0;
  while (index < state.cues.length && state.cues[index].at <= positionMs) index += 1;
  state.nextCue = index;
}

function playCue(assignment) {
  const effect = getEffect(assignment.effectId);
  const spans = (state.words[assignment.line] ?? []).slice(assignment.from, assignment.to + 1);
  if (!effect || !spans.length) return;

  // A text animation runs on every word of the phrase; a burst fires once,
  // from the middle of it.
  if (effect.kind === "text") spans.forEach((span) => engine.play(assignment, span));
  else engine.play(assignment, spans[Math.floor(spans.length / 2)]);
}

function runCues(positionMs) {
  // A jump backwards (a seek, or the track looping) rewinds the pointer.
  if (positionMs < state.lastSeen - 400) seekCues(positionMs);
  state.lastSeen = positionMs;

  if (!cfg.effectsEnabled) return;

  while (state.nextCue < state.cues.length && state.cues[state.nextCue].at <= positionMs) {
    // Cues missed while the tab was hidden are skipped rather than fired late.
    if (positionMs - state.cues[state.nextCue].at < 900) playCue(state.cues[state.nextCue].assignment);
    state.nextCue += 1;
  }
}

function tick() {
  if (state.lines.length) {
    // One clock for both: the timing offset shifts the lyrics, and an effect
    // belongs to a word, so it has to move with it. Running the cues off the
    // raw position meant a 950ms delay fired every effect 950ms before its
    // word lit up.
    const atMs = lyricClockMs();
    const index = indexAt(atMs / 1000);
    if (index >= 0) focusLine(index);
    runCues(atMs);
  }
  requestAnimationFrame(tick);
}

/* ---------- Spotify polling ---------- */

async function loadTrack(track) {
  clearLyrics();
  setStatus("looking for lyrics…");

  const lyrics = await fetchLyrics(track);
  // The track may have changed while the request was in flight.
  if (state.trackId !== track.id) return;

  if (lyrics.kind === "synced") {
    renderSynced(lyrics.lines);
    rebuildCues();
    const count = state.cues.length;
    setStatus(count ? `synced lyrics · ${count} effect${count === 1 ? "" : "s"}` : "synced lyrics · lrclib.net");
  } else if (lyrics.kind === "plain") {
    renderPlain(lyrics.text);
    setStatus("unsynced lyrics · lrclib.net");
  } else {
    setStatus("no lyrics found for this track");
  }
}

async function poll() {
  let delay = cfg.pollMs;
  try {
    const now = await currentlyPlaying();

    if (!now) {
      setStatus("waiting for playback…");
      if (!state.trackId) {
        showNotice("Nothing playing", "Start a song in Spotify and it will appear here.");
      }
      return;
    }

    hideNotice();
    el.logout.hidden = false;
    state.isPlaying = now.isPlaying;
    state.positionMs = now.positionMs;
    state.sampledAt = performance.now();

    if (now.track.id !== state.trackId) {
      state.trackId = now.track.id;
      paintHeader(now.track);
      paintBackground(now.track.artwork);
      await loadTrack(now.track);
    }
  } catch (err) {
    if (err.message === "session-expired" || err.message === "not-signed-in") {
      signOut();
      el.metaBar.hidden = true;
      clearLyrics();
      setStatus("");
      showNotice("Spotify Lyrics", "That session ended. Connect again to continue.", { withLogin: true });
      return;
    }
    if (err.retryAfter) delay = err.retryAfter * 1000;
    setStatus(err.message);
  } finally {
    setTimeout(poll, delay);
  }
}

/* ---------- wiring ---------- */

el.login.addEventListener("click", () => beginLogin());
el.logout.addEventListener("click", () => {
  signOut();
  location.reload();
});

// Re-centre the active line when the window changes shape, or when anything
// that affects its placement changes.
function recentre() {
  const index = state.activeIndex;
  state.activeIndex = -1;
  focusLine(index);
}

addEventListener("resize", recentre);

// The settings page runs in its own tab; adopt saved changes as they happen.
onSettingsChange((next) => {
  cfg = next;
  applySettings(cfg);
  engine.setDensity(cfg.effectDensity);
  engine.setSizeScale(cfg.effectScale);
  requestAnimationFrame(recentre);
});

// Likewise the builder: effects saved there take hold without a reload.
onEffectsChange(rebuildCues);

if (isSignedIn()) {
  hideNotice();
  setStatus("connecting…");
  poll();
} else {
  showNotice("Spotify Lyrics", "Synced lyrics for whatever you're playing.", { withLogin: true });
}

requestAnimationFrame(tick);
