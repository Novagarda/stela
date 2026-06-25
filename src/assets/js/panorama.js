const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  if (typeof video.fastSeek === "function") {
    video.fastSeek(time);
    return;
  }

  video.currentTime = time;
}

function initVideoScrub(root) {
  const viewport = root.querySelector("[data-video-scrub-viewport]") || root;
  const video = root.querySelector("video");
  const progress = root.querySelector("[data-video-scrub-progress]");
  const currentEl = root.querySelector("[data-video-scrub-current]");
  const durationEl = root.querySelector("[data-video-scrub-duration]");
  if (!video) return;

  let active = false;
  let targetTime = 0;
  let smoothTime = 0;
  let appliedTime = -1;
  let raf = 0;

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

  function scheduleTick() {
    if (!raf) {
      raf = window.requestAnimationFrame(tick);
    }
  }

  function commitSeek() {
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
    const duration = video.duration;
    if (!duration || !Number.isFinite(duration)) return;

    const rect = viewport.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const time = clamp(x * duration, 0, duration);

    if (Math.abs(time - targetTime) < 0.001) return;

    targetTime = time;
    scheduleTick();
  }

  function onPointerEnter(event) {
    active = true;
    viewport.classList.add("is-active");
    setTimeFromPointer(event.clientX);
  }

  function onPointerMove(event) {
    if (!active) return;
    setTimeFromPointer(event.clientX);
  }

  function onPointerDown(event) {
    if (event.button !== 0) return;

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

  viewport.addEventListener("pointerenter", onPointerEnter);
  viewport.addEventListener("pointermove", onPointerMove);
  viewport.addEventListener("pointerdown", onPointerDown);
  viewport.addEventListener("pointerup", onPointerUp);
  viewport.addEventListener("pointercancel", onPointerUp);
  viewport.addEventListener("pointerleave", onPointerLeave);

  video.addEventListener("seeked", () => {
    if (Math.abs(smoothTime - appliedTime) >= SEEK_EPSILON) {
      appliedTime = -1;
      commitSeek();
    }

    scheduleTick();
  });

  video.addEventListener("loadedmetadata", () => {
    targetTime = 0;
    smoothTime = 0;
    appliedTime = -1;
    video.pause();
    video.currentTime = 0;
    updateUI(0, video.duration);
  });
}

document.querySelectorAll("[data-video-scrub]").forEach(initVideoScrub);
