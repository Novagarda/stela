import Plyr from "plyr";

document.querySelectorAll("[data-plyr]").forEach((el) => {
  const player = new Plyr(el, {
    autoplay: true,
    muted: true,
    loop: { active: true },
    controls: ["play-large", "play", "progress", "mute", "fullscreen"],
    fullscreen: {
      iosNative: true,
    },
    youtube: {
      noCookie: true,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3,
      modestbranding: 1,
    },
  });

  let userPaused = false;
  let inViewport = true;

  player.on("pause", () => {
    if (inViewport) userPaused = true;
  });

  player.on("play", () => {
    userPaused = false;
  });

  if (!("IntersectionObserver" in window)) return;

  const target = el.closest(".video-wrap") || el;

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry) return;

      inViewport = entry.isIntersecting;

      if (!inViewport) {
        player.pause();
        return;
      }

      if (!userPaused) player.play();
    },
    { threshold: 0.25 },
  );

  observer.observe(target);
});
