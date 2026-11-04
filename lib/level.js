/** Level display math shared by the header ring. */

export const XP_PER_LEVEL = 100;

/** Percent of the ring to fill for XP earned within the current level, clamped to 0-100. */
export function xpRingPercent(xpInLevel) {
  if (!Number.isFinite(xpInLevel)) return 0;
  const percent = (xpInLevel / XP_PER_LEVEL) * 100;
  return Math.round(Math.min(100, Math.max(0, percent)));
}
