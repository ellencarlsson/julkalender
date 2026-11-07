/** Pick task logic: the chosen options must be exactly the right ones. */

/**
 * Args:
 *   options: [{ text, correct }] as listed in the task.
 *   chosen: Set of chosen option indices.
 * Returns:
 *   true when every right option is chosen and no wrong one is.
 */
export function isRightPick(options, chosen) {
  return options.every((option, index) => Boolean(option.correct) === chosen.has(index));
}
