/* Three-way fisheye comparisons (GOFish layout): one packed video per scene holding
   RecallWorld | SANA-WM | ground truth side by side, drawn into a canvas with
   RecallWorld top-left, SANA-WM bottom-left and ground truth on the right. The
   vertical divider follows the pointer across; the horizontal one splits the left side. */
(() => {
  "use strict";
  const AV1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
  const pick = url => (AV1 && url.endsWith(".mp4")) ? url.slice(0, -4) + ".av1.mp4" : url;
  const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
  document.querySelectorAll("#native-fisheye-gallery .tri-stage").forEach(stage => {
    const video = stage.querySelector("video");
    const canvas = stage.querySelector("canvas");
    const context = canvas.getContext("2d");
    const poster = new Image();
    let x = 50, y = 50, loaded = false, visible = false, pausedByUser = false, frame = 0, drag = null, downAt = null;
    const panel = () => stage.closest("[aria-hidden]");
    const shown = () => visible && !document.hidden && !(panel() && panel().hidden);
    function size() {
      const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    function draw() {
      const src = video.readyState >= 2 ? video : (poster.complete && poster.naturalWidth ? poster : null);
      if (!src) return;
      const pw = (src.videoWidth || src.naturalWidth) / 3, ph = src.videoHeight || src.naturalHeight;
      const cw = canvas.width, ch = canvas.height, px = cw * x / 100, py = ch * y / 100;
      [[0, 0, 0, px, py], [1, 0, py, px, ch - py], [2, px, 0, cw - px, ch]].forEach(([k, dx, dy, dw, dh]) => {
        if (dw <= 0 || dh <= 0) return;
        context.drawImage(src, k * pw + pw * dx / cw, ph * dy / ch, pw * dw / cw, ph * dh / ch, dx, dy, dw, dh);
      });
    }
    function loop() {
      draw();
      if (!video.paused && !video.ended) {
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(loop); else requestAnimationFrame(loop);
      }
    }
    function position(nx, ny) {
      x = Math.max(0, Math.min(100, nx)); y = Math.max(0, Math.min(100, ny));
      stage.style.setProperty("--split-x", x + "%");
      stage.style.setProperty("--split-y", y + "%");
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
    }
    function fromEvent(event) {
      const r = stage.getBoundingClientRect();
      position((event.clientX - r.left) / r.width * 100, (event.clientY - r.top) / r.height * 100);
    }
    function sync() {
      if (shown() && !pausedByUser) {
        if (!loaded) { loaded = true; video.src = pick(stage.dataset.src); video.load(); }
        video.play().catch(() => {});
      } else video.pause();
    }
    video.muted = true; video.loop = true; video.playsInline = true;
    video.addEventListener("play", loop);
    video.addEventListener("loadeddata", draw);
    video.addEventListener("seeked", draw);
    poster.addEventListener("load", draw);
    poster.src = stage.dataset.poster;
    new ResizeObserver(() => { size(); draw(); }).observe(canvas);
    stage.addEventListener("pointermove", event => {
      if (event.pointerId === drag || (event.pointerType === "mouse" && hover.matches)) fromEvent(event);
    });
    stage.addEventListener("pointerleave", event => { if (event.pointerType === "mouse" && drag === null) position(50, 50); });
    stage.addEventListener("pointerdown", event => {
      downAt = {x: event.clientX, y: event.clientY};
      if (event.target.closest(".quad-handle")) { drag = event.pointerId; stage.setPointerCapture(drag); event.preventDefault(); }
    });
    const release = event => { if (event.pointerId === drag) drag = null; };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);
    stage.addEventListener("click", event => {
      if (event.target.closest(".quad-handle") || !downAt) return;
      if (Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) < 6) { pausedByUser = !pausedByUser; sync(); }
      downAt = null;
    });
    const handle = stage.querySelector(".quad-handle");
    handle.addEventListener("keydown", event => {
      const d = event.shiftKey ? 10 : 3, o = {ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d]}[event.key];
      if (o) { event.preventDefault(); position(x + o[0], y + o[1]); }
      else if (event.key === " ") { event.preventDefault(); pausedByUser = !pausedByUser; sync(); }
    });
    new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold: .05}).observe(stage);
    document.addEventListener("visibilitychange", sync);
    document.addEventListener("gallerypagechange", sync);
    position(50, 50);
  });
})();
