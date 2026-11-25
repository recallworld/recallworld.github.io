(() => {
  "use strict";
  // Serve the AV1 sibling (<name>.av1.mp4) where the browser decodes AV1; H.264 otherwise.
  const AV1 = document.createElement("video").canPlayType('video/mp4; codecs="av01.0.05M.08"') === "probably";
  const pick = url => (AV1 && url && url.endsWith(".mp4") && !url.endsWith(".av1.mp4")) ? url.slice(0, -4) + ".av1.mp4" : url;
  const cards = [...document.querySelectorAll(".world-card")].map(element => ({
    element, ours:element.querySelector(".world-ours"),
    baseline:element.querySelector(".world-baseline"),
    select:element.querySelector(".world-method-left"),
    referenceSelect:element.querySelector(".world-method-right"), epoch:0,
    ready:false, loading:false, restarting:false, reload:false, userPaused:false
  }));
  const visibleCards = new WeakSet();
  function active(card) {
    return visibleCards.has(card.element) && !document.hidden &&
      !card.element.closest("[data-gallery-page]")?.hidden;
  }
  function releaseInactive(card) {
    pause(card);
    if (card.loading || card.restarting || !card.ours.hasAttribute("src")) return;
    card.epoch++;card.ready=false;
    for (const video of [card.ours,card.baseline]) {
      video.removeAttribute("src");video.removeAttribute("poster");video.load();
    }
  }
  function pause(card) {card.ours.pause();card.baseline.pause();}
  function ready(video) {
    if (video.readyState >= 3) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {cleanup();reject(new Error("Video load timeout"));}, 20000);
      function cleanup() {
        clearTimeout(timer);video.removeEventListener("canplay", ok);video.removeEventListener("error", fail);
      }
      function ok() {cleanup();resolve();}
      function fail() {cleanup();reject(new Error("Video could not load"));}
      video.addEventListener("canplay", ok);
      video.addEventListener("error", fail);
    });
  }
  function seek(video, time) {
    if (Math.abs(video.currentTime-time) < .001 && !video.seeking) return Promise.resolve();
    return new Promise(resolve => {
      video.addEventListener("seeked", resolve, {once:true});
      video.currentTime = time;
    });
  }
  async function start(card, reset = false) {
    if (document.hidden || !active(card) || !card.ready || card.restarting || card.userPaused) return;
    const epoch = card.epoch;
    card.restarting = true;
    pause(card);
    try {
      const time = reset ? 0 : Math.min(card.ours.currentTime,
        Math.max(0,card.ours.duration-.1));
      await Promise.all([seek(card.ours,time),seek(card.baseline,time)]);
      if (document.hidden || !active(card) || epoch !== card.epoch) return;
      await Promise.all([card.ours.play(),card.baseline.play()]);
    } catch (error) {
      if (epoch === card.epoch) pause(card);
    } finally {
      if (epoch === card.epoch) card.restarting = false;
      if (!active(card)) releaseInactive(card);
    }
  }
  function label(element, option) {
    element.textContent = option.dataset.model || option.textContent;
    if (option.dataset.detail) {
      const detail = document.createElement("small");
      detail.className = "world-label-detail";
      detail.textContent = "(" + option.dataset.detail + ")";
      element.append(detail);
    }
  }
  async function load(card) {
    if (!active(card)) return;
    if (card.loading) { card.reload = true; return; }
    card.reload = false;
    const epoch = ++card.epoch;
    card.loading = true;card.ready = false;card.restarting = false;pause(card);
    const option = card.select.selectedOptions[0];
    const referenceOption = card.referenceSelect.selectedOptions[0];
    const error = card.element.querySelector(".world-status");
    error.hidden = true;
    card.baseline.src = pick(option.dataset.video);
    card.baseline.poster = option.dataset.poster;
    label(card.element.querySelector(".baseline-label"), option);
    card.element.dataset.selectedMethod = option.value;
    card.element.dataset.referenceMethod = referenceOption.value;
    card.baseline.setAttribute("aria-label", option.textContent + ": " + card.element.querySelector("h3").textContent);
    card.ours.src = pick(referenceOption.dataset.video);
    card.ours.poster = referenceOption.dataset.poster;
    label(card.element.querySelector(".ours-label"), referenceOption);
    card.ours.setAttribute("aria-label", referenceOption.textContent + ": " + card.element.querySelector("h3").textContent);
    card.ours.load();card.baseline.load();
    try {
      await Promise.all([ready(card.ours),ready(card.baseline)]);
      if (epoch !== card.epoch) return;
      if (Math.abs(card.ours.duration-card.baseline.duration) > .07)
        throw new Error("Unequal clip durations");
      await Promise.all([seek(card.ours,0),seek(card.baseline,0)]);
      if (epoch !== card.epoch) return;
      card.ready = true;
      await start(card);
    } catch (e) {
      if (epoch === card.epoch) {error.hidden = false;pause(card);}
    } finally {
      if (epoch === card.epoch) card.loading = false;
      if (!active(card)) releaseInactive(card);
      else if (card.reload) load(card);
    }
  }
  function refreshGallery() {
    for (const card of cards) {
      if (!active(card)) releaseInactive(card);
      else if (document.hidden) pause(card);
      else if (card.ready && card.ours.paused) start(card);
    }
  }
  let initializingGallery = false, galleryLoadPending = false;
  async function initializeGallery() {
    if (initializingGallery) {galleryLoadPending = true; return;}
    initializingGallery = true;
    try {
    // Stagger transfers only for comparison panels currently in view.
    for (let index = 0; index < cards.length; index += 2) {
      await Promise.all(cards.slice(index, index+2)
        .filter(card => active(card) && !card.ready && !card.loading).map(load));
    }
    } finally {
      initializingGallery = false;
      if (galleryLoadPending) {
        galleryLoadPending = false;
        initializeGallery();
      }
    }
  }
  for (const card of cards) {
    for (const video of [card.ours,card.baseline]) {
      video.muted = true;video.loop = false;
      video.addEventListener("ended", () => start(card,true));
    }
    const frame = card.element.querySelector(".world-frame");
    const range = card.element.querySelector(".world-range");
    function divider() {
      frame.style.setProperty("--split",range.value+"%");
      range.setAttribute("aria-valuetext",`${range.value} percent ${card.select.selectedOptions[0].textContent}, ${100-Number(range.value)} percent ${card.referenceSelect.selectedOptions[0].textContent}`);
    }
    range.addEventListener("input",divider);
    // Click (not drag) on a comparison toggles playback for that card.
    let downAt = null;
    frame.addEventListener("pointerdown", event => { downAt = {x: event.clientX, y: event.clientY}; }, true);
    frame.addEventListener("click", event => {
      if (!downAt || Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y) >= 6) return;
      downAt = null;
      card.userPaused = !card.userPaused;
      if (card.userPaused) pause(card); else start(card);
    });
    // With a mouse, the divider follows the pointer (as in the teaser above) and
    // recenters when the pointer leaves; touch and keyboard keep the range input.
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
    let follow = 0;
    frame.addEventListener("pointermove", event => {
      if (event.pointerType !== "mouse" || !hover.matches || follow) return;
      follow = requestAnimationFrame(() => {
        follow = 0;
        const rect = frame.getBoundingClientRect();
        range.value = Math.round(Math.min(100, Math.max(0, (event.clientX - rect.left) / rect.width * 100)));
        divider();
      });
    });
    frame.addEventListener("pointerleave", event => {
      if (event.pointerType !== "mouse" || !hover.matches) return;
      cancelAnimationFrame(follow); follow = 0;
      range.value = range.defaultValue; divider();
    });
    card.select.addEventListener("change", () => {divider();load(card);});
    card.referenceSelect.addEventListener("change", () => {divider();load(card);});
    divider();
  }
  setInterval(() => {
    for (const card of cards) {
      if (!card.ready || card.restarting || card.ours.paused ||
          card.ours.seeking || card.baseline.seeking) continue;
      if (Math.abs(card.ours.currentTime-card.baseline.currentTime) > .09)
        card.baseline.currentTime = Math.min(card.ours.currentTime,card.baseline.duration-.01);
    }
  }, 250);
  document.addEventListener("gallerypagechange", () => {refreshGallery();initializeGallery();});
  document.addEventListener("visibilitychange", () => {refreshGallery();initializeGallery();});
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const card = entry.target.closest(".world-card");
        if (entry.isIntersecting && entry.intersectionRatio >= .05) visibleCards.add(card);
        else visibleCards.delete(card);
      }
      refreshGallery();
      initializeGallery();
    }, {threshold: .05});
    cards.forEach(card => observer.observe(card.element.querySelector(".world-frame")));
  } else {
    cards.forEach(card => visibleCards.add(card.element));
    initializeGallery();
  }
  document.documentElement.dataset.worldsGallery = "ready";
})();
