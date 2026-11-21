(() => {
  "use strict";
  const cards = [...document.querySelectorAll(".world-card")].map(element => ({
    element, ours:element.querySelector(".world-ours"),
    baseline:element.querySelector(".world-baseline"),
    select:element.querySelector(".world-method-left"),
    referenceSelect:element.querySelector(".world-method-right"), epoch:0,
    ready:false, loading:false, restarting:false
  }));
  function active(card) {return !card.element.closest("[data-gallery-page]")?.hidden;}
  function releaseInactive(card) {
    pause(card);
    if (card.loading || card.restarting || !card.ready) return;
    card.epoch++;card.ready=false;
    for (const video of [card.ours,card.baseline]) {
      video.removeAttribute("src");video.load();
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
    if (document.hidden || !active(card) || !card.ready || card.restarting) return;
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
    const epoch = ++card.epoch;
    card.loading = true;card.ready = false;card.restarting = false;pause(card);
    const option = card.select.selectedOptions[0];
    const referenceOption = card.referenceSelect.selectedOptions[0];
    const error = card.element.querySelector(".world-status");
    error.hidden = true;
    card.baseline.src = option.dataset.video;
    card.baseline.poster = option.dataset.poster;
    label(card.element.querySelector(".baseline-label"), option);
    card.element.dataset.selectedMethod = option.value;
    card.element.dataset.referenceMethod = referenceOption.value;
    card.baseline.setAttribute("aria-label", option.textContent + ": " + card.element.querySelector("h3").textContent);
    card.ours.src = referenceOption.dataset.video;
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
    } finally {if (epoch === card.epoch) card.loading = false;
      if (!active(card)) releaseInactive(card);}
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
    // Stagger initial transfers while keeping every completed pair playing.
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
  document.addEventListener("visibilitychange", () => {refreshGallery();});
  initializeGallery();
  document.documentElement.dataset.worldsGallery = "ready";
})();
