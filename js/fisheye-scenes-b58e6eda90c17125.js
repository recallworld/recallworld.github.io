(() => {
  "use strict";
  const root = document.querySelector("#native-fisheye-gallery");
  if (!root) return;
  const buttons = [...root.querySelectorAll("[data-fisheye-choice]")];

  function showScene(button, focus = false) {
    if (!button) return;
    buttons.forEach(other => {
      const selected = other === button;
      other.setAttribute("aria-pressed", String(selected));
      const panel = document.getElementById(other.getAttribute("aria-controls"));
      panel.hidden = !selected;
      panel.setAttribute("aria-hidden", String(!selected));
    });
    root.dataset.fisheyeScene = button.dataset.fisheyeChoice;
    root.dispatchEvent(new CustomEvent("gallerypagechange", {bubbles: true}));
    if (focus) button.focus({preventScroll: true});
  }

  buttons.forEach((button, current) => {
    button.addEventListener("click", () => showScene(button));
    button.addEventListener("keydown", event => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
        (current + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) + buttons.length) % buttons.length;
      showScene(buttons[next], true);
    });
  });
  showScene(buttons.find(button => button.dataset.fisheyeDefault === "true") || buttons[0]);
})();
