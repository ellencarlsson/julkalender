/** School-assignment touches for a task: a worksheet header and a letter in an envelope. */

const element = (tag, className, text) => Object.assign(document.createElement(tag), { className, ...(text !== undefined && { textContent: text }) });

/** "Matematik – Ekvationer" at the top, with a line to write your name on, like a printed worksheet. */
export function worksheetHeader(title) {
  const header = element("div", "ws-header");
  const name = element("p", "ws-name", "Namn: ");
  name.append(element("span", "ws-line"));
  header.append(element("p", "ws-subject", title), name);
  return header;
}

/**
 * An envelope with a stamp, a postmark and a handwritten address.
 *
 * Args:
 *   lines: the address lines, e.g. ["Till eleven", "Alfabetsvägen 1–26", "123 45 Bokstavsby"].
 * Returns:
 *   The envelope element.
 */
export function envelope(lines) {
  const letter = element("div", "envelope");
  letter.setAttribute("role", "img");
  letter.setAttribute("aria-label", `Ett brev adresserat till ${lines.join(", ")}`);
  const stamp = element("span", "envelope-stamp", "🎄");
  const postmark = element("span", "envelope-postmark", "JUL");
  const address = element("div", "envelope-address");
  address.append(...lines.map((line) => element("p", "", line)));
  letter.append(stamp, postmark, address);
  return letter;
}
