/** Letter touches for a task: a worksheet header, an envelope, or the parchment itself as a letter. */

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

/** "Matematik – Ekvationer" at the top, with a name line (already filled in by hand when given). */
export function worksheetHeader(title, studentName) {
  const header = element("div", "ws-header");
  const name = element("p", "ws-name", "Namn: ");
  name.append(element("span", "ws-line", studentName ?? ""));
  header.append(element("p", "ws-subject", title), name);
  return header;
}

/**
 * An envelope (a picture with Christmas stamps) with a handwritten address.
 *
 * Args:
 *   lines: the address lines, e.g. ["Till eleven", "Alfabetsvägen 1–26", "123 45 Bokstavsby"].
 *   sentText: shown under the envelope, with a "SKICKAT" stamp, once the task card is done.
 * Returns:
 *   The envelope with its sent message.
 */
export function envelope(lines, sentText) {
  const letter = element("div", "envelope");
  letter.setAttribute("role", "img");
  letter.setAttribute("aria-label", `Ett brev adresserat till ${lines.join(", ")}`);
  const address = element("div", "envelope-address");
  address.append(...lines.map((line) => element("p", "", line)));
  letter.append(address, element("span", "envelope-sent-stamp", "SKICKAT"));
  if (!sentText) return [letter];
  const sent = element("p", "envelope-sent", sentText);
  sent.setAttribute("role", "status");
  return [letter, sent];
}

/** The address handwritten in the top corner, as when the whole parchment is the letter. */
export function letterAddress(lines) {
  const address = element("div", "letter-address");
  address.append(...lines.map((line) => element("p", "", line)));
  return address;
}

/** A SKICKAT stamp and a message, shown on the parchment once the task card is done. */
export function letterSent(text) {
  const sent = element("div", "letter-sent");
  const message = element("p", "letter-sent-text", text);
  message.setAttribute("role", "status");
  sent.append(element("span", "letter-sent-stamp", "SKICKAT"), message);
  return sent;
}
