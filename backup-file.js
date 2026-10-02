// Reading and writing backup files. Everything here stays on this machine:
// the browser writes the file and the browser reads it back.

/** Hand a JSON payload to the browser as a download. */
export function download(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Parse a picked file, or null if it is not JSON at all. */
export async function readJson(file) {
  try {
    return JSON.parse(await file.text());
  } catch {
    return null;
  }
}

/** Today's date, for naming backups. */
export function datestamp() {
  return new Date().toISOString().slice(0, 10);
}
