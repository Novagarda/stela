// src/js/lazy.js
var Lazy = class {
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
    const loadImage = (url) => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(url);
      img.onerror = reject;
      img.src = url;
    });
    const revealImage = (image2, src) => {
      let revealed = false;
      const finish = () => {
        if (revealed) return;
        revealed = true;
        requestAnimationFrame(() => {
          image2.classList.add("loaded");
          image2.removeAttribute("data-src");
          image2.dispatchEvent(new CustomEvent("lazyloaded", { bubbles: true }));
        });
      };
      const decode = () => {
        if (typeof image2.decode === "function") {
          image2.decode().then(finish).catch(finish);
          return;
        }
        finish();
      };
      if (image2.getAttribute("src") === src && image2.complete) {
        decode();
        return;
      }
      image2.addEventListener("load", decode, { once: true });
      image2.addEventListener("error", finish, { once: true });
      image2.setAttribute("src", src);
      if (image2.complete) {
        decode();
      }
    };
    if (!image.classList.contains("loaded")) {
      const src = image.getAttribute("data-src");
      if (!src) return;
      loadImage(src).then(() => revealImage(image, src));
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
};
function initLazy() {
  new Lazy().init();
}
if (document.readyState !== "loading") {
  initLazy();
} else {
  document.addEventListener("DOMContentLoaded", initLazy);
}
export {
  Lazy as default
};
