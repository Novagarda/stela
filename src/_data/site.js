const pathPrefix = process.env.ELEVENTY_PATH_PREFIX || "/";

export default {
  title: "Stela",
  description: "Un sitio estático con Eleventy",
  url:
    pathPrefix !== "/"
      ? `https://novagarda.github.io${pathPrefix.replace(/\/$/, "")}/`
      : "http://localhost:8080/",
};
