// Finding and showing the music video for the track that is playing.
//
// Embedding a video by id is free, but finding which id needs the YouTube Data
// API, so a key is required. The keyless routes that used to exist are gone:
// song.link's public API now answers PUBLIC_API_ACCESS_DEPRECATED, and
// YouTube's listType=search embed answers "Error 153". Rather than guess, the
// key lives in Settings and the button falls back to opening a search.

const SEARCH = "https://www.googleapis.com/youtube/v3/search";

// Resolved ids per track, so reopening a video costs no quota. A search is
// 100 units of a 10,000/day allowance, which is ~100 distinct songs a day.
const resolved = new Map();

/**
 * Rank candidates so the artist's own upload wins over the lyric videos,
 * covers and reaction clips that a plain search turns up.
 */
function rank(item, track) {
  const channel = (item.snippet?.channelTitle ?? "").toLowerCase();
  const title = (item.snippet?.title ?? "").toLowerCase();
  const artist = track.artist.split(",")[0].trim().toLowerCase();

  let score = 0;
  if (artist && channel.includes(artist)) score += 5;
  if (channel.endsWith("vevo")) score += 4;
  if (title.includes("official music video")) score += 4;
  else if (title.includes("official video")) score += 3;
  else if (title.includes("official")) score += 1;

  // "- Topic" channels are auto-generated audio, not a video.
  if (channel.endsWith("- topic")) score -= 4;
  if (/lyrics?\b/.test(title)) score -= 2;
  if (/\b(live|cover|reaction|karaoke|remix|sped up|slowed)\b/.test(title)) score -= 3;

  return score;
}

async function lookUp(track, apiKey) {
  if (resolved.has(track.id)) return resolved.get(track.id);

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: "8",
    q: `${track.artist} ${track.name} official video`,
    key: apiKey,
  });

  const res = await fetch(`${SEARCH}?${params}`);

  if (res.status === 403) {
    throw new Error("YouTube refused the key — check it is valid and its quota is not spent.");
  }
  if (res.status === 400) throw new Error("YouTube rejected the request. Check the API key in Settings.");
  if (!res.ok) throw new Error("YouTube could not be reached just now.");

  const body = await res.json();
  const items = Array.isArray(body.items) ? body.items : [];
  const best = items
    .map((item) => ({ item, score: rank(item, track) }))
    .sort((a, b) => b.score - a.score)[0];

  const id = best?.item?.id?.videoId ?? null;
  resolved.set(track.id, id);
  return id;
}

function searchUrl(track) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${track.artist} ${track.name} official video`)}`;
}

/**
 * @param {{root: HTMLElement, wash: HTMLElement, frame: HTMLElement,
 *          note: HTMLElement, close: HTMLElement}} el
 */
export function createVideoPlayer(el, apiKey = () => "") {
  let open = false;

  function setNote(text, track) {
    el.note.replaceChildren();
    if (!text) return;

    const line = document.createElement("span");
    line.textContent = text;
    el.note.append(line);

    if (track) {
      // Opening a search is left to a deliberate click rather than happening
      // on its own, since it leaves the app.
      const link = document.createElement("a");
      link.className = "video__search";
      link.href = searchUrl(track);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Search YouTube";
      el.note.append(link);
    }
  }

  function play(id) {
    const frame = document.createElement("iframe");
    // Built in response to the button press, so the browser counts this as a
    // user gesture and lets it start with sound.
    frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3`;
    frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    frame.referrerPolicy = "strict-origin-when-cross-origin";
    frame.title = "Music video";
    el.frame.replaceChildren(frame);
  }

  async function show(track) {
    open = true;
    el.root.hidden = false;
    document.body.classList.add("is-video-open");

    // The blurred artwork fills whatever the video's shape leaves over.
    el.wash.style.backgroundImage = track.artwork ? `url("${track.artwork}")` : "none";

    el.frame.replaceChildren();

    const key = apiKey();
    if (!key) {
      setNote("Add a YouTube API key in Settings to play videos here.", track);
      return;
    }

    setNote("Finding the video…");

    try {
      const id = await lookUp(track, key);
      if (!open) return; // closed while the lookup was in flight

      if (id) {
        play(id);
        setNote("");
      } else {
        setNote("No official video is listed for this track.", track);
      }
    } catch (err) {
      if (open) setNote(err.message, track);
    }
  }

  function hide() {
    open = false;
    el.root.hidden = true;
    document.body.classList.remove("is-video-open");
    el.frame.replaceChildren(); // removing the iframe is what stops the audio
    setNote("");
  }

  el.close.addEventListener("click", hide);

  // A click on the surround closes; clicks on the video itself do not.
  el.root.addEventListener("click", (event) => {
    if (event.target === el.root || event.target === el.wash) hide();
  });

  addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open) hide();
  });

  return {
    show,
    hide,
    get isOpen() {
      return open;
    },
  };
}
