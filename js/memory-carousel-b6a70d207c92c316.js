/* Two memory figures with side, keyboard and touch navigation. */
(() => {
  const root = document.querySelector("#memory-carousel");
  if (!root) return;
  const viewport = root.querySelector(".memory-viewport");
  const slides = [...root.querySelectorAll(".memory-slide")];
  const dots = [...root.querySelectorAll(".memory-dot")];
  let active = 0, touchStart = null;
  function align() {
    root.style.setProperty("--memory-artwork-height", slides[active].querySelector(".memory-artwork").offsetHeight + "px");
  }
  function select(index) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.hidden = i !== active;
      slide.inert = i !== active;
      slide.setAttribute("aria-hidden", String(i !== active));
    });
    dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === active)));
    viewport.scrollLeft = 0;
    align();
  }
  dots.forEach((dot, i) => dot.addEventListener("click", () => select(i)));
  root.querySelector("[data-memory-previous]").addEventListener("click", () => select(active - 1));
  root.querySelector("[data-memory-next]").addEventListener("click", () => select(active + 1));
  root.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    select(event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1 :
      active + (event.key === "ArrowRight" ? 1 : -1));
  });
  viewport.addEventListener("touchstart", event => {
    touchStart = event.touches.length === 1 ? {x: event.touches[0].clientX, y: event.touches[0].clientY} : null;
  }, {passive: true});
  viewport.addEventListener("touchend", event => {
    if (!touchStart || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) select(active + (dx < 0 ? 1 : -1));
  }, {passive: true});
  viewport.addEventListener("touchcancel", () => {touchStart = null;}, {passive: true});
  new ResizeObserver(align).observe(viewport);
  select(0);
})();
