/** Hit testing for picture hotspot tasks; points and areas are in percent of the picture, so any size works. */

/**
 * Where a tap landed, in percent of the picture's box.
 *
 * Args:
 *   clientX, clientY: the tap position on the page.
 *   box: the picture's bounding rectangle ({ left, top, width, height }).
 * Returns:
 *   { x, y } in percent, 0-100 inside the picture.
 */
export function tapPercent(clientX, clientY, box) {
  return { x: ((clientX - box.left) / box.width) * 100, y: ((clientY - box.top) / box.height) * 100 };
}

/** True when the point is inside the area; its edges count as inside. */
export function isInArea(point, area) {
  const inX = point.x >= area.x && point.x <= area.x + area.width;
  const inY = point.y >= area.y && point.y <= area.y + area.height;
  return inX && inY;
}
