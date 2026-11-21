(() => {
  "use strict";
  const stage = document.querySelector("#forest-comparison");
  if (!stage) return;
  const videos = [...stage.querySelectorAll("video")];
  const handle = stage.querySelector(".quad-handle");
  const toggle = document.querySelector("[data-quad-play]");
  const status = document.querySelector("#headline-status");
  let x = 50, y = 50, drag = null, visible = false, pausedByUser = false;
  let loaded = false, aligning = false, epoch = 0, duration = 0;
  function position(nextX, nextY) {
    x = Math.max(0, Math.min(100, nextX));
    y = Math.max(0, Math.min(100, nextY));
    stage.style.setProperty("--split-x", x + "%");
    stage.style.setProperty("--split-y", y + "%");
    handle.setAttribute("aria-label", `Comparison divider: ${Math.round(x)}% across, ${Math.round(y)}% down. Use arrow keys to move.`);
    stage.dataset.splitX = String(x);
    stage.dataset.splitY = String(y);
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
    if (event.pointerId === drag) { event.preventDefault(); pointer(event); }
  });
  function release(event) {
    if (event.pointerId !== drag) return;
    drag = null;
    stage.classList.remove("is-dragging");
  }
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  handle.addEventListener("keydown", event => {
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
    }
  }
  async function initialize() {
    stage.dataset.playback = "loading";
    try {
      await Promise.all(videos.map(ready));
      duration = Math.min(...videos.map(video => video.duration));
      if (!Number.isFinite(duration) || duration <= 0) throw new Error("Invalid video duration");
      loaded = true;
      stage.dataset.duration = String(duration);
      status.hidden = true;
      await align(0);
    } catch (_) {
      pause();
      status.hidden = false;
      stage.dataset.playback = "error";
    }
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
    if (!visible || document.hidden || pausedByUser) pause();
    else if (loaded) align(videos[0].currentTime);
  }, {threshold: .05}).observe(stage);
  document.addEventListener("visibilitychange", () => {
    if (canPlay()) align(videos[0].currentTime);
    else pause();
  });
  initialize();
})();
