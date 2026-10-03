// Authorization Code flow with PKCE. No client secret is involved: the code
// verifier proves this is the same client that started the flow.
import { CLIENT_ID, REDIRECT_URI, SCOPES } from "./config.js";

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const AUTH_URL = "https://accounts.spotify.com/authorize";
const STORE = "spotify_lyrics_tokens";
// The verifier lives in localStorage rather than sessionStorage: if Spotify's
// redirect ever lands in a new tab, a session-scoped value would be gone and
// the sign-in would dead-end.
const VERIFIER = "spotify_lyrics_verifier";

function randomString(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function challengeFor(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(digest);
}

function readTokens() {
  try {
    const tokens = JSON.parse(localStorage.getItem(STORE));
    if (!tokens) return null;

    // Tokens belong to the app that issued them. If the client id changes,
    // the old ones can only produce confusing failures, so drop them and ask
    // for a fresh sign-in instead.
    // A missing client means the tokens predate this check, so they were
    // issued by the previous app and are no good either.
    if (tokens.client !== CLIENT_ID) {
      localStorage.removeItem(STORE);
      return null;
    }

    return tokens;
  } catch {
    return null;
  }
}

function writeTokens(payload) {
  const tokens = {
    client: CLIENT_ID,
    access_token: payload.access_token,
    // A refresh response may omit the refresh token; keep the one we have.
    refresh_token: payload.refresh_token || readTokens()?.refresh_token,
    expires_at: Date.now() + (payload.expires_in - 60) * 1000,
  };
  localStorage.setItem(STORE, JSON.stringify(tokens));
  return tokens;
}

export function isSignedIn() {
  return Boolean(readTokens()?.refresh_token || readTokens()?.access_token);
}

export function signOut() {
  localStorage.removeItem(STORE);
  localStorage.removeItem(VERIFIER);
}

export async function beginLogin() {
  const verifier = randomString(96);
  localStorage.setItem(VERIFIER, verifier);
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: await challengeFor(verifier),
    state: randomString(16),
  });
  location.assign(`${AUTH_URL}?${params}`);
}

export async function exchangeCode(code) {
  const verifier = localStorage.getItem(VERIFIER);
  if (!verifier) throw new Error("Login session expired — try connecting again.");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  localStorage.removeItem(VERIFIER);
  writeTokens(await res.json());
}

async function refresh(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });
  // Only a refusal of the credentials themselves means the session is over.
  // Treating every failure that way signed people out whenever Spotify was
  // throttling or briefly unwell — and signing out leads to signing back in,
  // which costs more requests and digs the hole deeper.
  if (res.status === 429) {
    const wait = Number(res.headers.get("Retry-After") || 30);
    throw Object.assign(new Error("rate limited by Spotify"), { retryAfter: wait });
  }
  if (res.status >= 500) {
    throw Object.assign(new Error("Spotify is unavailable"), { retryAfter: 30 });
  }
  if (!res.ok) throw new Error("session-expired");

  return writeTokens(await res.json());
}

export async function accessToken() {
  const tokens = readTokens();
  if (!tokens) throw new Error("not-signed-in");
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  if (!tokens.refresh_token) throw new Error("session-expired");
  return (await refresh(tokens.refresh_token)).access_token;
}
