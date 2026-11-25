(() => {
  "use strict";
  const root = document.querySelector("#gallery");
  if (!root) return;
  const pages = [...root.querySelectorAll("[data-gallery-page]")];
  const dots = [...root.querySelectorAll("[data-gallery-dot]")];
  const nav = root.querySelector(".worlds-navigation");
  let selected = 0, pointer = null, suppressClick = false;
  function show(index) {
    const previous = selected;
    selected = (index + pages.length) % pages.length;
    // Direction for the slide-in animation (CSS); none on the first render.
    root.dataset.galleryDir = index > previous ? "next" : "prev";
    pages.forEach((page, i) => {
      page.hidden = i !== selected;
      page.setAttribute("aria-hidden", String(i !== selected));
    });
    dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === selected)));
    root.dataset.gallerySet = String(selected);
    root.dispatchEvent(new CustomEvent("gallerypagechange", {bubbles: true}));
  }
  dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));
  nav.querySelector("[data-gallery-previous]").addEventListener("click", () => show(selected - 1));
  nav.querySelector("[data-gallery-next]").addEventListener("click", () => show(selected + 1));
  nav.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    show(event.key === "Home" ? 0 : event.key === "End" ? pages.length - 1 :
      selected + (event.key === "ArrowRight" ? 1 : -1));
    dots[selected].focus({preventScroll: true});
  });
  nav.addEventListener("pointerdown", event => {
    suppressClick = false;
    pointer = {x: event.clientX, y: event.clientY};
  });
  nav.addEventListener("pointerup", event => {
    if (!pointer) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    pointer = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
      suppressClick = true;
      show(selected + (dx < 0 ? 1 : -1));
    }
  });
  nav.addEventListener("click", event => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  nav.addEventListener("pointercancel", () => {pointer = null;});
  show(0);
  root.dataset.galleryAnimate = "true";
  document.documentElement.dataset.worldsGallerySets = String(pages.length);
})();
