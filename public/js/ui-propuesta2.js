/* Propuesta 2: shell visual compartido. No sustituye autenticación ni permisos. */
(() => {
  "use strict";
  const SCHOOL_RE = /^[a-f0-9]{24}$/i;
  const HEX_RE = /^#[0-9a-f]{6}$/i;
  const $root = document.documentElement;
  const route = location.pathname.split("/").pop();
  let mountedSchool = "";
  let aside = null;
  let backdrop = null;

  const links = [
    { title: "Inicio", file: "director-acceso.html", icon: "⌂", roles: ["director", "entrenador"] },
    { title: "Categorías", file: "categorias-escuela.html", icon: "▦", roles: ["director"] },
    { title: "Entrenadores", file: "entrenadores-escuela.html", icon: "♟", roles: ["director"] },
    { title: "Jugadores", file: "jugadores-escuela.html", icon: "♧", roles: ["director"] },
    { title: "Registro en cancha", file: "registro-rapido.html", icon: "⚡", roles: ["director", "entrenador"] },
    { title: "Estadísticas", file: "estadisticas-escuela.html", icon: "▥", roles: ["director", "entrenador"] },
    { title: "Avisos", file: "avisos-escuela.html", icon: "✉", roles: ["director"] }
  ];

  function rgb(color) {
    return [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16));
  }
  function hex(parts) {
    return "#" + parts.map(v => Math.round(Math.max(0, Math.min(255, v)))
      .toString(16).padStart(2, "0")).join("");
  }
  function blend(color, other, ratio) {
    const a = rgb(color), b = rgb(other);
    return hex(a.map((v, i) => v * (1 - ratio) + b[i] * ratio));
  }
  function luminance(color) {
    const channels = rgb(color).map(v => {
      const x = v / 255;
      return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
    });
    return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
  }
  function contrastText(color) {
    return luminance(color) > .179 ? "#181c32" : "#ffffff";
  }
  function applyBrand(branding = {}) {
    if (!branding || typeof branding !== "object") return;
    const primary = HEX_RE.test(branding.colorPrimario || "")
      ? branding.colorPrimario : "#6738a8";
    const accent = HEX_RE.test(branding.colorAcento || "")
      ? branding.colorAcento : "#f27686";
    const text = HEX_RE.test(branding.colorTexto || "")
      ? branding.colorTexto : "#20243d";
    const accessiblePrimary = luminance(primary) > .55 ? blend(primary, "#24203c", .62) : primary;
    $root.style.setProperty("--ui-primary", accessiblePrimary);
    $root.style.setProperty("--ui-primary-dark", blend(primary, "#190d2e", .78));
    $root.style.setProperty("--ui-primary-soft", blend(primary, "#ffffff", .91));
    $root.style.setProperty("--ui-on-primary", contrastText(accessiblePrimary));
    $root.style.setProperty("--ui-accent", accent);
    $root.style.setProperty("--ui-ink", luminance(text) > .7 ? "#20243d" : text);
    $root.style.setProperty("--escuela-primario", primary);
    $root.style.setProperty("--escuela-acento", accent);
  }

  function node(tag, className, value) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function linkFor(item, id) {
    if (item.file === "director-acceso.html") return "/" + item.file;
    return "/" + item.file + "?escuela=" + encodeURIComponent(id);
  }
  function logoFor(school, schoolId) {
    const url = school.branding && school.branding.logoUrl;
    return typeof url === "string" &&
      url.startsWith("/uploads/escuelas/" + schoolId + "/logo/") ? url : "";
  }
  function displayName(school) {
    return school.branding && school.branding.nombrePublico || school.nombre || "Mi escuela";
  }

  function closeNav() {
    document.body.classList.remove("app-menu-open");
    document.querySelectorAll(".app-menu-toggle").forEach(button => {
      button.setAttribute("aria-expanded", "false");
    });
  }
  function clearShell() {
    aside?.remove();
    backdrop?.remove();
    document.querySelector(".app-topbar")?.remove();
    aside = null;
    backdrop = null;
    mountedSchool = "";
    document.body.classList.remove("app-shell-active", "app-menu-open");
  }
  function mountSchool(schoolId, role, school) {
    if (!SCHOOL_RE.test(schoolId || "") || !school ||
        !["director", "entrenador"].includes(role)) return;
    const main = document.querySelector("main.layout");
    if (!main) return;
    clearShell();
    mountedSchool = schoolId;
    applyBrand(school.branding || {});
    const name = displayName(school);
    const logo = logoFor(school, schoolId);

    aside = node("aside", "app-sidenav");
    aside.id = "app-sidenav";
    aside.setAttribute("aria-label", "Navegación de la escuela");
    const brand = node("div", "app-brand");
    const visual = logo ? node("img", "app-logo") : node("div", "app-logo app-logo-fallback", "⚽");
    if (logo) { visual.src = logo; visual.alt = "Escudo de la escuela"; }
    const caption = node("div");
    caption.append(node("strong", "", name));
    caption.append(node("small", "", role === "director" ? "Panel de dirección" : "Panel de entrenador"));
    brand.append(visual, caption);
    aside.append(brand, node("span", "app-nav-section", "GESTIÓN DEPORTIVA"));

    const nav = node("nav", "app-nav");
    nav.setAttribute("aria-label", "Módulos de la escuela");
    links.filter(item => item.roles.includes(role)).forEach(item => {
      const a = node("a", "", item.title);
      a.href = linkFor(item, schoolId);
      const icon = node("span", "app-nav-icon", item.icon);
      icon.setAttribute("aria-hidden", "true");
      a.prepend(icon);
      if (item.file === route) a.setAttribute("aria-current", "page");
      a.addEventListener("click", closeNav);
      nav.append(a);
    });
    aside.append(nav, node("div", "app-nav-note", "Los datos y permisos pertenecen únicamente a esta escuela."));
    backdrop = node("div", "app-backdrop");
    backdrop.addEventListener("click", closeNav);

    const topbar = node("div", "app-topbar");
    const menu = node("button", "app-menu-toggle", "☰");
    menu.type = "button";
    menu.setAttribute("aria-label", "Abrir o cerrar menú");
    menu.setAttribute("aria-controls", "app-sidenav");
    menu.setAttribute("aria-expanded", "false");
    menu.addEventListener("click", () => {
      const open = document.body.classList.toggle("app-menu-open");
      menu.setAttribute("aria-expanded", String(open));
    });
    const title = node("div", "app-topbar-brand");
    if (logo) {
      const image = node("img");
      image.src = logo;
      image.alt = "";
      title.append(image);
    }
    title.append(node("strong", "", name));
    topbar.append(menu, title, node("span", "app-role", role === "director" ? "Dirección" : "Entrenador"));
    main.prepend(topbar);
    document.body.prepend(backdrop, aside);
    document.body.classList.add("app-shell-active");
  }

  async function start() {
    const schoolId = new URLSearchParams(location.search).get("escuela");
    const token = sessionStorage.getItem("schoolToken");
    if (!SCHOOL_RE.test(schoolId || "") || !token) return;
    try {
      const res = await fetch("/api/escuela-sesion/" + encodeURIComponent(schoolId) + "/personal", {
        method: "GET",
        headers: { Authorization: "Bearer " + token },
        cache: "no-store"
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data || !data.escuela || !["director", "entrenador"].includes(data.rol)) return;
      mountSchool(schoolId, data.rol, data.escuela);
    } catch {
      // El error de conexión ya lo gestiona la página; el shell es opcional.
    }
  }

  window.UIPropuesta2 = Object.freeze({ applyBrand, mountSchool, clearShell });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeNav();
  });
})();