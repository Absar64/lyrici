# Spotify Lyrics

Live, synchronised lyrics for whatever is playing on your Spotify account. Small
header with artwork, title and artist; the rest of the screen is the lyrics over
a heavily blurred wash of the album cover. No playback or progress controls.

## Where the pieces come from

| Piece | Source |
| --- | --- |
| Current track, playback position | Spotify Web API — `GET /v1/me/player/currently-playing` |
| Timed lyrics | [LRCLIB](https://lrclib.net) — free, no key, CORS-enabled |

Spotify's Web API does not expose lyrics at all, so a lyrics provider is
required. LRCLIB returns `.lrc` files (one timestamp per line), which the app
parses and drives off Spotify's reported position.

## Run it

It is static files — any HTTP server works, but the origin must be a loopback
address, because Spotify only accepts `http://` redirect URIs on `127.0.0.1`.

```bash
python -m http.server 8888 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8888>.

## One-time Spotify setup

In the [Spotify developer dashboard](https://developer.spotify.com/dashboard),
open your app → **Settings** → **Edit**, and add this exact Redirect URI:

```
http://127.0.0.1:8888/callback.html
```

If you serve on a different port, change the port here and in the URI you add.
The client ID is already filled in at [config.js](config.js).

**About the client secret:** this is a browser-only app, so it uses the
Authorization Code + PKCE flow, which needs no secret. A secret placed in
front-end code is readable by anyone who loads the page — the secret you pasted
into our chat should be rotated in the dashboard, and never shipped to a client.

## Account access

While your Spotify app is in development mode, only users you add under
**User Management** in the dashboard can sign in. Add your own account there if
the login page refuses.

## Settings

Open **settings** in the status bar, or go straight to
<http://127.0.0.1:8888/settings.html>. Controls sit on the left, a live preview
on the right — every change applies instantly, saves itself, and is picked up by
an already-open lyrics tab without a reload.

| Group | What you can change |
| --- | --- |
| Type | Font (six soft faces + system), lyric size, weight, line height, letter spacing, capitalisation |
| Position | Text alignment, how far down the screen the active line sits, line spacing, side/top/bottom padding, max width |
| Emphasis | Opacity of active / nearby / distant lines, how many lines count as nearby, inactive blur, edge fade, scroll speed, timing offset |
| Background | Ambience on/off, blur intensity, brightness, saturation, zoom, darkening veil, base colour |
| Header | Show header / artwork / artist, alignment, artwork size, title and artist size |
| Behaviour | Status bar on/off, Spotify poll interval |

Out of the box lyrics are held back by 950ms and bursts are drawn at three
times their authored size. Both are settings: **Timing offset** and
**Effect size** under Effects.

**Reset to defaults** at the bottom of the panel puts everything back.

The **Backup** section exports your settings as a JSON file and loads them back
again, which is how you carry the same look to another browser or machine.
Import accepts a settings file or a full effects backup from the builder, since
"Export all" there carries the settings too. **Paste JSON** takes the same
content pasted straight in, which is the easier route on a phone where saving
and picking files is awkward; the effects builder has the same button. Only keys this version knows about
are applied, and only when the value is the right shape, so a stale or edited
file cannot leave the app in a strange state; anything else is reported as not
recognised.

Settings are stored in `localStorage` per browser. Defaults live in one place —
`DEFAULTS` in [settings.js](settings.js) — and the stylesheet's `:root` mirrors
them so the first paint is correct before JavaScript runs. To add an option, add
it to `DEFAULTS`, map it to a CSS variable in `apply()`, and add a row to
`SCHEMA` in [settings-ui.js](settings-ui.js).

## Lyric effects

Open **effects** in the status bar, or go to
<http://127.0.0.1:8888/builder.html>. Drag an effect from the left rail onto a
word. Click a word first, shift-click a second, and a drop covers the whole
phrase. Clicking a chip applies it to the current selection without dragging.

Everything saves itself against that song's Spotify track id, so the effects
come back every time the song plays. The right rail lists what is on the song;
open a card to tune it, preview it, or remove it. **Rehearse** runs the whole
song's cues on a virtual clock so you can time effects without waiting for the
track to come round again.

| Background bursts | Text effects |
| --- | --- |
| Hearts, Kiss, Balloons, Confetti, Sparkles, Stardust, Flames, Snow, Bubbles, Petals, Music notes, Fireworks | Slam, Big & loud, Spotlight, Shake, Glow, Colour flash, Bounce, Glitch, Neon flicker, Rainbow, Rise, Heartbeat |

Twenty-four in all, twelve of each kind.

Bursts are canvas particles; each one takes amount, size, speed, spread,
lifetime, sway, where it starts from (the word, screen centre, bottom or top)
and whether it draws behind or in front of the lyrics. Text effects take
duration, intensity and colour, plus a screen-shake option, and Spotlight also
controls how dark everything else goes. Every value is per assignment, so the
same effect can behave differently on two words in one song.

Settings → Effects has a master on/off and a particle-amount multiplier.

### Import and export

The **Library** section of the right rail saves and restores effects as JSON
files. Nothing is uploaded anywhere; the file is written by your own browser.

- **Export song** writes just the song you are editing, named after the artist
  and title, so you can share one song's effects on their own.
- **Export all** writes every song you have effects for, plus your appearance
  settings, as a dated backup.
- **Import a file** accepts either kind. It tells you how many songs and effects
  the file holds and asks before writing anything. Songs you already have
  effects for are replaced; everything else is merged in, so importing a single
  song never disturbs the rest of your library.

Imported files are treated as untrusted input: every assignment is rebuilt field
by field and anything malformed is counted as skipped rather than stored. If the
file turns out not to be an effects file, the import is refused.

### Keeping it smooth

The particle loop is tuned against measurements, not guesses, and the numbers
below are per 1500 glyph draws in Chrome:

- The font is set **once per frame** and each particle's size is carried by the
  transform matrix. Assigning `font` per particle cost 33.4ms; this costs 3.6ms
  for the same pixels.
- `setTransform` replaces `save()`/`restore()` per particle (9.1ms to 2.5ms).
- Canvas state (fill, shadow) is mirrored in JavaScript and only written when it
  actually changes.
- An idle layer is not cleared, and the loop stops entirely when no particles
  are alive.
- At most 650 particles live at once; beyond that the oldest, already-fading
  ones make way.
- If frames run long, new bursts are thinned automatically and recover when
  there is headroom again. Settings has a particle-amount multiplier if you
  would rather set it yourself.

Text effects animate only `transform` and `opacity`, the two properties a
compositor can handle without redoing layout or paint:

- A glow is painted by a pseudo-element holding a copy of the word with the
  shadow on it permanently, and only that copy's opacity animates. Animating
  `text-shadow` itself repainted the text every frame, which is what made the
  glowing effects crawl on phones.
- `letter-spacing` is no longer animated, since changing it reflows the line on
  every frame.
- The screen shake moves the content layer rather than `<body>`, so the
  full-screen blurred artwork is not re-composited while it runs.

Pre-rendered sprites were tried for particles and were *slower* than drawing glyphs
directly, so they are deliberately not used. The same applies to the glow on
fireworks: `shadowBlur` measured roughly five times faster than blitting a
gradient sprite at that size.

If effects still feel heavy on a slow machine, the cheapest wins are lowering
**Particle amount** in Settings, dropping **Inactive blur** to 0, and turning
off the album **ambience** blur.

### On phones

The app is built to behave the same on a phone as on a laptop, with a few
things worth knowing:

- **Motion.** iOS turns on Reduce Motion under Accessibility, and the app used
  to honour it by switching animation off altogether: lyrics jumped between
  lines instead of gliding and text effects did not play at all. Reduced motion
  now simply shortens the long movements and drops the full-screen shake, and
  **Settings -> Effects -> Motion** can force full motion whatever the device
  says.
- **Emoji render as bitmaps.** Apple Color Emoji are bitmap (sbix) glyphs, and
  WebKit often refuses to draw them through a scaled canvas transform, which
  silently dropped every emoji effect on iOS while the shape-drawn ones and the
  plain symbols kept working. Each glyph is now rasterised once into an
  offscreen canvas and blitted, which renders everywhere.
- **Bursts scale with the screen.** Sizes and speeds are authored for a roughly
  800px screen and scaled between half and double that, so an effect covers the
  same share of a phone as of a large monitor.
- **Effects stay on their word.** The particle canvas measures its own box
  rather than the window. The two differ on iOS as the browser toolbars grow
  and shrink, and the canvas sets its own layout so a slow stylesheet cannot
  leave it mis-sized on a cold load. Both were enough to send a burst out of
  the wrong word.
- **No dragging on touch.** iOS fires no HTML5 drag events, so in the builder
  you tap a word and then tap an effect; tap a second word with the first still
  selected to cover a phrase. The hint in the palette says so on touch devices.
- Heights use `dvh`, so the footer is not left under the browser chrome, and
  controls are sized to avoid iOS zooming the page when you focus a field.

### How a word gets its moment

LRCLIB gives one timestamp per line, not per word, so a word's time is estimated
by walking through the line proportionally by characters. That lands close
enough for an effect to hit the beat; where it doesn't, each assignment has a
**timing nudge** of ±3 s. If LRCLIB later returns a different version of the
lyrics, an assignment whose stored words no longer match that position is
skipped rather than fired against the wrong word.

## Staying inside Spotify's rate limit

Spotify counts requests per app over a rolling window, and an idle tab left
open is what exhausts that budget — not actually watching lyrics. The loop
therefore only asks when there is something to learn:

| State | Requests |
| --- | --- |
| Page not on screen | none at all; it resumes the moment you come back |
| Playing | one every 5s (the **Spotify poll interval** setting) |
| Paused, or nothing playing | one every 20s |
| Rate limited | honours `Retry-After`, then doubles while it keeps happening |

Measured with a stubbed API: 720 requests/hour while actively watching, 180
while paused, none while hidden. Before this the loop ran every 2.5s forever
regardless of any of it, which is 1,440/hour per open tab, around the clock.

## How the sync works

Spotify is polled every 2.5 s by default (adjustable in settings). Between
polls, the position is advanced from the local clock, so the active line changes
on the beat rather than in poll-sized steps. Pausing freezes the position; the
next poll reconciles any seek. Lines are highlighted 220 ms early by default
(the "timing offset" setting) so a line settles as it is sung — raise it if your
lines land late, lower it if they land early.

Timestamp markers never reach the screen: line stamps are consumed when parsing,
and the per-word `<00:12.34>` markers found in enhanced `.lrc` files are stripped
from the text, as are any stray stamps inside unsynced lyrics.

## Files

- [index.html](index.html) — markup: background layers, header, lyric stage
- [styles.css](styles.css) — blur ambience, soft type, focus/blur line states
- [config.js](config.js) — client ID, redirect URI, scopes
- [auth.js](auth.js) — PKCE login, token storage and refresh
- [callback.js](callback.html) — OAuth redirect landing page
- [lyrics.js](lyrics.js) — LRCLIB lookup, `.lrc` parsing, per-track cache
- [app.js](app.js) — polling loop, timing, rendering, effect cues
- [spotify.js](spotify.js) — the one Spotify playback call
- [effects.js](effects.js) — effect registry, particle system, text animations
- [effects.css](effects.css) — word targeting and the text-effect keyframes
- [effects-store.js](effects-store.js) — per-song assignments in localStorage
- [cues.js](cues.js) — word splitting and cue timing, shared by both views
- [builder.html](builder.html) / [builder-ui.js](builder-ui.js) / [builder.css](builder.css) — the effects builder
- [ui-controls.js](ui-controls.js) — the field widget shared by both editors
- [settings.js](settings.js) — defaults, storage, and the CSS-variable mapping
- [settings.html](settings.html) / [settings-ui.js](settings-ui.js) — settings page and live preview

## Notes

- Falls back to unsynced lyrics when no timed version exists, and says so when
  LRCLIB has nothing for a track.
- Podcast episodes are handled gracefully (artwork and title show; lyrics
  normally won't be found).
- Lyrics are fetched live from LRCLIB and are not stored beyond the in-memory
  cache for the current session.
