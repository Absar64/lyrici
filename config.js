// Spotify app credentials.
// Only the client ID belongs here: this file ships to the browser, so a secret
// placed here would be public. The PKCE flow used in auth.js needs no secret.
export const CLIENT_ID = "d06a2e6ebbb044d9a0cde751c3cbf023";

// Must match a Redirect URI registered in your Spotify app settings, exactly.
// Resolved against the current page rather than the origin, so it is correct
// both at the root (http://127.0.0.1:8888/) and under a subpath, as on GitHub
// Pages (https://<user>.github.io/<repo>/).
export const REDIRECT_URI = new URL("callback.html", location.href).href;

export const SCOPES = ["user-read-currently-playing", "user-read-playback-state"];
