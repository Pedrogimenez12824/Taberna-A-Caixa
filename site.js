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

  // ---------- Horario: día de hoy y "abierto ahora" (hora de España) ----------
  // Minutos desde las 00:00; un cierre por encima de 1440 termina al día siguiente.
  const SCHEDULE = {
    0: [[720, 960], [1200, 1440]], // domingo
    1: [[600, 960]],
    2: [], // martes cerrado
    3: [[600, 960]],
    4: [[600, 960]],
    5: [[600, 960], [1200, 1440]],
    6: [[720, 960], [1200, 1500]], // sábado hasta la 01:00
  };
  const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const hhmm = (m) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  function madridNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, min: Number(get("hour")) * 60 + Number(get("minute")) };
  }

  function openState({ day, min }) {
    const yesterday = (day + 6) % 7;
    for (const [s, e] of SCHEDULE[yesterday]) if (e > 1440 && min < e - 1440) return { open: true, until: e };
    for (const [s, e] of SCHEDULE[day]) if (min >= s && min < e) return { open: true, until: e };
    for (let ahead = 0; ahead < 7; ahead++) {
      const d = (day + ahead) % 7;
      const next = SCHEDULE[d].find(([s]) => ahead > 0 || s > min);
      if (next) return { open: false, day: d, ahead, at: next[0] };
    }
    return { open: false };
  }

  const weeks = document.querySelectorAll("[data-hours]");
  if (weeks.length) {
    const now = madridNow();
    const st = openState(now);
    let text = "";
    if (st.open) text = `Abierto ahora. Cierra a las ${hhmm(st.until)}`;
    else if (st.ahead === 0) text = `Cerrado ahora. Abre hoy a las ${hhmm(st.at)}`;
    else if (st.ahead === 1) text = `Cerrado ahora. Abre mañana a las ${hhmm(st.at)}`;
    else if (st.day != null) text = `Cerrado ahora. Abre el ${DAY_NAMES[st.day]} a las ${hhmm(st.at)}`;
    weeks.forEach((w) => {
      const status = w.querySelector(".week-status");
      if (text) {
        status.textContent = text;
        status.classList.add(st.open ? "is-open" : "is-closed");
      }
      const today = w.querySelector(`[data-day="${now.day}"]`);
      if (today) {
        today.classList.add("today");
        today.setAttribute("aria-current", "date");
      }
    });
  }

  // ---------- Mapa: se carga Google Maps solo al pulsar (más rápido y sin cookies antes) ----------
  document.querySelectorAll("[data-load-map]").forEach((btn) =>
    btn.addEventListener("click", () => {
      const map = btn.closest(".map");
      const iframe = document.createElement("iframe");
      iframe.title = "Mapa de Google: Taberna A Caixa, Rúa Pedroso 33, Vilagarcía de Arousa";
      iframe.src = map.dataset.mapSrc;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.allowFullscreen = true;
      map.appendChild(iframe);
      map.classList.add("is-live");
    })
  );

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
