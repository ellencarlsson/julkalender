/** Drag a picture button onto a target, or tap it: shared by the ordering and crafting tasks. */

const DRAG_START_PX = 6;

function moveGhost(ghost, event) {
  ghost.style.left = `${event.clientX}px`;
  ghost.style.top = `${event.clientY}px`;
}

/**
 * Makes a button draggable with pointer events (mouse and touch alike).
 *
 * Args:
 *   button: a button holding an <img>; the image follows the pointer while dragging.
 *   options: { targetSelector, onDrop(target), onTap() } where onDrop gets the element matching
 *     targetSelector under the pointer when the drag ends, and onTap runs for a press without a drag.
 */
export function enableDrag(button, { targetSelector, onDrop, onTap }) {
  let drag = null;
  const stop = () => {
    drag?.ghost?.remove();
    button.classList.remove("drag-source--dragging");
    drag = null;
  };
  button.addEventListener("pointerdown", (event) => {
    if (button.disabled) return;
    drag = { x: event.clientX, y: event.clientY, ghost: null };
    button.setPointerCapture(event.pointerId);
  });
  button.addEventListener("pointermove", (event) => {
    if (!drag) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < DRAG_START_PX) return;
    if (!drag.ghost) {
      drag.ghost = Object.assign(button.querySelector("img").cloneNode(), { className: "drag-ghost" });
      document.body.append(drag.ghost);
      button.classList.add("drag-source--dragging");
    }
    moveGhost(drag.ghost, event);
  });
  button.addEventListener("pointerup", (event) => {
    const dragged = Boolean(drag?.ghost);
    const wasPressed = Boolean(drag);
    stop();
    if (!wasPressed) return;
    if (!dragged) return onTap();
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(targetSelector);
    if (target) onDrop(target);
    // The click that follows pointerup must not also count as a tap on the target under it.
    suppressNextClick();
  });
  button.addEventListener("pointercancel", stop);
}

let suppressUntil = 0;

function suppressNextClick() {
  suppressUntil = performance.now() + 50;
}

/** True right after a drag ended, when the browser sends a stray click to whatever is under the pointer. */
export const isStrayClick = () => performance.now() < suppressUntil;
