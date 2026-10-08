// Taberna A Caixa: partes comunes a todas las páginas
// (menú hamburguesa, carta original, galería ampliada, carta escrita y apariciones).
(() => {
  document.documentElement.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- Menú hamburguesa ----------
  const burger = document.querySelector(".burger");
  const drawer = document.getElementById("drawer");
  const setMenu = (open) => {
    document.body.classList.toggle("menu-open", open);
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    drawer.setAttribute("aria-hidden", String(!open));
    drawer.inert = !open;
    if (open) drawer.querySelector("a").focus({ preventScroll: true });
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  drawer.addEventListener("click", (e) => e.target.closest("a") && setMenu(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) {
      setMenu(false);
      burger.focus();
    }
  });

  // ---------- Carta original (la foto) ----------
  const cartaDialog = document.getElementById("carta-original");
  if (cartaDialog) {
    document.querySelectorAll("[data-open-carta]").forEach((b) =>
      b.addEventListener("click", () => cartaDialog.showModal())
    );
    cartaDialog.querySelector("[data-close-carta]").addEventListener("click", () => cartaDialog.close());
    cartaDialog.addEventListener("click", (e) => e.target === cartaDialog && cartaDialog.close());
  }

  // ---------- Galería: foto ampliada ----------
  const photoDialog = document.getElementById("photo-dialog");
  if (photoDialog) {
    const img = photoDialog.querySelector("img");
    const cap = photoDialog.querySelector("figcaption");
    document.querySelectorAll(".shot").forEach((b) =>
      b.addEventListener("click", () => {
        img.src = b.dataset.full;
        img.alt = b.querySelector("img").alt;
        cap.textContent = b.dataset.caption;
        photoDialog.showModal();
      })
    );
    photoDialog.querySelector("[data-close-photo]").addEventListener("click", () => photoDialog.close());
    photoDialog.addEventListener("click", (e) => e.target === photoDialog && photoDialog.close());
  }

  // ---------- Carta escrita: grupos que aparecen y sección activa ----------
  const groups = [...document.querySelectorAll(".menu-group")];
  const current = document.querySelector(".menu-current");
  if (groups.length && current) {
    const currentText = current.querySelector("span");
    const indexLinks = [...document.querySelectorAll(".menu-index a")];
    const groupObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            groupObserver.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px" }
    );
    groups.forEach((g) => groupObserver.observe(g));

    let activeId = null;
    const setActive = (group) => {
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
    };
    const activeObserver = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target)),
      { rootMargin: "-35% 0px -60% 0px" }
    );
    groups.forEach((g) => activeObserver.observe(g));
  }

  // ---------- Apariciones suaves al bajar (páginas interiores) ----------
  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length) {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach((el, i) => {
      el.style.setProperty("--d", `${(i % 4) * 80}ms`);
      io.observe(el);
    });
  }
})();
