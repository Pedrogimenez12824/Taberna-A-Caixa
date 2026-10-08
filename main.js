// Taberna A Caixa: portada con vuelo por scroll (técnica de la skill scroll-world)
// y animaciones ligeras en el resto de la página. La web se lee igual sin ellas.
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isPhone = window.matchMedia("(max-width: 860px), (hover: none) and (pointer: coarse)").matches;

// ---------- Carta: grupos que aparecen y sección activa a la izquierda ----------
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

// ---------- Manifiesto: una palabra por span ----------
const manifesto = document.querySelector(".reveal-words");
manifesto.innerHTML = manifesto.textContent
  .trim()
  .split(/\s+/)
  .map((w) => `<span class="w">${w}</span>`)
  .join(" ");

if (!reduceMotion && window.gsap && window.ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);

  // ---------- 1. PORTADA: el scroll mueve el vídeo ----------
  // Como el motor de scroll-world: el clip se carga como Blob (siempre se puede
  // saltar a cualquier punto), el tiempo sigue al scroll con suavizado y nunca se
  // pide un salto nuevo mientras el anterior no ha terminado.
  const flight = document.querySelector(".flight");
  const video = flight.querySelector(".flight-video");
  let ready = false;
  let target = 0;
  let shown = 0;

  fetch(isPhone ? "assets/video/hero-m.mp4" : "assets/video/hero.mp4")
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(r.status))))
    .then((blob) => {
      video.src = URL.createObjectURL(blob);
      video.load();
    })
    .catch(() => {}); // sin vídeo se queda la imagen fija

  video.addEventListener("loadeddata", () => {
    ready = true;
    flight.classList.add("has-video");
  });
  // iOS no pinta un vídeo que nunca se ha reproducido: lo "despertamos" al primer toque
  window.addEventListener(
    "touchstart",
    () => video.play().then(() => video.pause()).catch(() => {}),
    { once: true, passive: true }
  );

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: flight,
      start: "top top",
      end: "+=220%",
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        // el vídeo ocupa el 90 % del recorrido; el resto es para el texto final
        target = Math.min(1, self.progress / 0.9);
      },
    },
  });
  if (!isPhone) tl.to(".flight-media", { left: 0, "--shade": 0, duration: 0.3, ease: "power2.inOut" }, 0.04);
  tl.to(".flight-copy", { opacity: 0, y: -50, duration: 0.3 }, 0.05)
    .to(".flight-end", { opacity: 1, duration: 0.15 }, 0.82)
    .to({}, { duration: 0.03 });

  gsap.ticker.add(() => {
    if (!ready || !video.duration) return;
    shown += (target - shown) * 0.2;
    const t = shown * (video.duration - 0.05);
    if (!video.seeking && Math.abs(video.currentTime - t) > 0.015) video.currentTime = t;
  });

  // ---------- 2. MANIFIESTO: las palabras se encienden mientras lees ----------
  gsap.to(".reveal-words .w", {
    opacity: 1,
    stagger: 0.08,
    ease: "none",
    scrollTrigger: { trigger: ".manifesto", start: "top 75%", end: "bottom 55%", scrub: true },
  });

  // ---------- 3. RINCONES: el scroll vertical pasa la galería de lado ----------
  const track = document.querySelector(".rooms-track");
  const distance = () => Math.max(0, track.scrollWidth - innerWidth);
  const pan = gsap.to(track, {
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
  // cada polaroid se endereza un poco al pasar por el centro
  gsap.utils.toArray(".frame").forEach((frame, i) => {
    const tilt = i % 2 ? 5 : -5;
    gsap.fromTo(
      frame,
      { rotation: tilt, y: 30 },
      {
        rotation: -tilt / 2,
        y: -10,
        ease: "none",
        scrollTrigger: {
          trigger: frame,
          containerAnimation: pan,
          start: "left right",
          end: "right left",
          scrub: true,
        },
      }
    );
  });

  // ---------- 4. RECOMENDADOS: cada plato entra desde un lado ----------
  gsap.utils.toArray(".pick").forEach((pick, i) => {
    gsap.from(pick.querySelector(".pick-name"), {
      xPercent: i % 2 ? 12 : -12,
      opacity: 0,
      duration: 0.9,
      ease: "power3.out",
      scrollTrigger: { trigger: pick, start: "top 85%" },
    });
    gsap.from(pick.querySelector(".pick-price"), {
      scale: 1.8,
      rotation: -16,
      opacity: 0,
      duration: 0.5,
      delay: 0.35,
      ease: "back.out(2)",
      scrollTrigger: { trigger: pick, start: "top 85%" },
    });
  });

  // ---------- 5. CARTA: los platos entran en cascada ----------
  ScrollTrigger.batch(".menu-group li, .croquetas .dish", {
    start: "top 92%",
    once: true,
    onEnter: (items) =>
      gsap.from(items, { y: 18, opacity: 0, duration: 0.6, stagger: 0.06, ease: "power2.out" }),
  });

  // ---------- 6. VISÍTANOS: la foto de fondo se mueve más despacio ----------
  gsap.fromTo(
    ".visit-bg",
    { scale: 1.15, yPercent: -5 },
    {
      scale: 1,
      yPercent: 5,
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

  window.addEventListener("load", () => ScrollTrigger.refresh());
} else {
  document.querySelectorAll(".reveal-words .w").forEach((w) => (w.style.opacity = 1));
}
