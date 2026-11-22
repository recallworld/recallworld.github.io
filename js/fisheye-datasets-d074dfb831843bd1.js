(() => {
  "use strict";
  const root = document.querySelector("#native-fisheye-gallery");
  if (!root) return;
  const buttons = [...root.querySelectorAll("[data-fisheye-choice]")];
  const datasets = [...root.querySelectorAll("[data-fisheye-dataset-choice]")];
  const groups = [...root.querySelectorAll("[data-fisheye-dataset-group]")];
  const remembered = new Map();
  let selectedDataset = "grandtour";

  function showScene(button, focus = false) {
    if (!button || button.dataset.fisheyeDataset !== selectedDataset) return;
    remembered.set(selectedDataset, button);
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

  function showDataset(name) {
    selectedDataset = name;
    datasets.forEach(button => button.setAttribute(
      "aria-pressed", String(button.dataset.fisheyeDatasetChoice === name)));
    groups.forEach(group => group.hidden = group.dataset.fisheyeDatasetGroup !== name);
    const candidates = buttons.filter(button => button.dataset.fisheyeDataset === name);
    showScene(remembered.get(name) ||
      candidates.find(button => button.dataset.fisheyeDefault === "true") || candidates[0]);
  }

  buttons.forEach(button => {
    button.addEventListener("click", () => showScene(button));
    button.addEventListener("keydown", event => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const visible = buttons.filter(other => other.dataset.fisheyeDataset === selectedDataset);
      const current = visible.indexOf(button);
      const next = event.key === "Home" ? 0 : event.key === "End" ? visible.length - 1 :
        (current + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) + visible.length) % visible.length;
      showScene(visible[next], true);
    });
  });
  datasets.forEach((button, index) => {
    button.addEventListener("click", () => showDataset(button.dataset.fisheyeDatasetChoice));
    button.addEventListener("keydown", event => {
      if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? datasets.length-1 :
        (index + (event.key === "ArrowDown" ? 1 : -1) + datasets.length) % datasets.length;
      showDataset(datasets[next].dataset.fisheyeDatasetChoice);
      datasets[next].focus({preventScroll: true});
    });
  });
  // GoFish-style pointer comparison is local to this fisheye section.
  // Touch and keyboard keep the native accessible range control.
  const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
  root.querySelectorAll(".world-frame").forEach(frame => {
    const range = frame.querySelector(".world-range");
    let pending = 0, position = 50;
    function update() {
      pending = 0;
      range.value = String(position);
      range.dispatchEvent(new Event("input", {bubbles: true}));
    }
    frame.addEventListener("pointermove", event => {
      if (!hover.matches || event.pointerType === "touch") return;
      const bounds = frame.getBoundingClientRect();
      position = Math.max(0, Math.min(100, (event.clientX-bounds.left)/bounds.width*100));
      if (!pending) pending = requestAnimationFrame(update);
    }, {passive: true});
    frame.addEventListener("pointerleave", () => {
      if (!hover.matches) return;
      if (pending) cancelAnimationFrame(pending);
      position = 50;
      update();
    }, {passive: true});
  });
  showDataset(selectedDataset);
})();
