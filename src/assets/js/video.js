const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function initViewportVideo(wrap) {
  const video = wrap.querySelector("video");
  if (!video || REDUCED_MOTION) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    },
    { threshold: 0.25 }
  );

  observer.observe(wrap);
}

document.querySelectorAll("[data-video-viewport]").forEach(initViewportVideo);
