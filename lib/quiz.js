/** Quiz answer checking: answers are compared as plain text after normalization. */

/** NFC so a decomposed "ä" matches a typed one; case, outer spaces and repeated spaces are ignored. */
export function normalizeAnswer(text) {
  return String(text ?? "").normalize("NFC").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g, " ");
}

export function isCorrectAnswer(input, answers) {
  const given = normalizeAnswer(input);
  return given !== "" && (answers ?? []).some((answer) => normalizeAnswer(answer) === given);
}

/** "1:30", "01.30", "0130" or "1" as minutes after midnight; null when it is not a time. */
export function parseTime(text) {
  const match = String(text ?? "").trim().match(/^(\d{1,2})(?:\s*[:.,]?\s*(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? 0);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** A typed time counts as right anywhere from range.from to range.to, both included. */
export function isTimeInRange(input, range) {
  const given = parseTime(input);
  return given !== null && given >= parseTime(range.from) && given <= parseTime(range.to);
}

/** Letters to type in a code-word quiz: the first accepted answer without spaces. */
export function codeWordLength(answers) {
  return [...normalizeAnswer(answers?.[0]).replace(/ /g, "")].length;
}

/** Stored with the revealed crossword words, so a used hint costs one hint point like the lamp. */
export function quizHintKey(taskKey) {
  return `${taskKey}|hint`;
}
