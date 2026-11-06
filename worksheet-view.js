/** School-assignment touches for a task: a worksheet header and a letter in an envelope. */

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
