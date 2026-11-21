(() => {
  "use strict";
  const root = document.querySelector("#native-fisheye-gallery");
  if (!root) return;
  const buttons = [...root.querySelectorAll("[data-fisheye-choice]")];
  const panels = [...root.querySelectorAll(".fisheye-comparison")];
  let selected = 0;
  function show(index, focus = false) {
    selected = (index + buttons.length) % buttons.length;
    buttons.forEach((button, i) => {
      button.setAttribute("aria-pressed", String(i === selected));
    });
    panels.forEach((panel, i) => {
      panel.hidden = i !== selected;
      panel.setAttribute("aria-hidden", String(i !== selected));
    });
    root.dataset.fisheyeScene = buttons[selected].dataset.fisheyeChoice;
    // Reuse the existing paired-player lifecycle, including hidden-card release.
    root.dispatchEvent(new CustomEvent("gallerypagechange", {bubbles: true}));
    if (focus) buttons[selected].focus({preventScroll: true});
  }
  buttons.forEach((button, i) => {
    button.addEventListener("click", () => show(i));
    button.addEventListener("keydown", event => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      show(event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 :
        selected + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1), true);
    });
  });
  show(0);
})();
