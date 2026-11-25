(() => {
  "use strict";
  // Serve the AV1 sibling (<name>.av1.mp4) where the browser decodes AV1; H.264 otherwise.
  const AV1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
  const pick = url => (AV1 && url && url.endsWith(".mp4") && !url.endsWith(".av1.mp4")) ? url.slice(0, -4) + ".av1.mp4" : url;
  const stage = document.querySelector("#forest-comparison");
  if (!stage) return;
  const videos = [...stage.querySelectorAll("video")];
  // One packed 2x2 video drawn into the canvas: tiles are ordered top-left, top-right,
  // bottom-left, bottom-right, and each quadrant shows its method's pixels for that
  // region of the frame.
  const canvas = stage.querySelector(".quad-canvas");
  const context = canvas.getContext("2d");
  const source = videos[0];
  const poster = new Image();
  let drawFrame = 0;
  function sizeCanvas() {
    const rect = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }
  function draw() {
    const img = source.readyState >= 2 ? source : (poster.complete && poster.naturalWidth ? poster : null);
    if (!img) return;
    const sw = (img.videoWidth || img.naturalWidth) / 2, sh = (img.videoHeight || img.naturalHeight) / 2;
    const cw = canvas.width, ch = canvas.height, px = cw * x / 100, py = ch * y / 100;
    const regions = [[0, 0, px, py], [px, 0, cw - px, py], [0, py, px, ch - py], [px, py, cw - px, ch - py]];
    regions.forEach(([dx, dy, dw, dh], k) => {
      if (dw <= 0 || dh <= 0) return;
      const tx = (k % 2) * sw, ty = Math.floor(k / 2) * sh;
      context.drawImage(img, tx + sw * dx / cw, ty + sh * dy / ch, sw * dw / cw, sh * dh / ch, dx, dy, dw, dh);
    });
  }
  function requestDraw() {
    if (drawFrame) return;
    drawFrame = requestAnimationFrame(() => { drawFrame = 0; draw(); });
  }
  function drawLoop() {
    draw();
    if (!source.paused && !source.ended) {
      if (source.requestVideoFrameCallback) source.requestVideoFrameCallback(drawLoop);
      else requestAnimationFrame(drawLoop);
    }
  }
  source.addEventListener("play", drawLoop);
  source.addEventListener("seeked", requestDraw);
  source.addEventListener("loadeddata", requestDraw);
  poster.addEventListener("load", requestDraw);
  if (source.dataset.poster) poster.src = source.dataset.poster;
  new ResizeObserver(() => { sizeCanvas(); draw(); }).observe(canvas);
  const handle = stage.querySelector(".quad-handle");
  const toggle = document.querySelector("[data-quad-play]");
  const status = document.querySelector("#headline-status");
  let x = 50, y = 50, drag = null, visible = false, pausedByUser = false;
  let loaded = false, loading = false, aligning = false, epoch = 0, duration = 0;
  let pointerFrame = 0, latestPointer = null, resumeTime = 0, releaseTimer = 0;
  function clearPointer() {
    cancelAnimationFrame(pointerFrame); pointerFrame = 0; latestPointer = null;
  }
  function schedulePointer(event) {
    latestPointer = {clientX: event.clientX, clientY: event.clientY};
    if (pointerFrame) return;
    pointerFrame = requestAnimationFrame(() => {
      pointerFrame = 0; if (latestPointer) pointer(latestPointer);
    });
  }
  function position(nextX, nextY) {
    x = Math.max(0, Math.min(100, nextX));
    y = Math.max(0, Math.min(100, nextY));
    stage.style.setProperty("--split-x", x + "%");
    stage.style.setProperty("--split-y", y + "%");
    handle.setAttribute("aria-label", `Comparison divider: ${Math.round(x)}% across, ${Math.round(y)}% down. Use arrow keys to move.`);
    stage.dataset.splitX = String(x);
    stage.dataset.splitY = String(y);
    if (typeof requestDraw === "function") requestDraw();
  }
  function pointer(event) {
    const rect = stage.getBoundingClientRect();
    position((event.clientX - rect.left) / rect.width * 100,
             (event.clientY - rect.top) / rect.height * 100);
  }
  stage.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    // Touch users can scroll normally outside the center handle.
    if (event.pointerType !== "mouse" && !event.target.closest(".quad-handle")) return;
    event.preventDefault();
    drag = event.pointerId;
    stage.setPointerCapture(drag);
    stage.classList.add("is-dragging");
    pointer(event);
  });
  stage.addEventListener("pointermove", event => {
    if (event.pointerId === drag) { event.preventDefault(); schedulePointer(event); }
    else if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) schedulePointer(event);
  });
  stage.addEventListener("pointerleave", event => {
    if (event.pointerType === "mouse" && drag === null) { clearPointer(); position(50, 50); }
  });
  function release(event) {
    if (event.pointerId !== drag) return;

    clearPointer();
    drag = null;
    stage.classList.remove("is-dragging");
    const rect = stage.getBoundingClientRect();
    if (event.pointerType === "mouse" && (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom)) position(50, 50);
  }
  // Click (not drag) anywhere on the video toggles playback; the handle keeps its drag role.
  let downAt = null;
  stage.addEventListener("pointerdown", event => { downAt = {x: event.clientX, y: event.clientY}; }, true);
  stage.addEventListener("click", event => {
    if (event.target.closest(".quad-handle") || !downAt) return;
    if (Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) < 6) toggle.click();
    downAt = null;
  });
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  handle.addEventListener("keydown", event => {
    clearPointer();
    const delta = event.shiftKey ? 10 : 3;
    const offsets = {ArrowLeft: [-delta, 0], ArrowRight: [delta, 0],
      ArrowUp: [0, -delta], ArrowDown: [0, delta]};
    if (event.key === "Home") { event.preventDefault(); position(50, 50); }
    else if (offsets[event.key]) {
      event.preventDefault();
      position(x + offsets[event.key][0], y + offsets[event.key][1]);
    }
  });
  position(50, 50);
  function pause() { videos.forEach(video => video.pause()); }
  function releaseOffscreen() {
    clearTimeout(releaseTimer);
    if (visible || loading || aligning) return;
    if (loaded && Number.isFinite(videos[0].currentTime)) resumeTime = videos[0].currentTime;
    pause();
    loaded = false;
    ++epoch;
    videos.forEach(video => {
      video.removeAttribute("src");
      video.removeAttribute("poster");
      video.preload = "none";
      video.load();
    });
    stage.dataset.playback = "idle";
  }
  function scheduleRelease() {
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(releaseOffscreen, 150);
  }
  function canPlay() { return visible && !document.hidden && !pausedByUser; }
  function updateToggle() {
    toggle.textContent = pausedByUser ? "Play" : "Pause";
    toggle.setAttribute("aria-label", pausedByUser ? "Play all comparison videos" : "Pause all comparison videos");
  }
  function ready(video) {
    if (video.readyState >= 3) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error("Video load timeout")), 20000);
      function finish(error) {
        clearTimeout(timer);
        video.removeEventListener("canplay", ok);
        video.removeEventListener("error", fail);
        error ? reject(error) : resolve();
      }
      function ok() { finish(); }
      function fail() { finish(new Error("Video load failure")); }
      video.addEventListener("canplay", ok);
      video.addEventListener("error", fail);
    });
  }
  function seek(video, time) {
    if (Math.abs(video.currentTime - time) < .001 && !video.seeking) return Promise.resolve();
    return new Promise(resolve => {
      video.addEventListener("seeked", resolve, {once: true});
      video.currentTime = time;
    });
  }
  async function align(time) {
    if (!loaded || aligning) return;
    const ticket = ++epoch;
    aligning = true;
    stage.dataset.playback = "seeking";
    pause();
    try {
      await Promise.all(videos.map(video => seek(video, time)));
      if (ticket !== epoch) return;
      if (canPlay()) await Promise.all(videos.map(video => video.play()));
      stage.dataset.playback = canPlay() ? "playing" : "paused";
    } catch (_) {
      pause();
      stage.dataset.playback = "paused";
      toggle.textContent = "Play";
    } finally {
      if (ticket === epoch) aligning = false;
      if (!visible) scheduleRelease();
    }
  }
  async function initialize() {
    if (loading || loaded) return;
    loading = true;
    videos.forEach(video => {
      if (video.dataset.src) video.src = pick(video.dataset.src);
      video.preload = "auto";
      video.load();
    });
    stage.dataset.playback = "loading";
    try {
      await Promise.all(videos.map(ready));
      duration = Math.min(...videos.map(video => video.duration));
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid video duration");
      loaded = true;
      stage.dataset.duration = String(duration);
      status.hidden = true;
      await align(resumeTime < duration - .1 ? resumeTime : 0);
    } catch (_) {
      pause();
      status.hidden = false;
      stage.dataset.playback = "error";
    } finally { loading = false; if (!visible) scheduleRelease(); }
  }
  videos.forEach(video => {
    video.muted = true;
    video.loop = false;
    video.addEventListener("ended", () => align(0));
  });
  setInterval(() => {
    if (!loaded || aligning || !canPlay() || videos[0].paused) return;
    const master = videos[0].currentTime;
    if (master >= duration - .10) { align(0); return; }
    if (videos.some(video => Math.abs(video.currentTime - master) > .09)) align(master);
  }, 100);
  toggle.addEventListener("click", () => {
    pausedByUser = !pausedByUser;
    updateToggle();
    if (pausedByUser) { pause(); stage.dataset.playback = "paused"; }
    else align(videos[0].currentTime >= duration - .1 ? 0 : videos[0].currentTime);
  });
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    clearTimeout(releaseTimer);
    if (!visible) scheduleRelease();
    if (!visible || document.hidden || pausedByUser) pause();
    else if (loaded) align(videos[0].currentTime);
    else initialize();
  }, {threshold: .05}).observe(stage);
  document.addEventListener("visibilitychange", () => {
    if (canPlay()) {
      if (loaded) align(videos[0].currentTime);
      else initialize();
    } else pause();
  });
})();
