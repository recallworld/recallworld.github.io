/* Click/tap to enable zoom; pointer movement pans only after activation. */
(() => {
  "use strict";
  const image = document.querySelector("#figure-5 .method-figure > img");
  if (!image) return;
  const stage = document.createElement("div");
  stage.className = "revisit-magnifier";
  stage.tabIndex = 0;
  stage.setAttribute("role", "button");
  stage.setAttribute("aria-label", "Click or tap to magnify revisit comparisons; Enter toggles zoom and Escape closes it");
  stage.setAttribute("aria-pressed", "false");
  image.before(stage);
  stage.append(image);
  let pinned = false;

  function position(event) {
    const box = stage.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const x = Math.max(0, Math.min(100, (event.clientX - box.left) / box.width * 100));
    const y = Math.max(0, Math.min(100, (event.clientY - box.top) / box.height * 100));
    stage.style.setProperty("--revisit-zoom-x", `${x}%`);
    stage.style.setProperty("--revisit-zoom-y", `${y}%`);
  }
  function zoom(on) {
    stage.classList.toggle("is-zoomed", on);
    stage.setAttribute("aria-pressed", String(on));
  }
  stage.addEventListener("pointermove", event => {
    if (stage.classList.contains("is-zoomed")) position(event);
  });
  stage.addEventListener("pointerleave", () => { if (!pinned) zoom(false); });
  stage.addEventListener("click", event => {
    pinned = !pinned;
    position(event);
    zoom(pinned);
  });
  stage.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      pinned = !pinned;
      zoom(pinned);
    } else if (event.key === "Escape") {
      pinned = false;
      zoom(false);
    } else if (stage.classList.contains("is-zoomed") &&
               ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      const axis = event.key === "ArrowLeft" || event.key === "ArrowRight" ? "x" : "y";
      const current = parseFloat(stage.style.getPropertyValue(`--revisit-zoom-${axis}`)) || 50;
      const delta = event.key === "ArrowLeft" || event.key === "ArrowUp" ? -10 : 10;
      stage.style.setProperty(`--revisit-zoom-${axis}`, `${Math.max(0, Math.min(100, current + delta))}%`);
    }
  });
  stage.addEventListener("blur", () => { pinned = false; zoom(false); });
})();
