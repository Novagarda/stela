import { exec } from "node:child_process";

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(command);
}

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addWatchTarget("src/assets/");
  eleventyConfig.addWatchTarget("src/content/");

  eleventyConfig.addCollection("homeSections", (collection) => {
    return collection
      .getFilteredByTag("home-section")
      .sort((a, b) => (a.data.order ?? 0) - (b.data.order ?? 0));
  });

  eleventyConfig.setServerOptions({
    ready: (server) => {
      openBrowser(server.getServerUrl("localhost"));
    },
  });

  eleventyConfig.addNunjucksFilter("readableDate", (dateObj) => {
    return dateObj.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  });

  eleventyConfig.addNunjucksFilter("isoDate", (dateObj) => {
    return dateObj.toISOString().slice(0, 10);
  });

  eleventyConfig.addCollection("posts", (collection) => {
    return collection.getFilteredByTag("posts").sort((a, b) => b.date - a.date);
  });

  return {
    pathPrefix: process.env.ELEVENTY_PATH_PREFIX || "/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk",
  };
}
