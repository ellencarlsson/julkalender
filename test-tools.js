/** TEST_TOOLS: temporary testing buttons. Remove before the calendar is given away. */

/**
 * A small button that asks for confirmation before running a test action.
 *
 * Args:
 *   label: the button text.
 *   question: the confirm() text.
 *   action: async function to run; the button is disabled while it runs.
 */
export function testButton(label, question, action) {
  const button = Object.assign(document.createElement("button"), { type: "button", className: "reset-door small" });
  button.textContent = label;
  button.addEventListener("click", async () => {
    if (!confirm(question)) return;
    button.disabled = true;
    try {
      await action();
      button.textContent = label;
    } catch {
      button.textContent = "Det gick inte. Försök igen.";
    }
    button.disabled = false;
  });
  return button;
}
