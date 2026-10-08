// Taberna A Caixa: efectos de scroll (GSAP + ScrollTrigger)
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Separa el manifiesto en palabras para encenderlas una a una
const manifesto = document.querySelector(".reveal-words");
manifesto.innerHTML = manifesto.textContent
  .trim()
  .split(/\s+/)
  .map((w) => `<span class="w">${w}</span>`)
  .join(" ");

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

if (reduceMotion || !window.gsap || !window.ScrollTrigger) {
  // Sin movimiento: caja abierta y palabras visibles
  const door = document.querySelector(".door");
  if (door) door.style.transform = "rotateY(-105deg)";
  document.querySelectorAll(".reveal-words .w").forEach((w) => (w.style.opacity = 1));
} else {
  gsap.registerPlugin(ScrollTrigger);

  // 1. HERO: gira la rueda, se abre la puerta y la cámara entra en la caja
  const hero = document.querySelector(".hero");
  const safe = document.querySelector(".safe");
  // Centro de la puerta dentro del dibujo (viewBox 360x420)
  const DOOR = { cx: 216 / 360, cy: 211 / 420, w: 232 / 360, h: 334 / 420 };

  const zoom = () => {
    const sw = safe.offsetWidth;
    const sh = safe.offsetHeight;
    return Math.max(innerWidth / (sw * DOOR.w), innerHeight / (sh * DOOR.h)) * 1.08;
  };
  const shiftX = () => innerWidth / 2 - (safe.offsetLeft + safe.offsetWidth * DOOR.cx);
  const shiftY = () => innerHeight / 2 - (safe.offsetTop + safe.offsetHeight * DOOR.cy);

  gsap.set(safe, { transformOrigin: `${DOOR.cx * 100}% ${DOOR.cy * 100}%` });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: hero,
      start: "top top",
      end: "+=230%",
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  tl.to(".wheel", { rotation: 280, transformOrigin: "50% 50%", duration: 1 }, 0)
    .to(".dial", { rotation: -200, transformOrigin: "50% 50%", duration: 1 }, 0)
    .to(".door", { rotationY: -108, duration: 1.1, ease: "power1.inOut" }, 0.9)
    .to(".hero-copy", { opacity: 0, y: -40, duration: 0.7 }, 1.1)
    .to(".door", { opacity: 0, duration: 0.4 }, 2.0)
    .to(safe, { x: shiftX, y: shiftY, scale: zoom, duration: 1.3, ease: "power2.in" }, 1.9)
    .to(".hero-end", { opacity: 1, duration: 0.4 }, 3.0)
    .to({}, { duration: 0.3 });

  // 2. MANIFIESTO: las palabras se encienden mientras lees
  gsap.to(".reveal-words .w", {
    opacity: 1,
    stagger: 0.08,
    ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 75%", end: "bottom 55%", scrub: true },
  });

  // 3. RINCONES: scroll vertical que mueve la galería en horizontal
  const track = document.querySelector(".rooms-track");
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: ".rooms",
      start: "top top",
      end: () => `+=${distance()}`,
      pin: true,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  // 4. VISÍTANOS: la foto de fondo se acerca un poco al entrar
  gsap.fromTo(
    ".visit-bg",
    { scale: 1.15, yPercent: -4 },
    {
      scale: 1,
      yPercent: 4,
      ease: "none",
      scrollTrigger: { trigger: ".visit", start: "top bottom", end: "bottom top", scrub: true },
    }
  );
  gsap.from(".visit-card", {
    y: 60,
    opacity: 0,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: ".visit", start: "top 60%" },
  });

  // Recalcular cuando cargan las fuentes y las fotos
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
