import { exec } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const THUMB_WIDTH = 300;

async function generateThumbs() {
  const imagesDir = path.join(__dirname, "src/assets/images");
  const thumbsDir = path.join(__dirname, "src/assets/.thumbs");

  if (!fs.existsSync(imagesDir)) return;

  const files = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
        files.push(full);
      }
    }
  };

  walk(imagesDir);

  for (const file of files) {
    const rel = path.relative(imagesDir, file);
    const out = path.join(thumbsDir, rel.replace(/\.[^.]+$/i, ".jpg"));
    fs.mkdirSync(path.dirname(out), { recursive: true });

    const needsUpdate =
      !fs.existsSync(out) || fs.statSync(out).mtimeMs < fs.statSync(file).mtimeMs;

    if (!needsUpdate) continue;

    await sharp(file)
      .rotate()
      .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 40, mozjpeg: true })
      .toFile(out);
  }
}

function openBrowser(url) {
  const command =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(command);
}

export default async function (eleventyConfig) {
  eleventyConfig.on("eleventy.before", generateThumbs);

  eleventyConfig.addFilter("thumbSrc", (src) => {
    if (!src || typeof src !== "string") return src;
    const match = src.match(/^\/?assets\/images\/(.+)$/i);
    if (!match) return src;
    const base = match[1].replace(/\.[^.]+$/i, ".jpg");
    return `/assets/.thumbs/${base}`;
  });

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addWatchTarget("src/assets/");
  eleventyConfig.addWatchTarget("src/scss/");
  eleventyConfig.addWatchTarget("src/js/");
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
