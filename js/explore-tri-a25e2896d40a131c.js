/* Explore the Worlds: one large three-way comparison. RecallWorld (top left), the
   selected baseline (bottom left) and ground truth (right) are separate videos drawn
   into one canvas. Playback follows the GOFish comparison: ground truth is the clock,
   the others are nudged gently back into step, every role paints from a cached last
   good frame while it loads or seeks, and nothing runs while the stage is off screen. */
(() => {
  "use strict";
  const root = document.querySelector("#gallery");
  const stage = root && root.querySelector(".explore-stage");
  if (!stage) return;
  const scenes = JSON.parse(root.querySelector("#explore-data").textContent);
  const AV1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
  const pick = url => (AV1 && url.endsWith(".mp4")) ? url.slice(0, -4) + ".av1.mp4" : url;
  const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const canvas = stage.querySelector("canvas"), context = canvas.getContext("2d");
  const ROLES = ["ours", "base", "gt"];
  const videos = {ours: stage.querySelector(".explore-ours"), base: stage.querySelector(".explore-base"), gt: stage.querySelector(".explore-gt")};
  const posters = {ours: new Image(), base: new Image(), gt: new Image()};
  const basePill = stage.querySelector(".explore-base-pill");
  const thumbs = [...root.querySelectorAll(".explore-choice")];
  const buttons = [...root.querySelectorAll(".explore-baseline")];
  const ready = {ours: false, base: false, gt: false}, wanted = {ours: "", base: "", gt: ""};
  const cache = {};
  ROLES.forEach(key => { const c = document.createElement("canvas"); cache[key] = {canvas: c, context: c.getContext("2d"), filled: false}; });
  let scene = 0, baseline = "sana", x = 50, y = 50, visible = false, pausedByUser = false;
  let frame = 0, raf = 0, lastSync = 0, drag = null, downAt = null;
  const shown = () => visible && !document.hidden;

  function size() {
    const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function remember(key) {
    const v = videos[key], c = cache[key];
    if (c.canvas.width !== v.videoWidth || c.canvas.height !== v.videoHeight) {
      c.canvas.width = v.videoWidth; c.canvas.height = v.videoHeight;
    }
    c.context.drawImage(v, 0, 0); c.filled = true;
  }
  // Each region shows the matching part of its own frame, scaled to cover the stage.
  function paint(key, dx, dy, dw, dh) {
    if (dw <= 0 || dh <= 0) return;
    const v = videos[key], p = posters[key];
    let src = null;
    if (ready[key] && v.readyState >= 2 && !v.seeking) { remember(key); src = cache[key].canvas; }
    else if (cache[key].filled) src = cache[key].canvas;
    else if (p.complete && p.naturalWidth) src = p;
    if (!src) { context.fillStyle = "#111"; context.fillRect(dx, dy, dw, dh); return; }
    const sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    const cw = canvas.width, ch = canvas.height, s = Math.max(cw / sw, ch / sh);
    const ox = (sw - cw / s) / 2, oy = (sh - ch / s) / 2;
    context.drawImage(src, ox + dx / s, oy + dy / s, dw / s, dh / s, dx, dy, dw, dh);
  }
  function draw() {
    const cw = canvas.width, ch = canvas.height, px = cw * x / 100, py = ch * y / 100;
    paint("ours", 0, 0, px, py);
    paint("base", 0, py, px, ch - py);
    paint("gt", px, 0, cw - px, ch);
  }
  function wrapped(a, b, d) {
    let dt = a - b;
    if (d) { dt %= d; if (dt > d / 2) dt -= d; if (dt < -d / 2) dt += d; }
    return dt;
  }
  // Every 400 ms: drift over 80 ms is absorbed with a 3% rate change; only a gap
  // over 0.3 s (a stall, or a clip that started late) seeks.
  function align(now) {
    if (now - lastSync < 400) return;
    lastSync = now;
    const gt = videos.gt;
    if (!ready.gt || gt.readyState < 2) return;
    gt.playbackRate = 1;
    for (const key of ["ours", "base"]) {
      const v = videos[key];
      if (!ready[key] || v.seeking || !v.duration) continue;
      const dt = wrapped(v.currentTime, gt.currentTime, Math.min(v.duration, gt.duration || v.duration));
      if (Math.abs(dt) > 0.3) { v.currentTime = Math.min(gt.currentTime, Math.max(0, v.duration - 0.04)); v.playbackRate = 1; }
      else v.playbackRate = dt > 0.08 ? 0.97 : dt < -0.08 ? 1.03 : 1;
    }
  }
  function loop(now) {
    raf = 0;
    if (!shown() || pausedByUser) return;
    align(now); draw();
    raf = requestAnimationFrame(loop);
  }
  // A newly loaded clip joins at the clock's current time before it is shown.
  function join(key) {
    const v = videos[key], gt = videos.gt;
    if (key === "gt" || !ready.gt || !isFinite(v.duration) || v.duration <= 0) { ready[key] = true; draw(); return; }
    const target = Math.min(gt.currentTime % v.duration, Math.max(0, v.duration - 0.04));
    if (Math.abs(v.currentTime - target) <= 0.04) { ready[key] = true; draw(); return; }
    v.addEventListener("seeked", () => { ready[key] = true; draw(); }, {once: true});
    v.currentTime = target;
  }
  function position(nx, ny) {
    x = Math.max(0, Math.min(100, nx)); y = Math.max(0, Math.min(100, ny));
    stage.style.setProperty("--split-x", x + "%");
    stage.style.setProperty("--split-y", y + "%");
    if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); });
  }
  function sources() {
    const s = scenes[scene];
    return {ours: s.ours, base: s.base[baseline], gt: s.gt};
  }
  function sync() {
    const src = sources();
    ROLES.forEach(key => {
      if (posters[key].getAttribute("src") !== src[key][1]) posters[key].src = src[key][1];
    });
    if (!shown() || pausedByUser) { ROLES.forEach(key => videos[key].pause()); draw(); return; }
    ROLES.forEach(key => {
      const url = pick(src[key][0]);
      if (wanted[key] !== url) {
        wanted[key] = url; ready[key] = false;
        videos[key].src = url; videos[key].load();
      }
      videos[key].play().catch(() => {});
    });
    if (!raf) raf = requestAnimationFrame(loop);
  }
  function selectBaseline(key) {
    baseline = key;
    buttons.forEach(b => b.setAttribute("aria-pressed", String(b.dataset.baseline === key)));
    basePill.textContent = buttons.find(b => b.dataset.baseline === key).textContent;
    sync();
  }
  function selectScene(index, focus = false) {
    if (index !== scene) ROLES.forEach(key => { cache[key].filled = false; });
    scene = index;
    thumbs.forEach((t, i) => t.setAttribute("aria-pressed", String(i === index)));
    const available = Object.keys(scenes[index].base);
    buttons.forEach(b => { b.hidden = !available.includes(b.dataset.baseline); });
    selectBaseline(available.includes(baseline) ? baseline : available[0]);
    if (focus) thumbs[index].focus({preventScroll: true});
  }

  ROLES.forEach(key => {
    const v = videos[key];
    v.muted = true; v.loop = true; v.playsInline = true;
    v.addEventListener("loadeddata", () => join(key));
    posters[key].addEventListener("load", draw);
  });
  thumbs.forEach((t, i) => {
    t.addEventListener("click", () => selectScene(i));
    t.addEventListener("keydown", event => {
      const step = {ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1}[event.key];
      const next = event.key === "Home" ? 0 : event.key === "End" ? thumbs.length - 1 :
        step ? (i + step + thumbs.length) % thumbs.length : -1;
      if (next < 0) return;
      event.preventDefault(); selectScene(next, true);
    });
  });
  buttons.forEach(b => b.addEventListener("click", () => selectBaseline(b.dataset.baseline)));

  new ResizeObserver(() => { size(); draw(); }).observe(canvas);
  const fromEvent = event => {
    const r = stage.getBoundingClientRect();
    position((event.clientX - r.left) / r.width * 100, (event.clientY - r.top) / r.height * 100);
  };
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
  stage.querySelector(".quad-handle").addEventListener("keydown", event => {
    const d = event.shiftKey ? 10 : 3, o = {ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d]}[event.key];
    if (o) { event.preventDefault(); position(x + o[0], y + o[1]); }
    else if (event.key === " ") { event.preventDefault(); pausedByUser = !pausedByUser; sync(); }
  });
  new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold: .05}).observe(stage);
  document.addEventListener("visibilitychange", sync);
  position(50, 50);
  selectScene(0);
})();
