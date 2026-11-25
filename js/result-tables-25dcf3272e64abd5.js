/* Native scrolling, tab buttons, touch swipes and keyboard navigation; no library. */
(() => {
  const root = document.querySelector("#results-carousel");
  if (!root) return;
  const viewport = root.querySelector(".results-viewport");
  const slides = [...root.querySelectorAll(".result-slide")];
  const tabs = [...root.querySelectorAll(".result-tab")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let active = 0;
  let scheduled = false;
  const offsets = () => slides.map(n =>
    n.getBoundingClientRect().left - viewport.getBoundingClientRect().left + viewport.scrollLeft);

  function mark(index) {
    active = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    slides.forEach((slide, i) => {
      slide.inert = i !== index;
      slide.setAttribute("aria-hidden", String(i !== index));
    });
    viewport.style.height = slides[index].offsetHeight + "px";
  }

  function select(index, focus = false) {
    index = (index + slides.length) % slides.length;
    mark(index);
    viewport.scrollTo({left: offsets()[index],
      behavior: reduced.matches ? "instant" : "smooth"});
    if (focus) tabs[index].focus({preventScroll: true});
  }

  tabs.forEach((tab, i) => tab.addEventListener("click", () => select(i)));
  root.addEventListener("keydown", event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    // A wide table retains its own horizontal scrolling.
    if (event.target.closest(".result-table-scroll")) return;
    event.preventDefault();
    const index = event.key === "Home" ? 0 : event.key === "End" ? slides.length - 1 :
      active + (event.key === "ArrowRight" ? 1 : -1);
    select(index, true);
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
  const resize = new ResizeObserver(() => {
    viewport.style.height = slides[active].offsetHeight + "px";
    if (viewport.clientWidth !== previousWidth) {
      previousWidth = viewport.clientWidth;
      viewport.scrollLeft = offsets()[active];
    }
  });
  resize.observe(viewport);
  slides.forEach(slide => resize.observe(slide));
  mark(0);
})();
