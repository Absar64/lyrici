// Spotify's Web API does not expose lyrics, so timed lines come from LRCLIB —
// a free, CORS-friendly database of .lrc files keyed by track/artist/album/duration.
const BASE = "https://lrclib.net/api";
const cache = new Map();

// Enhanced .lrc files carry per-word timings inline as <00:12.34>, and some
// files repeat the line stamp mid-text. Neither should ever reach the screen.
function stripStamps(text) {
  return text
    .replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, "")
    .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// "[01:23.45] a line" -> { time: 83.45, text: "a line" }
// A single line may carry several timestamps; each one yields an entry.
function parseLrc(lrc) {
  const stamp = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const lines = [];

  for (const raw of lrc.split(/\r?\n/)) {
    const times = [];
    let match;
    stamp.lastIndex = 0;
    while ((match = stamp.exec(raw)) !== null) {
      const [, min, sec, frac = "0"] = match;
      times.push(Number(min) * 60 + Number(sec) + Number(frac.padEnd(3, "0")) / 1000);
    }
    if (!times.length) continue;
    const text = stripStamps(raw.slice(stamp.lastIndex));
    for (const time of times) lines.push({ time, text });
  }

  return lines.sort((a, b) => a.time - b.time);
}

async function getJson(path, params) {
  const res = await fetch(`${BASE}/${path}?${new URLSearchParams(params)}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LRCLIB ${res.status}`);
  return res.json();
}

// Exact lookup first; fall back to a search when the album or duration disagree
// (remasters, singles, regional editions).
async function lookup(track) {
  const common = {
    track_name: track.name,
    artist_name: track.artist,
    album_name: track.album,
    duration: Math.round(track.durationMs / 1000),
  };

  const exact = await getJson("get", common);
  if (exact) return exact;

  const hits = await getJson("search", { track_name: track.name, artist_name: track.artist });
  if (!Array.isArray(hits) || !hits.length) return null;

  const seconds = common.duration;
  const synced = hits.filter((hit) => hit.syncedLyrics);
  const pool = synced.length ? synced : hits;
  return pool.reduce((best, hit) =>
    Math.abs((hit.duration ?? 0) - seconds) < Math.abs((best.duration ?? 0) - seconds) ? hit : best
  );
}

/**
 * @returns {Promise<{kind: "synced"|"plain"|"none", lines: {time:number,text:string}[], text: string}>}
 */
export async function fetchLyrics(track) {
  if (cache.has(track.id)) return cache.get(track.id);

  let result = { kind: "none", lines: [], text: "" };
  try {
    const hit = await lookup(track);
    if (hit?.syncedLyrics) {
      const lines = parseLrc(hit.syncedLyrics);
      if (lines.length) result = { kind: "synced", lines, text: "" };
    }
    if (result.kind === "none" && hit?.plainLyrics) {
      const text = hit.plainLyrics.split(/\r?\n/).map(stripStamps).join("\n");
      result = { kind: "plain", lines: [], text };
    }
  } catch {
    // Network or upstream trouble: treat as "no lyrics" and let the next
    // track try again, rather than caching a failure.
    return result;
  }

  cache.set(track.id, result);
  return result;
}
