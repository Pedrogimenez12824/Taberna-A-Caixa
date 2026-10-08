// Taberna A Caixa: vuelo por la taberna con el motor de la skill scroll-world.
// Los clips de assets/world/ se renderizan gratis con tools/render_world.py.
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Carta: aparición de cada grupo y título activo a la izquierda
const groups = [...document.querySelectorAll(".menu-group")];
const current = document.querySelector(".menu-current");
const currentText = current.querySelector("span");
const indexLinks = [...document.querySelectorAll(".menu-index a")];

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  },
  { rootMargin: "0px 0px -10% 0px" }
);
groups.forEach((g) => revealObserver.observe(g));

let activeId = null;
function setActive(group) {
  if (group.id === activeId) return;
  activeId = group.id;
  indexLinks.forEach((a) =>
    a.setAttribute("aria-current", a.getAttribute("href") === `#${group.id}` ? "true" : "false")
  );
  current.classList.add("swap");
  setTimeout(() => {
    currentText.textContent = group.dataset.title;
    current.classList.remove("swap");
  }, reduceMotion ? 0 : 180);
}
const activeObserver = new IntersectionObserver(
  (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target)),
  { rootMargin: "-35% 0px -60% 0px" }
);
groups.forEach((g) => activeObserver.observe(g));

// El vuelo: una escena por rincón; cada conector une dos escenas fotograma a fotograma
const V = "assets/world/";
mountScrollWorld(document.getElementById("world"), {
  brand: { name: "A Caixa", href: "#top" },
  cta: { label: "Reservar mesa", href: "#visitanos" },
  hint: "Baja",
  diveScroll: 1.25,
  connScroll: 0.9,
  atmosphere: false,
  sections: [
    {
      id: "caixa", label: "A Caixa", still: V + "still_0.webp", clip: V + "dive_0.mp4",
      accent: "#b3352b", scroll: 1.4, linger: 0.3,
      eyebrow: "Taberna A Caixa",
      title: "Abre la caja.",
      body: "Cocina casera para compartir, terraza de piedra y sobremesas largas.",
      tags: ["Raciones", "Terraza", "Postres caseros"],
    },
    {
      id: "terraza", label: "Terraza", still: V + "still_1.webp", clip: V + "dive_1.mp4",
      accent: "#b3352b", linger: 0.35,
      eyebrow: "La terraza",
      title: "Al sol, junto a la piedra.",
      body: "Mesas fuera, sombrillas y césped para las tardes buenas.",
      tags: ["Al aire libre"],
    },
    {
      id: "comedor", label: "Comedor", still: V + "still_2.webp", clip: V + "dive_2.mp4",
      accent: "#b3352b", linger: 0.35,
      eyebrow: "El comedor",
      title: "La barra de siempre.",
      body: "Madera, reloj de pared y mesas largas para venir en grupo.",
      tags: ["Grupos"],
    },
    {
      id: "ventana", label: "Ventana", still: V + "still_3.webp", clip: V + "dive_3.mp4",
      accent: "#b3352b", linger: 0.35,
      eyebrow: "Junto a la ventana",
      title: "Mesa para dos.",
      body: "Azulejo, luz de día y un rincón tranquilo para comer sin prisa.",
      tags: [],
    },
    {
      id: "rincon", label: "Rincón", still: V + "still_4.webp", clip: V + "dive_4.mp4",
      accent: "#b3352b", linger: 0.35,
      eyebrow: "El rincón verde",
      title: "Sofá para la sobremesa.",
      body: "Sillones, plantas y cojines para quedarse un rato más.",
      tags: ["Café", "Copas"],
    },
    {
      id: "carta-vuelo", label: "Carta", still: V + "still_5.webp", clip: V + "dive_5.mp4",
      accent: "#b3352b", scroll: 1.5, linger: 0.25,
      eyebrow: "La carta",
      title: "Croquetas, pulpo y huevos para romper.",
      body: "Raciones caseras para compartir. Pregunta por los postres del día.",
      tags: [],
      cta: {
        primary: { label: "Reservar mesa", href: "#visitanos" },
        secondary: { label: "Ver la carta", href: "#carta" },
      },
    },
  ],
  connectors: [0, 1, 2, 3, 4].map((i) => V + `conn_${i}.mp4`),
});
