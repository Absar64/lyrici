// Shared word handling and cue timing, used by both the lyrics view and the
// builder so a word means the same thing in each.

/** Split a lyric line into words. Index positions here are what assignments store. */
export function splitWords(text) {
  return text.split(/\s+/).filter(Boolean);
}

/**
 * LRCLIB timings are per line, not per word, so a word's moment is estimated:
 * walk through the line proportionally by characters, which tracks sung speech
 * closely enough for an effect to land on the right beat. A per-assignment
 * offset lets you nudge anything the estimate gets wrong.
 */
export function wordTimeMs(lines, lineIndex, wordIndex) {
  const line = lines[lineIndex];
  if (!line) return 0;

  const words = splitWords(line.text);
  const next = lines[lineIndex + 1];
  // Lines at the end of a song have no successor to bound them.
  const span = Math.min(next ? next.time - line.time : 4, 8);

  const total = words.join(" ").length || 1;
  const before = words.slice(0, wordIndex).join(" ").length;
  // 0.9 keeps the last word from landing exactly on the next line's start.
  const fraction = Math.min(before / total, 1) * 0.9;

  return Math.round((line.time + span * fraction) * 1000);
}

/**
 * Turn stored assignments into a time-sorted cue list. Assignments whose text
 * no longer matches the lyrics (a different version came back from LRCLIB) are
 * dropped rather than firing against the wrong word.
 */
export function buildCues(lines, assignments) {
  const cues = [];

  for (const assignment of assignments) {
    const line = lines[assignment.line];
    if (!line) continue;

    const words = splitWords(line.text);
    const actual = words.slice(assignment.from, assignment.to + 1).join(" ");
    if (assignment.words && actual.toLowerCase() !== assignment.words.toLowerCase()) continue;

    cues.push({
      at: wordTimeMs(lines, assignment.line, assignment.from) + (assignment.offsetMs ?? 0),
      assignment,
    });
  }

  return cues.sort((a, b) => a.at - b.at);
}

export function formatTime(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
