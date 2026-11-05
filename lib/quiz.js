/** Quiz answer checking: answers are compared as plain text after normalization. */

/** NFC so a decomposed "ä" matches a typed one; case, outer spaces and repeated spaces are ignored. */
export function normalizeAnswer(text) {
  return String(text ?? "").normalize("NFC").trim().toLocaleLowerCase("sv-SE").replace(/\s+/g, " ");
}

export function isCorrectAnswer(input, answers) {
  const given = normalizeAnswer(input);
  return given !== "" && (answers ?? []).some((answer) => normalizeAnswer(answer) === given);
}
