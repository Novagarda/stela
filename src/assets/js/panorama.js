const NEEDS_UNLOCK = window.matchMedia("(hover: none)").matches;

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
  const progressDot = root.querySelector("[data-video-scrub-progress-dot]");
  const currentEl = root.querySelector("[data-video-scrub-current]");
  const durationEl = root.querySelector("[data-video-scrub-duration]");
  if (!video) return;

  const ctx = canvas?.getContext("2d");
  let unlocked = !NEEDS_UNLOCK;
  let active = false;
  let targetTime = 0;
  let appliedTime = -1;

  function updateUI(time, total) {
    const progressValue = total > 0 ? (time / total) * 100 : 0;

    if (progress) {
      progress.style.width = `${progressValue}%`;
    }

    if (progressDot) {
      progressDot.style.left = `${progressValue}%`;
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
    const scale = Math.min(width / video.videoWidth, height / video.videoHeight);
    const drawWidth = video.videoWidth * scale;
    const drawHeight = video.videoHeight * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  }

  function commitSeek() {
    if (!unlocked) return;

    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;
    if (video.seeking || targetTime === appliedTime) return;

    appliedTime = targetTime;
    video.pause();
    seekVideo(video, targetTime);
  }

  function setTimeFromPointer(clientX) {
    if (!unlocked) return;

    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;

    const rect = viewport.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const time = clamp(x * duration, 0, duration);

    if (time === targetTime) return;

    targetTime = time;
    updateUI(targetTime, duration);
    commitSeek();
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
    paintFrame();
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
    paintFrame();

    if (!unlocked) return;

    if (targetTime !== appliedTime) {
      appliedTime = -1;
      commitSeek();
    }
  });

  function onVideoReady() {
    targetTime = 0;
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
    paintFrame();
  });
}

document.querySelectorAll("[data-video-scrub]").forEach(initVideoScrub);
