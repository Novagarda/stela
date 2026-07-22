const pathPrefix = process.env.ELEVENTY_PATH_PREFIX || "/";

export default {
  title: "Stela",
  description: "Stela é o novo modelo de mobilidade sostible de Santiago de Compostela",
  url:
    pathPrefix !== "/"
      ? `https://novagarda.github.io${pathPrefix.replace(/\/$/, "")}/`
      : "http://localhost:8080/",
  navigation: [],
  footer: {
    concello: {
      name: "Concello de Santiago de Compostela",
      url: "https://www.santiagodecompostela.gal",
    },
    contact: {
      address: [
        "Rúa Clara Campoamor s/n",
        "15702 Santiago de Compostela",
      ],
      email: "mobilidade@stela.gal",
      phone: "+34 981 568 210",
    },
    legal: [
      { label: "Aviso legal", href: "/aviso-legal/" },
      { label: "Privacidade", href: "/privacidade/" },
    ],
    copyright: "©{{ year }}",
    social: [
      {
        label: "Instagram",
        href: "https://www.instagram.com/stelamobilidade/",
      },
      {
        label: "YouTube",
        href: "https://www.youtube.com/@stelamobilidade",
      },
      {
        label: "Facebook",
        href: "https://www.facebook.com/stelamobilidade",
      },
    ],
  },
};
