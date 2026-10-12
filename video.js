// Finding and showing the music video for the track that is playing.
//
// Resolution is keyless by default: YouTube's own search page is fetched
// through a CORS proxy and the first result is taken, which is what you would
// get by typing the same words into YouTube. A browser cannot fetch
// youtube.com directly — CORS forbids it — hence the proxy.
//
// Playback uses the IFrame Player API rather than a bare iframe. That is a
// JavaScript library, not the Data API, so it needs no key either, and it
// reports when the video ends, which is what lets the popup close itself.

const IFRAME_API = "https://www.youtube.com/iframe_api";

// Tried in order. Each takes a URL and returns that page's body.
// r.jina.ai is first because it renders the page before returning it: YouTube
// serves a bare JavaScript shell to plain fetchers, and a raw proxy comes back
// with a document containing no results at all.
const PROXIES = [
  (url) => `https://r.jina.ai/${url}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

// Resolved ids per track, so reopening a video costs no second lookup.
const resolved = new Map();

function searchTerms(track) {
  // The artist is included because song titles collide constantly, and the
  // point is this artist's video rather than someone else's song of the name.
  return `${track.name} ${track.artist} music video`;
}

function searchUrl(track) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerms(track))}`;
}

/** First video id in a YouTube results page, which is its first result. */
function firstVideoId(html) {
  const direct = html.match(/"videoId"\s*:\s*"([\w-]{11})"/);
  if (direct) return direct[1];
  const link = html.match(/watch\?v=([\w-]{11})/);
  return link ? link[1] : null;
}

async function lookUpKeyless(track) {
  const target = searchUrl(track);

  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(target), { headers: { Accept: "text/html,text/plain" } });
      if (!res.ok) continue;
      const id = firstVideoId(await res.text());
      if (id) return id;
    } catch {
      // Proxies come and go; try the next one before giving up.
    }
  }

  return null;
}

// Kept as a fallback for anyone who would rather use their own key than a
// public proxy: it is more precise, but it is not required.
async function lookUpWithKey(track, apiKey) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    maxResults: "1",
    q: searchTerms(track),
    key: apiKey,
  });

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (!res.ok) return null;

  const body = await res.json();
  return body?.items?.[0]?.id?.videoId ?? null;
}

async function lookUp(track, apiKey) {
  if (resolved.has(track.id)) return resolved.get(track.id);

  let id = await lookUpKeyless(track);
  if (!id && apiKey) id = await lookUpWithKey(track, apiKey);

  resolved.set(track.id, id);
  return id;
}

/** Loads the IFrame Player API once and resolves when it is ready to use. */
let apiReady = null;

function loadPlayerApi() {
  if (apiReady) return apiReady;

  apiReady = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }

    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };

    const script = document.createElement("script");
    script.src = IFRAME_API;
    script.async = true;
    script.onerror = () => reject(new Error("YouTube's player could not be loaded."));
    document.head.append(script);
  });

  return apiReady;
}

/**
 * @param {{root: HTMLElement, wash: HTMLElement, frame: HTMLElement,
 *          note: HTMLElement, close: HTMLElement}} el
 * @param {() => string} apiKey optional YouTube Data API key
 */
export function createVideoPlayer(el, apiKey = () => "") {
  let open = false;
  let player = null;

  function setNote(text, track, videoId) {
    el.note.replaceChildren();
    if (!text) return;

    const line = document.createElement("span");
    line.textContent = text;
    el.note.append(line);

    if (track) {
      // Opening on YouTube proper is also the one route that uses the account
      // already signed in there, so Premium applies and there are no ads.
      // Leaving the app is left to a deliberate click.
      const link = document.createElement("a");
      link.className = "video__search";
      link.href = videoId ? `https://www.youtube.com/watch?v=${videoId}` : searchUrl(track);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = videoId ? "Watch on YouTube" : "Search YouTube";
      el.note.append(link);
    }
  }

  function destroyPlayer() {
    try {
      player?.destroy();
    } catch {
      // Already gone; nothing to do.
    }
    player = null;
    el.frame.replaceChildren();
  }

  async function play(id, track) {
    const YT = await loadPlayerApi();
    if (!open) return;

    const mount = document.createElement("div");
    el.frame.replaceChildren(mount);

    player = new YT.Player(mount, {
      videoId: id,
      playerVars: {
        // Created from the button press, so the gesture allows sound.
        autoplay: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        origin: location.origin,
      },
      events: {
        onReady: (event) => event.target.playVideo(),
        onStateChange: (event) => {
          // Closing on the end hands the screen back to the lyrics by itself.
          if (event.data === YT.PlayerState.ENDED) hide();
        },
        // 101 and 150 both mean the rights holder has turned off playback
        // outside YouTube, which is common for major-label music videos.
        // Nothing can be done about that from here, and the obvious
        // workaround — playing an unofficial re-upload instead — means
        // showing a copy the artist did not put there, so the offer is to
        // open the real one on YouTube, where a Premium account applies.
        onError: (event) => {
          const code = event.data;
          destroyPlayer();
          if (code === 101 || code === 150) {
            setNote("The artist does not allow this video to play outside YouTube.", track, id);
          } else if (code === 100) {
            setNote("That video is no longer available.", track);
          } else {
            setNote("That video could not be played here.", track, id);
          }
        },
      },
    });
  }

  async function show(track) {
    open = true;
    el.root.hidden = false;
    document.body.classList.add("is-video-open");

    // The blurred artwork fills whatever the video's shape leaves over.
    el.wash.style.backgroundImage = track.artwork ? `url("${track.artwork}")` : "none";

    destroyPlayer();
    setNote("Finding the video…");

    try {
      const id = await lookUp(track, apiKey());
      if (!open) return; // closed while the lookup was in flight

      if (id) {
        setNote("");
        await play(id, track);
      } else {
        setNote("That search turned up nothing playable.", track);
      }
    } catch (err) {
      if (open) setNote(err.message, track);
    }
  }

  function hide() {
    open = false;
    el.root.hidden = true;
    document.body.classList.remove("is-video-open");
    destroyPlayer(); // this is what stops the audio
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
