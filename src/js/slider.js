import Flickity from "flickity";
import "flickity-fade";

function handlerCaption(flkty, caption) {
  if (!caption) return;

  const slide = flkty.selectedSlide;

  if (!slide?.cells?.length) {
    caption.innerHTML = "";
    caption.style.display = "none";
    return;
  }

  const cellEl = slide.cells[0].element;
  const slideCaption = cellEl.querySelector(".item-caption");

  if (slideCaption) {
    caption.innerHTML = slideCaption.innerHTML;
    caption.style.display = "block";

    const img = cellEl.querySelector("img");
    if (img) {
      const rect = img.getBoundingClientRect();
      caption.style.left = `${rect.left}px`;
      caption.style.top = `${rect.bottom - caption.offsetHeight}px`;
    }
  } else {
    caption.innerHTML = "";
    caption.style.display = "none";
  }
}

const MOBILE_MQ = window.matchMedia("(max-width: 767px)");

function isSlider3Mobile(slider) {
  return slider.closest(".block-slider-3") && MOBILE_MQ.matches;
}

function initSlider(slider) {
  const caption = slider.querySelector(".slider-caption");
  const carouselStatus = slider.querySelector(".slider-pagination");
  const sliderBottom = slider.querySelector(".slider-bottom");
  const slideCount = slider.querySelectorAll(".slide").length;
  const isSingleSlide = slideCount <= 1;
  const itemsToShow = Number.parseInt(slider.dataset.items, 10) || 1;
  const isMultiSlider = itemsToShow > 1;
  const noArrows =
    slider.dataset.sliderNoArrows === "1" || slider.dataset.sliderNoArrows === "true";
  const fade =
    slider.dataset.sliderFade === "1" || slider.dataset.sliderFade === "true";
  const pageDots =
    !isSingleSlide &&
    (slider.dataset.sliderDots === "1" || slider.dataset.sliderDots === "true");
  const adaptiveHeight = isSlider3Mobile(slider);

  if (isSingleSlide) {
    slider.classList.add("slider--single");
  }

  const flkty = new Flickity(slider, {
    cellSelector: ".slide",
    pageDots,
    prevNextButtons: !noArrows && !isSingleSlide,
    cellAlign: "center",
    wrapAround: !isSingleSlide,
    autoPlay: isSingleSlide ? false : 4500,
    draggable: !isSingleSlide,
    fade,
    speed: fade ? 0 : 500,
    selectedAttraction: fade ? 1 : 0.025,
    friction: fade ? 1 : 0.28,
    adaptiveHeight,
    imagesLoaded: true,
  });

  slider.addEventListener("lazyloaded", () => {
    flkty.resize();
    if (flkty.options.adaptiveHeight) {
      flkty.setGallerySize();
    }
  });

  // Fade: jump opacity instantly (no crossfade settle / no drag tween)
  if (fade) {
    const select = flkty.select.bind(flkty);
    flkty.select = (index, isWrap) => select(index, isWrap, true);
    flkty.fadeSlides = function fadeSlidesHardCut() {
      this.slides.forEach((slide, i) => {
        slide.setOpacity(i === this.selectedIndex ? 1 : 0);
      });
    };
  }

  // Place dots (left) and arrows (right) into the controls bar, below the image
  const controls = slider.querySelector("[data-slider-controls]");
  const controlsDots = slider.querySelector("[data-slider-controls-dots]");
  const controlsArrows = slider.querySelector("[data-slider-controls-arrows]");
  if (controls) {
    const dots = slider.querySelector(".flickity-page-dots");
    const prev = slider.querySelector(".flickity-prev-next-button.previous");
    const next = slider.querySelector(".flickity-prev-next-button.next");
    if (dots && controlsDots) controlsDots.append(dots);
    if (prev && controlsArrows) controlsArrows.append(prev);
    if (next && controlsArrows) controlsArrows.append(next);
    if (!dots && !prev && !next) {
      controls.hidden = true;
    } else {
      // Ensure controls sit under the viewport (Flickity appends viewport after them)
      const viewport = slider.querySelector(".flickity-viewport");
      if (viewport) viewport.after(controls);
    }
  }

  const updateStatus = () => {
    if (
      !flkty ||
      flkty.selectedIndex == null ||
      !flkty.slides?.length ||
      !flkty.cells?.length
    ) {
      if (carouselStatus) carouselStatus.textContent = "";
      return;
    }

    if (!isSingleSlide && carouselStatus && !pageDots) {
      const slideNumber = flkty.selectedIndex + 1;
      carouselStatus.textContent = `(${slideNumber}/${flkty.slides.length})`;
    } else if (carouselStatus) {
      carouselStatus.textContent = "";
    }

    handlerCaption(flkty, caption);

    if (sliderBottom && (isSingleSlide || pageDots)) {
      const hasCaption =
        caption &&
        caption.style.display !== "none" &&
        caption.textContent.trim() !== "";
      sliderBottom.style.display = hasCaption ? "" : "none";
    }

    flkty.cells.forEach((cell) => {
      cell.element.classList.remove("next");
    });

    const nextIndex = (flkty.selectedIndex + 1) % flkty.cells.length;
    const nextCell = flkty.cells[nextIndex];

    if (nextCell?.element) {
      nextCell.element.classList.add("next");
    }
  };

  const syncAdaptiveHeight = () => {
    const shouldAdapt = isSlider3Mobile(slider);
    if (flkty.options.adaptiveHeight === shouldAdapt) return;
    flkty.options.adaptiveHeight = shouldAdapt;
    flkty.resize();
    if (shouldAdapt) {
      flkty.setGallerySize();
    }
  };

  updateStatus();
  flkty.on("select", updateStatus);
  flkty.on("ready", () => {
    flkty.resize();
    if (flkty.options.adaptiveHeight) {
      flkty.setGallerySize();
    }
  });
  window.addEventListener("load", () => {
    flkty.resize();
    if (flkty.options.adaptiveHeight) {
      flkty.setGallerySize();
    }
  });

  if (slider.closest(".block-slider-3")) {
    MOBILE_MQ.addEventListener("change", syncAdaptiveHeight);
  }
}

function observeSlider(slider) {
  if (slider.classList.contains("flickity-enabled")) return;

  const start = () => {
    if (slider.classList.contains("flickity-enabled")) return;
    initSlider(slider);
  };

  if (!("IntersectionObserver" in window)) {
    start();
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      start();
    },
    { rootMargin: "200px 0px", threshold: 0.01 },
  );

  observer.observe(slider);
}

document.querySelectorAll(".slider-js").forEach(observeSlider);
