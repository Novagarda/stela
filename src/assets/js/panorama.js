const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const NEEDS_UNLOCK = window.matchMedia("(hover: none)").matches;
const SMOOTHING = 0.28;
const SEEK_EPSILON = 0.025;
const STOP_EPSILON = 0.01;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatSeconds(value) {
  return value.toFixed(1);
}

function seekVideo(video, time) {
  video.currentTime = time;
}

function initVideoScrub(root) {
  const viewport = root.querySelector("[data-video-scrub-viewport]") || root;
  const video = root.querySelector("video");
  const canvas = root.querySelector("[data-video-scrub-canvas]");
  const unlockBtn = root.querySelector("[data-video-scrub-unlock]");
  const progress = root.querySelector("[data-video-scrub-progress]");
  const currentEl = root.querySelector("[data-video-scrub-current]");
  const durationEl = root.querySelector("[data-video-scrub-duration]");
  if (!video) return;

  const ctx = canvas?.getContext("2d");
  let unlocked = !NEEDS_UNLOCK;
  let active = false;
  let targetTime = 0;
  let smoothTime = 0;
  let appliedTime = -1;
  let raf = 0;
  let paintRaf = 0;

  function updateUI(time, total) {
    const progressValue = total > 0 ? (time / total) * 100 : 0;

    if (progress) {
      progress.style.width = `${progressValue}%`;
    }

    if (currentEl) {
      currentEl.textContent = formatSeconds(time);
    }

    if (durationEl) {
      durationEl.textContent = formatSeconds(total);
    }
  }

  function resizeCanvas() {
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = viewport.clientWidth;
    const height = viewport.clientHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function paintFrame() {
    if (!canvas || !ctx || !video.videoWidth) return;

    const width = viewport.clientWidth;
    const height = viewport.clientHeight;
    const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  }

  function schedulePaint() {
    if (!canvas || !unlocked) return;

    if (paintRaf) {
      window.cancelAnimationFrame(paintRaf);
    }

    paintRaf = window.requestAnimationFrame(() => {
      paintRaf = window.requestAnimationFrame(() => {
        paintRaf = 0;
        paintFrame();
      });
    });
  }

  function scheduleTick() {
    if (!raf) {
      raf = window.requestAnimationFrame(tick);
    }
  }

  function commitSeek() {
    if (!unlocked) return;

    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;
    if (video.seeking || Math.abs(smoothTime - appliedTime) < SEEK_EPSILON) return;

    appliedTime = smoothTime;
    video.pause();
    seekVideo(video, smoothTime);
  }

  function tick() {
    raf = 0;

    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;

    if (REDUCED_MOTION) {
      smoothTime = targetTime;
    } else {
      const delta = targetTime - smoothTime;

      if (Math.abs(delta) < STOP_EPSILON) {
        smoothTime = targetTime;
      } else {
        smoothTime += delta * SMOOTHING;
      }
    }

    updateUI(smoothTime, duration);

    if (!video.seeking) {
      commitSeek();
    }

    const stillAnimating = Math.abs(targetTime - smoothTime) >= STOP_EPSILON;
    const seekPending = Math.abs(smoothTime - appliedTime) >= SEEK_EPSILON;

    if (stillAnimating || seekPending || video.seeking) {
      scheduleTick();
    }
  }

  function setTimeFromPointer(clientX) {
    if (!unlocked) return;

    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;

    const rect = viewport.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const time = clamp(x * duration, 0, duration);

    if (Math.abs(time - targetTime) < 0.001) return;

    targetTime = time;
    scheduleTick();
  }

  async function unlock() {
    if (unlocked) return;

    unlocked = true;
    viewport.classList.add("is-unlocked");
    unlockBtn?.classList.add("is-hidden");
    unlockBtn?.setAttribute("aria-hidden", "true");

    video.muted = true;

    try {
      await video.play();
      video.pause();
    } catch {
      // El gesto del botón debería bastar; si falla, seguimos con seek.
    }

    seekVideo(video, targetTime || 0.001);
    schedulePaint();
  }

  function onPointerEnter(event) {
    if (!unlocked) return;

    active = true;
    viewport.classList.add("is-active");
    setTimeFromPointer(event.clientX);
  }

  function onPointerMove(event) {
    if (!active || !unlocked) return;
    setTimeFromPointer(event.clientX);
  }

  function onPointerDown(event) {
    if (!unlocked || event.button !== 0) return;

    active = true;
    viewport.classList.add("is-active");
    viewport.setPointerCapture(event.pointerId);
    setTimeFromPointer(event.clientX);
  }

  function onPointerUp(event) {
    if (viewport.hasPointerCapture(event.pointerId)) {
      viewport.releasePointerCapture(event.pointerId);
    }
  }

  function onPointerLeave() {
    active = false;
    viewport.classList.remove("is-active");
  }

  unlockBtn?.addEventListener("click", unlock);

  viewport.addEventListener("pointerenter", onPointerEnter);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  viewport.addEventListener("pointerleave", onPointerLeave);

  video.addEventListener("seeked", () => {
    schedulePaint();

    if (!unlocked) return;

    if (Math.abs(smoothTime - appliedTime) >= SEEK_EPSILON) {
      appliedTime = -1;
      commitSeek();
    }

    scheduleTick();
  });

  function onVideoReady() {
    targetTime = 0;
    smoothTime = 0;
    appliedTime = -1;
    resizeCanvas();
    updateUI(0, video.duration);

    if (!NEEDS_UNLOCK) {
      unlock();
    }
  }

  video.addEventListener("loadedmetadata", onVideoReady);

  if (video.readyState >= 1) {
    onVideoReady();
  }

  window.addEventListener("resize", () => {
    resizeCanvas();
    schedulePaint();
  });
}

document.querySelectorAll("[data-video-scrub]").forEach(initVideoScrub);
