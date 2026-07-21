export default class Lazy {
  loadLazyImages(image) {
    const getSiblings = (elem) => {
      const siblings = [];
      let sibling = elem.parentNode.firstChild;

      while (sibling) {
        if (sibling.nodeType === 1 && sibling !== elem) {
          siblings.push(sibling);
        }
        sibling = sibling.nextSibling;
      }

      return siblings;
    };

    const loadImage = (url) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(url);
        img.onerror = reject;
        img.src = url;
      });

    if (!image.classList.contains("loaded")) {
      const src = image.getAttribute("data-src");
      if (!src) return;

      loadImage(src).then(() => {
        image.setAttribute("src", src);
        image.classList.add("loaded");
        image.dispatchEvent(new CustomEvent("lazyloaded", { bubbles: true }));
      });
    }

    getSiblings(image).forEach((item) => {
      const srcset = item.getAttribute("data-srcset");
      if (srcset) {
        item.srcset = srcset;
        item.classList.add("loaded");
      }
    });
  }

  checkImagesViewport() {
    document.querySelectorAll(".lazy[data-src]").forEach((element) => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          this.loadLazyImages(element);
          observer.disconnect();
        }
      });

      observer.observe(element);
    });
  }

  init() {
    this.checkImagesViewport();
  }
}

function initLazy() {
  new Lazy().init();
}

if (document.readyState !== "loading") {
  initLazy();
} else {
  document.addEventListener("DOMContentLoaded", initLazy);
}
