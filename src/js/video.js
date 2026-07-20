import Plyr from "plyr";

document.querySelectorAll("[data-plyr]").forEach((el) => {
  new Plyr(el, {
    autoplay: true,
    muted: true,
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
});
