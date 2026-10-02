// The one Spotify call this app makes, shared by the lyrics view and the builder.
import { accessToken } from "./auth.js";

export async function currentlyPlaying() {
  const token = await accessToken();
  const res = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing?additional_types=track,episode",
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (res.status === 204) return null;            // nothing playing
  if (res.status === 401) throw new Error("session-expired");
  if (res.status === 429) {
    const wait = Number(res.headers.get("Retry-After") || 5);
    throw Object.assign(new Error("rate limited by Spotify"), { retryAfter: wait });
  }
  if (!res.ok) throw new Error(`Spotify ${res.status}`);

  const body = await res.json();
  const item = body.item;
  if (!item) return null;

  return {
    track: {
      id: item.id ?? `${item.name}-${item.show?.name ?? ""}`,
      name: item.name,
      artist: item.artists?.map((a) => a.name).join(", ") || item.show?.name || "",
      album: item.album?.name ?? "",
      durationMs: item.duration_ms ?? 0,
      artwork: (item.album?.images ?? item.images ?? [])[0]?.url ?? null,
    },
    isPlaying: Boolean(body.is_playing),
    positionMs: body.progress_ms ?? 0,
  };
}
