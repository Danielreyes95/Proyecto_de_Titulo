/* Propuesta 2 · navegación compartida. La autorización siempre se realiza en la API. */
(() => {
  "use strict";

  const HEX = /^#[0-9a-f]{6}$/i;
  const ID = /^[0-9a-f]{24}$/i;
  const root = document.documentElement;
  let sidebar = null;
  let backdrop = null;
  let topbar = null;
  let current = null;
  const svgNS = "http://www.w3.org/2000/svg";

  const glyphs = {
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M9 21v-7h6v7"/>',
    layers:'<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
    schools:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h1m4 0h1M9 11h1m4 0h1M9 15h6m-3 6v-4"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    whistle:'<circle cx="8" cy="16" r="5"/><path d="m12 12 5-5h4v5l-7 7"/>',
    bolt:'<path d="m13 2-9 12h7l-1 8 10-12h-7l0-8z"/>',
    chart:'<path d="M4 20V4M4 20h16M8 15v-4M13 15V7M18 15v-8"/>',
    message:'<path d="M4 4h16v12H7l-3 4z"/><path d="M8 8h8M8 12h6"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    palette:'<circle cx="12" cy="12" r="9"/><circle cx="7" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/><path d="M17 12a2 2 0 0 0 0 4h1"/>',
    shield:'<path d="m12 22 7-4V5l-7-3-7 3v13z"/><path d="m9 12 2 2 4-4"/>',
    ball:'<circle cx="12" cy="12" r="10"/><path d="m12 7 4 3-1.5 4.5h-5L8 10zM12 7V2M8 10 3 8M9.5 14.5 7 19M14.5 14.5 17 19M16 10l5-2"/>'
  };

  const schoolLinks = [
    ["Inicio", "director-acceso.html", "home", ["director","entrenador"]],
    ["Categorías", "categorias-escuela.html", "layers", ["director"]],
    ["Entrenadores", "entrenadores-escuela.html", "whistle", ["director"]],
    ["Jugadores y familias", "jugadores-escuela.html", "users", ["director"]],
    ["Registro rápido", "registro-rapido.html", "bolt", ["director","entrenador"]],
    ["Estadísticas", "estadisticas-escuela.html", "chart", ["director","entrenador"]],
    ["Comunicados", "avisos-escuela.html", "message", ["director"]],
    ["Personalización", "director-acceso.html#personalizacion", "palette", ["director"]]
  ];

  const platformLinks = [
    ["Inicio", "#inicio", "home"],
    ["Escuelas", "#catalogo", "schools"],
    ["Crear escuela", "#crear", "layers"],
    ["Personalización", "#identidad", "palette"],
    ["Invitar director", "#invitar", "user"],
    ["Listado", "#escuelas", "chart"]
  ];

  const familyLinks = [
    ["Mi portal", "/familia-acceso.html", "home"],
    ["Próximas actividades", "#tituloAgenda", "calendar"],
    ["Comunicados", "#tituloAvisos", "message"],
    ["Mis jugadores", "#jugadores", "users"]
  ];

  function element(tag, classes, text) {
    const el = document.createElement(tag);
    if (classes) el.className = classes;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function icon(name, classes = "app-icon") {
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("class", classes);
    svg.innerHTML = glyphs[name] || glyphs.ball;
    return svg;
  }
  function channels(c) {
    return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  }
  function toHex(parts) {
    return "#" + parts.map(x => Math.round(Math.max(0, Math.min(255, x)))
      .toString(16).padStart(2, "0")).join("");
  }
  function mix(a, b, amount) {
    const aa = channels(a), bb = channels(b);
    return toHex(aa.map((v, i) => v * (1 - amount) + bb[i] * amount));
  }
  function luminance(c) {
    const rgb = channels(c).map(value => {
      const x = value / 255;
      return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4;
    });
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  }
  function contrast(c) {
    return luminance(c) > .179 ? "#1d1930" : "#ffffff";
  }
  function applyBrand(branding = {}) {
    const primary = HEX.test(branding.colorPrimario || "") ? branding.colorPrimario : "#683ac6";
    const secondary = HEX.test(branding.colorSecundario || "") ? branding.colorSecundario : "#ffffff";
    const accent = HEX.test(branding.colorAcento || "") ? branding.colorAcento : "#f27686";
    const text = HEX.test(branding.colorTexto || "") ? branding.colorTexto : "#24243d";
    const darkPrimary = luminance(primary) > .58 ? mix(primary, "#26213f", .6) : primary;

    const colors = {
      "--ui-primary": darkPrimary,
      "--ui-primary-dark": mix(primary, "#1b102f", .77),
      "--ui-primary-soft": mix(primary, "#ffffff", .91),
      "--ui-primary-contrast": contrast(darkPrimary),
      "--ui-accent": accent,
      "--ui-secondary-brand": secondary,
      "--ui-secondary-soft": mix(secondary, "#ffffff", .89),
      "--ui-ink": luminance(text) > .75 ? "#24243d" : text,
      "--escuela-primario": primary,
      "--escuela-secundario": secondary,
      "--escuela-acento": accent,
      "--escuela-texto": text
    };
    for (const [key, value] of Object.entries(colors)) root.style.setProperty(key, value);
  }
  function validLogo(school, id) {
    const url = school?.branding?.logoUrl;
    return ID.test(id || "") && typeof url === "string" &&
      url.startsWith("/uploads/escuelas/" + id + "/logo/") ? url : null;
  }
  function closeMenu() {
    document.body.classList.remove("app-menu-open");
    document.querySelectorAll(".app-menu-toggle").forEach(node => node.setAttribute("aria-expanded", "false"));
  }
  function clearShell() {
    sidebar?.remove();
    backdrop?.remove();
    topbar?.remove();
    sidebar = backdrop = topbar = current = null;
    document.body.classList.remove("app-shell-active", "app-menu-open", "app-shell-admin", "app-shell-family", "app-shell-school");
    applyBrand();
  }
  function schoolName(school) {
    return school?.branding?.nombrePublico || school?.nombre || "Mi escuela";
  }
  function buildShell({ kind, name, tagline, logo, role, items, schoolId }) {
    const main = document.querySelector("main.layout");
    if (!main) return;
    clearShell();
    current = { kind, schoolId: schoolId || null };
    sidebar = element("aside", "app-sidenav");
    sidebar.id = "app-sidenav";
    sidebar.setAttribute("aria-label", "Navegación principal");
    const brand = element("div", "app-brand");
    const emblem = logo ? element("img", "app-logo") : element("div", "app-logo app-logo-fallback");
    if (logo) { emblem.src = logo; emblem.alt = ""; } else emblem.append(icon("ball"));
    const brandText = element("div", "app-brand-copy");
    brandText.append(element("strong", "", name), element("small", "", tagline));
    brand.append(emblem, brandText);
    sidebar.append(brand, element("span", "app-nav-section", "MENÚ PRINCIPAL"));

    const nav = element("nav", "app-nav");
    nav.setAttribute("aria-label", "Secciones");
    const page = location.pathname.split("/").pop();
    items.forEach(([label, link, symbol]) => {
      const item = element("a", "app-nav-link");
      item.href = link;
      item.append(icon(symbol), element("span", "", label));
      const selected = link.startsWith("#")
        ? (location.hash ? location.hash === link : link === "#inicio" && kind === "admin")
        : (link.split("?")[0].split("#")[0].split("/").pop() === page &&
          ((link.includes("#personalizacion") && location.hash === "#personalizacion") ||
            (!link.includes("#personalizacion") && location.hash !== "#personalizacion")));
      if (selected) item.setAttribute("aria-current", "page");
      item.addEventListener("click", () => {
        closeMenu();
        if (link.startsWith("#")) {
          nav.querySelectorAll("a").forEach(a => a.removeAttribute("aria-current"));
          item.setAttribute("aria-current", "page");
        }
      });
      nav.append(item);
    });
    sidebar.append(nav);
    const foot = element("div", "app-sidebar-foot");
    foot.append(icon("shield"), element("span", "", "Gestión segura por institución"));
    sidebar.append(foot);

    backdrop = element("button", "app-backdrop");
    backdrop.type = "button";
    backdrop.setAttribute("aria-label", "Cerrar menú");
    backdrop.addEventListener("click", closeMenu);

    topbar = element("div", "app-topbar");
    const menu = element("button", "app-menu-toggle");
    menu.type = "button";
    menu.setAttribute("aria-label", "Abrir navegación");
    menu.setAttribute("aria-controls", "app-sidenav");
    menu.setAttribute("aria-expanded", "false");
    menu.append(icon("layers"));
    menu.addEventListener("click", () => {
      const opened = document.body.classList.toggle("app-menu-open");
      menu.setAttribute("aria-expanded", String(opened));
    });
    const breadcrumb = element("div", "app-topbar-title");
    breadcrumb.append(element("span", "app-overline", "PLATAFORMA DE FÚTBOL"), element("strong", "", name));
    const identity = element("div", "app-user-pill");
    const initial = element("span", "app-user-avatar", role.slice(0,1).toUpperCase());
    identity.append(initial, element("span", "app-user-role", role));
    topbar.append(menu, breadcrumb, identity);
    const existingLogout = document.getElementById("salir");
    if (existingLogout) {
      const logoutButton = element("button", "app-topbar-logout", "Salir");
      logoutButton.type = "button";
      logoutButton.setAttribute("aria-label", "Cerrar sesión");
      logoutButton.addEventListener("click", () => existingLogout.click());
      topbar.append(logoutButton);
    }

    document.body.prepend(backdrop, sidebar);
    main.prepend(topbar);
    document.body.classList.add("app-shell-active", "app-shell-" + kind);
  }

  function mountPlatform() {
    buildShell({
      kind:"admin",
      name:"Panel de administración",
      tagline:"Gestión multiescuela",
      logo:null,
      role:"Superadmin",
      items:platformLinks
    });
    document.body.classList.add("app-shell-admin");
  }
  function mountSchool(schoolId, role, school) {
    if (!ID.test(schoolId || "") || !school ||
        !["director","entrenador"].includes(role)) return;
    const items = schoolLinks
      .filter(entry => entry[3].includes(role))
      .map(([label, file, symbol]) => [label,
        "/" + file.split("#")[0] + "?escuela=" + encodeURIComponent(schoolId) +
          (file.includes("#") ? "#personalizacion" : ""),
        symbol
      ]);
    buildShell({
      kind:"school", name:schoolName(school),
      tagline:role === "director" ? "Dirección de escuela" : "Panel de entrenador",
      logo:validLogo(school, schoolId), role:role === "director" ? "Director" : "Entrenador",
      items, schoolId
    });
    applyBrand(school.branding || {});
  }
  function mountFamily(schoolId, school) {
    if (!ID.test(schoolId || "") || !school) return;
    buildShell({
      kind:"family", name:schoolName(school), tagline:"Portal de familias",
      logo:validLogo(school, schoolId), role:"Familia",
      items:familyLinks, schoolId
    });
    applyBrand(school.branding || {});
  }
  function refreshBrand(school, schoolId) {
    if (!current || current.schoolId !== schoolId || !school) return;
    applyBrand(school.branding || {});
    const title = schoolName(school);
    sidebar?.querySelector(".app-brand-copy strong")?.replaceChildren(document.createTextNode(title));
    topbar?.querySelector(".app-topbar-title strong")?.replaceChildren(document.createTextNode(title));
    const image = sidebar?.querySelector(".app-logo");
    const logo = validLogo(school, schoolId);
    if (image && logo) {
      if (image.tagName !== "IMG") {
        const img = element("img", "app-logo");
        img.src = logo;
        img.alt = "";
        image.replaceWith(img);
      } else image.src = logo;
    } else if (image && !logo && image.tagName === "IMG") {
      const fallback = element("div", "app-logo app-logo-fallback");
      fallback.append(icon("ball"));
      image.replaceWith(fallback);
    }
  }
  async function initialSchool() {
    const id = new URLSearchParams(location.search).get("escuela");
    const token = sessionStorage.getItem("schoolToken");
    if (!ID.test(id || "") || !token) return;
    try {
      const response = await fetch("/api/escuela-sesion/" + encodeURIComponent(id) + "/personal", {
        headers:{ Authorization:"Bearer " + token }, cache:"no-store"
      });
      if (!response.ok) return;
      const data = await response.json();
      if (!data?.escuela || !["director","entrenador"].includes(data.rol)) return;
      mountSchool(id, data.rol, data.escuela);
    } catch { /* La propia página muestra los errores de sesión. */ }
  }

  window.UIPropuesta2 = Object.freeze({
    applyBrand, clearShell, mountPlatform, mountSchool, mountFamily, refreshBrand
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialSchool, { once:true });
  } else initialSchool();
})();