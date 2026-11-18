/* Local figures only; native scrolling also supports touch and offline viewing. */
(() => {
  const root = document.querySelector("#memory-carousel");
  if (!root) return;
  const viewport = root.querySelector(".memory-viewport");
  const slides = [...root.querySelectorAll(".memory-slide")];
  const dots = [...root.querySelectorAll(".memory-dot")];
  const position = root.querySelector(".memory-position");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = 0;
  let scheduled = false;
  const offsets = () => slides.map(slide =>
    slide.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft);
  function mark(index) {
    active = index;
    slides.forEach((slide, i) => {
      slide.inert = i !== index;
      slide.setAttribute("aria-hidden", String(i !== index));
    });
    dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === index)));
    viewport.style.height = slides[index].offsetHeight + "px";
    position.textContent = `${index + 1} / ${slides.length}`;
  }
  function select(index) {
    index = (index + slides.length) % slides.length;
    mark(index);
    viewport.scrollTo({left: offsets()[index],
      behavior: reduced.matches ? "instant" : "smooth"});
  }
  dots.forEach((dot, index) => dot.addEventListener("click", () => select(index)));
  root.querySelector("[data-memory-previous]").addEventListener("click", () => select(active - 1));
  root.querySelector("[data-memory-next]").addEventListener("click", () => select(active + 1));
  root.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    select(event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1 :
      active + (event.key === "ArrowRight" ? 1 : -1));
  });
  viewport.addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const points = offsets();
      let closest = 0;
      points.forEach((x, i) => {
        if (Math.abs(x - viewport.scrollLeft) < Math.abs(points[closest] - viewport.scrollLeft))
          closest = i;
      });
      if (closest !== active) mark(closest);
    });
  }, {passive: true});
  let previousWidth = 0;
  const observer = new ResizeObserver(() => {
    viewport.style.height = slides[active].offsetHeight + "px";
    if (viewport.clientWidth !== previousWidth) {
      previousWidth = viewport.clientWidth;
      viewport.scrollLeft = offsets()[active];
    }
  });
  observer.observe(viewport);
  slides.forEach(slide => observer.observe(slide));
  mark(0);
})();
