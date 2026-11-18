/**
 * @file scripts/core/router.js
 * Hash router connecting all page renderers. It supports direct static links and the browser back button.
 */
"use strict";

let currentRoute = "",
  publicListingsRequestKey = "",
  publicListingsRequestId = 0,
  lastModalFocus = null,
  toastTimer;

/**
 * navigate to
 * @param {*} route See docs/ARCHITECTURE.md for data flow and page variants.
 */
function navigateTo(route) {
  closeModal();
  if (location.hash === "#/" + route) {
    renderCurrentRoute();
    window.scrollTo(0, 0);
  } else location.hash = "/" + route;
}

/**
 * Render the current hash route into #app and update the document title.
 * @returns {void}
 */
function renderCurrentRoute() {
  const previousRoute = currentRoute;
  currentRoute = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  closeModal();
  const [base, id] = currentRoute.split("/");
  let html;
  switch (base) {
    case "":
      html = renderHomePage();
      break;
    case "explore":
      html = renderExplorePage(false);
      break;
    case "explore-map":
      html = renderExplorePage(true);
      break;
    case "product":
      html = renderListingDetailsPage(id);
      break;
    case "booking":
      html = renderBookingPage(id);
      break;
    case "booking-success":
      html = renderBookingConfirmationPage();
      break;
    case "how":
      html = renderHowItWorksPage();
      break;
    case "dashboard":
      html = renderDashboardPage();
      break;
    case "rentals":
      html = renderRentalsPage();
      break;
    case "rental":
      html = renderRentalDetailsPage();
      break;
    case "handover":
      html = renderHandoverPage();
      break;
    case "return":
      html = renderHandoverPage(true);
      break;
    case "review":
      html = renderReviewPage();
      break;
    case "listings":
      html = renderMyListingsPage();
      break;
    case "new-listing":
      html = renderListingWizardPage();
      break;
    case "edit-listing":
      if (!appState.listing.title) {
        prefillListingDraft(sampleListings[5]);
        appState.listingStep = 0;
      }
      html = renderListingWizardPage(true);
      break;
    case "saved":
      html = renderSavedListingsPage();
      break;
    case "messages":
      html = renderMessagesPage();
      break;
    case "host":
      html = renderProfilePage(true);
      break;
    case "profile":
      html = renderProfilePage();
      break;
    case "settings":
      html = renderSettingsPage();
      break;
    case "verification":
      html = renderVerificationPage();
      break;
    case "payments":
      html = renderPaymentsPage();
      break;
    case "notifications":
      html = renderNotificationsPage();
      break;
    case "support":
      html = renderHelpCentrePage();
      break;
    case "tickets":
      html = id === "new" ? renderNewSupportRequestPage() : renderSupportRequestPage();
      break;
    case "login":
    case "register":
    case "forgot":
      html = renderAuthenticationPage(base);
      break;
    case "admin":
      html =
        id === "tickets"
          ? renderAdminRequestsPage()
          : id === "ticket"
            ? renderAdminRequestDetailPage(currentRoute.split("/")[2])
            : id === "listings"
              ? renderAdminModerationPage()
              : id === "users"
                ? renderAdminMembersPage()
                : renderAdminDashboardPage();
      break;
    default:
      html = renderPublicLayout(
        /* HTML */ `<div class="empty">
          <div class="empty-icon">${renderIcon("search")}</div>
          <h1>This plan leads somewhere else.</h1>
          <p>Page not found. Go back home and keep exploring.</p>
          ${renderLink("", "Go home", "home")}
        </div>`,
      );
  }
  selectElement("#app").innerHTML = html;
  document.title =
    (base
      ? ({
          explore: "Explore",
          product: "Listing details",
          booking: "Booking",
          dashboard: "My overview",
          rentals: "My rentals",
          messages: "Messages",
          admin: "Administration",
          support: "Help & support",
        }[base] || "Your next great plan") + " · "
      : "") + "RentIt";
  if (base === "product" || base === "booking") {
    if (!(base === "product" && id?.startsWith("api-"))) updateBookingPrice();
  }
  if (base === "explore" || base === "explore-map") {
    const key = JSON.stringify(getPublicListingApiFilters());
    const enteringExplore = !previousRoute.startsWith("explore");
    if (appState.publicListingsStatus !== "loading" &&
        (appState.publicListingsStatus === "idle" || key !== publicListingsRequestKey || enteringExplore)) {
      loadPublicListings(key);
    }
  } else if (base === "product" && id?.startsWith("api-") && appState.publicListingsStatus === "idle") {
    loadPublicListings(JSON.stringify(getPublicListingApiFilters()));
  }
  if (base === "listings" && isSignedIn() && appState.ownListingsStatus === "idle") {
    loadMyListings();
  }
}

/** Fetch real listings once per visit/session; re-render only while on this route. */
async function loadMyListings() {
  const ownerId = appState.auth.user?.id;
  if (!ownerId || appState.ownListingsStatus !== "idle") return;
  appState.ownListingsStatus = "loading";
  if (currentRoute === "listings") renderCurrentRoute();
  try {
    const listings = await listingService.getMyListings(ownerId);
    // A logout or account change while fetching must not expose old listings.
    if (!isSignedIn() || String(appState.auth.user?.id) !== String(ownerId)) return;
    appState.ownListings = listings;
    appState.ownListingsStatus = "loaded";
  } catch (error) {
    if (!isSignedIn() || String(appState.auth.user?.id) !== String(ownerId)) return;
    appState.ownListingsError = error.message || "Could not load listings.";
    appState.ownListingsStatus = "error";
  }
  if (currentRoute === "listings") renderCurrentRoute();
}

/** Translate Explore filters to supported GET /api/v2/listings query parameters. */
function getPublicListingApiFilters() {
  const filters = {};
  if (appState.query.trim()) filters.search = appState.query.trim();
  if (appState.category !== "All") filters.category = appState.category;
  if (Number.isFinite(appState.maxPrice)) filters.max_price = Math.round(appState.maxPrice * 100);
  filters.sort = appState.sort === "price-up" ? "price_asc" :
    appState.sort === "price-down" ? "price_desc" : "newest";
  return filters;
}

/** Reload on filter changes or re-entry; ignore responses from older requests. */
async function loadPublicListings(key = JSON.stringify(getPublicListingApiFilters())) {
  const requestId = ++publicListingsRequestId;
  publicListingsRequestKey = key;
  appState.publicListingsStatus = "loading";
  if (currentRoute.startsWith("explore") || currentRoute.startsWith("product/api-")) renderCurrentRoute();
  try {
    // Category totals describe the entire public catalogue, not the selected category.
    // Cache them separately from filtered search results.
    if (!appState.categoryCounts) {
      const allListings = await listingService.getPublicListings();
      if (requestId !== publicListingsRequestId) return;
      const counts = { All: 0 };
      for (const item of allListings) {
        if (item.is_available !== true) continue;
        counts.All++;
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
      appState.categoryCounts = counts;
    }
    const listings = await listingService.getPublicListings(JSON.parse(key));
    if (requestId !== publicListingsRequestId) return;
    appState.publicListings = listings;
    appState.publicListingsStatus = "loaded";
    appState.publicListingsError = "";
  } catch (error) {
    if (requestId !== publicListingsRequestId) return;
    appState.publicListingsError = error.message || "Could not load listings.";
    appState.publicListingsStatus = "error";
  }
  if (currentRoute.startsWith("explore") || currentRoute.startsWith("product/api-")) renderCurrentRoute();
}
