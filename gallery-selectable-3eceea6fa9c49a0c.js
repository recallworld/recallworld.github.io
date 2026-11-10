(() => {
  "use strict";
  const headline = document.querySelector("#headline-video");
  const selector = document.querySelector("#source-selector");
  const track = selector.querySelector(".source-carousel");
  const slides = [...track.querySelectorAll(".source-slide")];
  const dots = [...selector.querySelectorAll("[data-source-dot]")];
  const choices = [...document.querySelectorAll(".headline-candidates button")];
  const status = document.querySelector("#headline-status");
  let selected = 0, headlineVisible = false, headlineEpoch = 0, scrollTimer;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

  const metricData = JSON.parse(document.querySelector("#headline-metric-data").textContent);
  const metricPanel = document.querySelector("#headline-metrics");
  let metricCandidate = choices.find(c => c.getAttribute("aria-pressed") === "true")?.dataset.candidate;
  function updateHeadlineMetrics(time) {
    const record = metricData[metricCandidate];
    if (!record) {metricPanel.hidden = true; return;}
    const frame = Math.min(record.frames-1, Math.floor(Math.max(0,time)*record.fps+1e-5));
    const stage = record.stages.find(s => frame >= s.native_frames[0] && frame <= s.wipe_frames[1]);
    const method = stage && (frame > stage.native_frames[1] ? stage.following : stage.method);
    const values = record.metrics[method];
    metricPanel.hidden = !values;
    metricPanel.dataset.method = method || "";
    const brandLabel = document.getElementById("recallworld-video-label");
    if (brandLabel) brandLabel.hidden = method !== "navworld";
    if (values) {
      metricPanel.querySelector("[data-metric=lpips]").textContent = values.lpips.toFixed(3)+" LPIPS ↓";
    }
  }
  if ("requestVideoFrameCallback" in headline) {
    const present = (_, metadata) => {
      updateHeadlineMetrics(metadata.mediaTime);
      headline.requestVideoFrameCallback(present);
    };
    headline.requestVideoFrameCallback(present);
  } else {
    headline.addEventListener("timeupdate", () => updateHeadlineMetrics(headline.currentTime));
  }
  updateHeadlineMetrics(0);

  function playHeadline() {
    if (headlineVisible && !document.hidden) headline.play().catch(() => {});
    else headline.pause();
  }
  function chooseClip(choice) {
    const epoch = ++headlineEpoch;
    headline.pause();
    metricCandidate = choice.dataset.candidate;
    updateHeadlineMetrics(0);
    choices.forEach(b => b.setAttribute("aria-pressed", String(b === choice)));
    status.hidden = true;
    headline.poster = choice.dataset.poster;
    headline.querySelector("source").src = choice.dataset.video;
    headline.addEventListener("canplay", () => {
      if (epoch === headlineEpoch) playHeadline();
    }, {once:true});
    headline.load();
  }
  function showScene(index, scroll = true) {
    selected = (index + slides.length) % slides.length;
    const scene = slides[selected].dataset.scene;
    selector.dataset.selectedScene = scene;
    slides.forEach((slide, i) =>
      slide.querySelector("button").setAttribute("aria-pressed", String(i === selected)));
    dots.forEach((dot, i) => dot.setAttribute("aria-pressed", String(i === selected)));
    const active = choices.find(c => c.getAttribute("aria-pressed") === "true");
    if (active?.dataset.sceneId !== scene) {
      const choice = choices.find(c => c.dataset.sceneId === scene);
      chooseClip(choice);
    }
    if (scroll) track.scrollTo({
      left: slides[selected].offsetLeft-slides[0].offsetLeft,
      behavior: reducedMotion.matches ? "instant" : "smooth"
    });
  }
  slides.forEach((slide, i) => slide.querySelector("button").addEventListener("click", () => showScene(i)));
  dots.forEach((dot, i) => dot.addEventListener("click", () => showScene(i)));
  selector.querySelector("[data-source-previous]").addEventListener("click", () => showScene(selected-1));
  selector.querySelector("[data-source-next]").addEventListener("click", () => showScene(selected+1));
  selector.addEventListener("keydown", event => {
    if (!["ArrowLeft","ArrowRight","Home","End"].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === "Home" ? 0 : event.key === "End" ? slides.length-1 :
      selected+(event.key === "ArrowRight" ? 1 : -1);
    showScene(target);
    dots[selected].focus({preventScroll:true});
  });
  let drag = null, suppressClick = false;
  track.addEventListener("pointerdown", event => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    drag = {x:event.clientX, left:track.scrollLeft, moved:false};
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener("pointermove", event => {
    if (!drag) return;
    const movement = event.clientX-drag.x;
    if (Math.abs(movement) > 5) drag.moved = true;
    if (drag.moved) {
      track.style.scrollSnapType = "none";
      track.scrollLeft = drag.left-movement;
      event.preventDefault();
    }
  });
  function endDrag() {
    if (!drag) return;
    suppressClick = drag.moved;
    track.style.scrollSnapType = "";
    drag = null;
    setTimeout(() => {suppressClick = false;}, 0);
  }
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("click", event => {
    if (suppressClick) {event.preventDefault();event.stopPropagation();}
  }, true);
  track.addEventListener("scroll", () => {
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      const i = slides.reduce((best, slide, n) =>
        Math.abs(slide.offsetLeft-slides[0].offsetLeft-track.scrollLeft) <
        Math.abs(slides[best].offsetLeft-slides[0].offsetLeft-track.scrollLeft) ? n : best, 0);
      showScene(i, false);
    }, 160);
  }, {passive:true});
  choices.forEach(choice => choice.addEventListener("click", () => chooseClip(choice)));
  headline.muted = true;
  headline.loop = true;
  headline.addEventListener("error", () => {status.hidden = false;});
  new IntersectionObserver(entries => {
    headlineVisible = entries[0].isIntersecting;
    playHeadline();
  }, {threshold:.05}).observe(headline);
  showScene(0, false);

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
  document.addEventListener("visibilitychange", () => {playHeadline();refreshGallery();});
  initializeGallery();
  document.documentElement.dataset.sourceCarousel = "ready";
  document.documentElement.dataset.worldsGallery = "ready";
})();
