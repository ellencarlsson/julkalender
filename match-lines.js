/** Draws a coloured line between each chosen picture and name in a matching board. */

const SVG_NS = "http://www.w3.org/2000/svg";

export function createLineLayer() {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", "match-lines");
  svg.setAttribute("aria-hidden", "true");
  return svg;
}

/** Stacked rows (desktop) join bottom to top; side by side columns (phones) join edge to edge. */
function endpoints(boardRect, itemRect, targetRect) {
  const sideways = targetRect.top < itemRect.bottom - 1;
  const x = (rect, edge) => rect[edge] - boardRect.left;
  const y = (rect, edge) => rect[edge] - boardRect.top;
  const midX = (rect) => x(rect, "left") + rect.width / 2;
  const midY = (rect) => y(rect, "top") + rect.height / 2;
  return sideways
    ? [x(itemRect, "right"), midY(itemRect), x(targetRect, "left"), midY(targetRect)]
    : [midX(itemRect), y(itemRect, "bottom"), midX(targetRect), y(targetRect, "top")];
}

function line(coords, color) {
  const node = document.createElementNS(SVG_NS, "line");
  ["x1", "y1", "x2", "y2"].forEach((name, i) => node.setAttribute(name, coords[i]));
  node.setAttribute("class", "match-line");
  node.style.setProperty("--pair-color", color);
  return node;
}

/**
 * Redraws all pair lines.
 *
 * Args:
 *   board: the matching board element that holds the cards and the line layer.
 *   svg: the line layer from createLineLayer().
 *   pairs: list of { item, target, color } with the two card elements and a CSS colour.
 */
export function drawLines(board, svg, pairs) {
  const boardRect = board.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
  svg.replaceChildren(
    ...pairs.map(({ item, target, color }) =>
      line(endpoints(boardRect, item.getBoundingClientRect(), target.getBoundingClientRect()), color),
    ),
  );
}
