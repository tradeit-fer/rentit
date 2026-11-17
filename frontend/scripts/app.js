/**
 * @file scripts/app.js
 * Application entry point. All deferred scripts above it must finish loading before the initial render.
 */
"use strict";

window.addEventListener("hashchange", () => {
  renderCurrentRoute();
  window.scrollTo(0, 0);
});

renderCurrentRoute();

async function initializeAuthentication() {
  try {
    const user = await authService.getCurrentUser();
    if (user) setSignedInUser(user);
    else setSignedOut();
  } catch (error) {
    console.error("Authentication check failed:", error);
    setSignedOut();
  }
  // Redraw so the header, sidebar and screens show the member who is signed in.
  renderCurrentRoute();
}

initializeAuthentication();
