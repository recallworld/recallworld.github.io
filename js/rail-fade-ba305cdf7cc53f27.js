/* Soft fade at the scroll edges of the scene rails: the bottom fades while more
   scenes lie below, the top while scenes have scrolled out above. */
(() => {
  "use strict";
  document.querySelectorAll(".fisheye-scene-group").forEach(list => {
    const update = () => {
      const max = list.scrollHeight - list.clientHeight;
      list.classList.toggle("fade-bottom", max > 1 && list.scrollTop < max - 1);
      list.classList.toggle("fade-top", list.scrollTop > 1);
    };
    list.addEventListener("scroll", update, {passive: true});
    new ResizeObserver(update).observe(list);
    update();
  });
})();
