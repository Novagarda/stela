import Flickity from "flickity";

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

  if (isSingleSlide) {
    slider.classList.add("slider--single");
  }

  const flkty = new Flickity(slider, {
    cellSelector: ".slide",
    pageDots: false,
    prevNextButtons: !noArrows && !isSingleSlide,
    cellAlign: "center",
    wrapAround: !isSingleSlide,
    draggable: !isSingleSlide,
    speed: 500,
    adaptiveHeight: false,
    lazyLoad: 1,
    imagesLoaded: true,
  });

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

    if (!isSingleSlide && carouselStatus) {
      const slideNumber = flkty.selectedIndex + 1;
      carouselStatus.textContent = `(${slideNumber}/${flkty.slides.length})`;
    } else if (carouselStatus) {
      carouselStatus.textContent = "";
    }

    handlerCaption(flkty, caption);

    if (isSingleSlide && sliderBottom) {
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

  updateStatus();
  flkty.on("select", updateStatus);
  flkty.on("ready", () => flkty.resize());
  window.addEventListener("load", () => flkty.resize());
}

document.querySelectorAll(".slider-js").forEach((slider) => {
  if (!slider.classList.contains("flickity-enabled")) {
    initSlider(slider);
  }
});
