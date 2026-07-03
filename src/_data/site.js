const pathPrefix = process.env.ELEVENTY_PATH_PREFIX || "/";

export default {
  title: "Stela",
  description: "Stela é o novo modelo de mobilidade sostible de Santiago de Compostela",
  url:
    pathPrefix !== "/"
      ? `https://novagarda.github.io${pathPrefix.replace(/\/$/, "")}/`
      : "http://localhost:8080/",
  navigation: [
    { label: "Mapa", id: "mapa" },
    { label: "Liñas", id: "descargables" },
  ],
  footer: {
    concello: {
      name: "Concello de Santiago de Compostela",
      url: "https://www.santiagodecompostela.gal",
    },
    contact: {
      address: [
        "Rúa Cara Campomaior s/n",
        "15702 Santiago de Compostela",
      ],
      email: "mobilidade@stela.gal",
      phone: "+34 981 588 210",
    },
    legal: [
      { label: "Aviso legal", href: "/aviso-legal/" },
      { label: "Créditos", href: "/creditos/" },
    ],
    copyright: "©{{ year }}",
    languages: [
      { label: "Galego", href: "/", code: "gl", active: true },
      { label: "Español", href: "/es/", code: "es" },
      { label: "English", href: "/en/", code: "en" },
    ],
    social: [
      {
        label: "Instagram",
        href: "https://www.instagram.com/concellosantiago/",
      },
      {
        label: "Youtube",
        href: "https://www.youtube.com/channel/UCSrcC2UgDHIb80vVVRtvoDw",
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/concellosantiago/",
      },
      {
        label: "X",
        href: "https://x.com/pazoderaxoi",
      },
    ],
  },
};
