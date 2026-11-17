/**
 * @file scripts/components/layout.js
 * Public header/footer and member/admin sidebar layouts. The screen navigator can be disabled in config.js.
 */
"use strict";

/**
 * render brand logo
 * @returns {string} HTML for this view.
 */
function renderBrandLogo() {
  return /* HTML */ `<a class="logo" href="#/" aria-label="RentIt home">
    <span class="mark">${renderIcon("repeat")}</span>
    <div>Rent<span>It</span></div>
  </a>`;
}

/**
 * Account entry in the header: avatar when signed in, "Sign in" when nobody is.
 * @returns {string} HTML for this view.
 */
function renderHeaderAccount() {
  if (appState.auth.status === "anonymous")
    return renderLink("login", "Sign in", "user", "btn light small");
  return /* HTML */ `<a href="#/dashboard" aria-label="My account">${renderAvatar("me")}</a>`;
}

/**
 * render site header
 * @returns {string} HTML for this view.
 */
function renderSiteHeader() {
  return /* HTML */ `<header class="header">
    <div class="topline">
      ${renderIcon("leaf")} Good for your wallet. Even better for the planet.
    </div>
    <div class="nav wrap">
      ${renderBrandLogo()}
      <nav class="nav-links" aria-label="Main navigation">
        <a href="#/explore" class="${currentRoute.startsWith("explore") ? "active" : ""}"
          >Explore</a
        >
        <a href="#/how">How it works</a>
        <a href="#/new-listing">Become an owner</a>
      </nav>
      <div class="nav-right">
        <a class="iconbtn" href="#/saved" aria-label="Saved">${renderIcon("heart")}</a>
        <a class="iconbtn" href="#/messages" aria-label="Messages">${renderIcon("chat")}</a>
        <a class="iconbtn" href="#/notifications" aria-label="Notifications"
          >${renderIcon("bell")}</a
        >
        <span class="divider"> </span
        >${renderLink("new-listing", "List an item", "plus", "btn small")}${renderHeaderAccount()}
      </div>
    </div>
  </header>`;
}

/**
 * render site footer
 * @returns {string} HTML for this view.
 */
function renderSiteFooter() {
  return /* HTML */ `<footer class="footer">
    <div class="wrap">
      <div class="between">
        ${renderBrandLogo()}
        <div class="footer-links">
          <a href="#/how">How it works</a>
          <a href="#/support">Help & support</a>
          <a href="#/new-listing">Become an owner</a>
          <a href="#/login">Sign in</a>
        </div>
      </div>
      <div class="between mt20">
        <p>© 2026 RentIt. Things we share. Stories we make.</p>
        <p>English · EUR €</p>
      </div>
    </div>
  </footer>`;
}

/**
 * render screen navigator
 * @returns {string} HTML for this view.
 */
let screenNavigatorCollapsed = false;

function renderScreenNavigator() {
  if (!APP_CONFIG.showScreenNavigator) return "";
  return /* HTML */ `<div class="screen-navigator ${screenNavigatorCollapsed ? "is-collapsed" : ""}">
    <button type="button" class="screen-navigator-toggle" data-action="screens" aria-label="Open all screens">
      ${renderIcon("grid")}<span>All screens</span><b>${screenCount}</b>
    </button>
    <button type="button" class="screen-navigator-handle" data-action="toggle-screen-navigator"
      aria-label="${screenNavigatorCollapsed ? "Show All screens button" : "Hide All screens button"}"
      aria-expanded="${!screenNavigatorCollapsed}">
      <span aria-hidden="true">${screenNavigatorCollapsed ? "›" : "‹"}</span>
    </button>
  </div>`;
}

/**
 * render account sidebar
 * @param {*} admin See docs/ARCHITECTURE.md for data flow and page variants.
 * @returns {string} HTML for this view.
 */
function renderAccountSidebar(admin = false) {
  const nav = admin ? adminNavigation : memberNavigation;
  return /* HTML */ `<aside class="sidebar">
    <div class="user-meta flex">
      ${admin ? renderOwnAvatar("", "background:#dfe7ce;color:#4e6b3d") : renderAvatar("me")}
      <div>
        <h4>
          ${escapeHtml(isSignedIn() ? getFullName() : appState.auth.status === "anonymous" ? "Not signed in" : "")}
        </h4>
        <p>
          ${
            isSignedIn()
              ? isAdmin()
                ? "Administrator"
                : "Personal account"
              : appState.auth.status === "anonymous"
                ? '<a href="#/login">Sign in</a>'
                : "&nbsp;"
          }
        </p>
      </div>
    </div>
    <div class="nav-section-label">${admin ? "WORKSPACE" : "MY RENTIT"}</div>
    ${nav.map(([r, l, i]) => /* HTML */ `<a href="#/${r}" class="side-link ${isNavigationActive(r) ? "active" : ""}">${renderIcon(i)}${l}${r === "messages" ? "<b>2</b>" : r === "admin/tickets" ? "<b>12</b>" : ""}</a>`).join("")}
    <div class="nav-section-label">${admin ? "MEMBER AREA" : "EXPLORE"}</div>
    <a class="side-link" href="#/">${renderIcon("search")}Back to exploring</a>
    ${
      admin || isAdmin()
        ? /* HTML */ `<a class="side-link" href="#/${admin ? "dashboard" : "admin"}"
            >${renderIcon(admin ? "user" : "shield")}${admin ? "Account overview" : "Administration"}</a
          >`
        : ""
    }
    ${
      isSignedIn() && appState.ownListingsStatus === "loaded" && appState.ownListings.length === 0
        ? /* HTML */ `<div class="sidebar-tip">
            <span class="green">${renderIcon("leaf")}</span>
            <h4>More use. Less stuff.</h4>
            <p>Every rental gives things another chance.</p>
            ${renderLink("new-listing", "Create your first listing", "arrow", "link mt12")}
          </div>`
        : ""
    }
    ${
      isSignedIn()
        ? /* HTML */ `<button type="button" class="side-link" data-action="logout">Logout</button>`
        : /* HTML */ `<a class="side-link" href="#/login">${renderIcon("user")}Sign in</a>`
    }
  </aside>`;
}

/**
 * is navigation active
 * @param {*} r See docs/ARCHITECTURE.md for data flow and page variants.
 */
function isNavigationActive(r) {
  if (r === "admin") return currentRoute === "admin";
  if (r === "rentals") return /^(rentals|rental|handover|return|review)/.test(currentRoute);
  if (r === "listings") return /^(listings|new-listing|edit-listing)/.test(currentRoute);
  if (r === "support") return /^(support|tickets)/.test(currentRoute);
  if (r === "admin/tickets") return /^admin\/ticket/.test(currentRoute);
  return currentRoute === r;
}

/**
 * render account layout
 * @param {*} html See docs/ARCHITECTURE.md for data flow and page variants.
 * @param {*} admin See docs/ARCHITECTURE.md for data flow and page variants.
 * @returns {string} HTML for this view.
 */
function renderAccountLayout(html, admin = false) {
  return /* HTML */ `${renderSiteHeader()}
    <nav class="mobile-nav" aria-label="Account navigation">
      ${(admin ? adminNavigation : memberNavigation).map(([r, l, i]) => /* HTML */ `<a class="${isNavigationActive(r) ? "active" : ""}" href="#/${r}">${renderIcon(i)}${l}</a>`).join("")}
    </nav>
    <div class="app-layout">
      ${renderAccountSidebar(admin)}
      <main id="main" tabindex="-1" class="app-main">${html}</main>
    </div>
    ${renderScreenNavigator()}`;
}

/**
 * render public layout
 * @param {*} html See docs/ARCHITECTURE.md for data flow and page variants.
 * @returns {string} HTML for this view.
 */
function renderPublicLayout(html) {
  return /* HTML */ `${renderSiteHeader()}
    <main id="main" tabindex="-1" class="wrap">${html}</main>
    ${renderSiteFooter()}${renderScreenNavigator()}`;
}
