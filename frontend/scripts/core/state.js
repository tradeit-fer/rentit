/**
 * @file scripts/core/state.js
 * Browser-local state, persistence and listing draft helpers. This is sample storage, not authentication or a database.
 */
"use strict";

/**
 * load local state
 */
function loadLocalState() {
  try {
    return JSON.parse(localStorage.getItem(APP_CONFIG.storageKey)) || {};
  } catch {
    return {};
  }
}

const storedState = loadLocalState();

const appState = {
  saved: storedState.saved || ["camera", "tent"],
  messages: storedState.messages || [],
  ownListings: storedState.ownListings || [],
  // Identity comes from the signed-in account (GET /api/v2/me), never from local storage.
  profile: { first: "", last: "", email: "", phone: "", city: "", bio: "", display_name: "", avatar_key: "" },
  auth: { status: "loading", user: null },
  booking: storedState.booking || null,
  tickets: storedState.tickets || [],
  reviews: storedState.reviews || [],
  query: "",
  category: "All",
  maxPrice: 100,
  sort: "recommended",
  location: "Zagreb",
  verifiedOnly: false,
  availableOnly: false,
  searchStart: "",
  searchEnd: "",
  map: false,
  rentalsTab: "active",
  listingStep: 0,
  listing: {
    title: "",
    description: "",
    category: "Photo & video",
    price: 15,
    deposit: 50,
    location: "Zagreb",
    type: "Item",
  },
  uploads: {},
  rating: 5,
  chat: "marko",
  adminFilter: "all",
  notificationsRead: false,
  handoverDone: false,
  returnDone: false,
  settingsTab: "profile",
  faqQuery: "",
  adminDecision: "",
  paused: [],
  published: false,
};

/**
 * save local state
 */
function saveLocalState() {
  try {
    localStorage.setItem(
      APP_CONFIG.storageKey,
      JSON.stringify({
        saved: appState.saved,
        messages: appState.messages,
        ownListings: appState.ownListings,
        booking: appState.booking,
        tickets: appState.tickets,
        reviews: appState.reviews,
      }),
    );
  } catch {}
}

/**
 * Initials for the avatar, e.g. "Ana Horvat" -> "AH", "Madonna" -> "MA".
 * @param {string} name Display name of the member.
 * @returns {string} Up to two upper-case letters, or an empty string.
 */
function getInitials(name) {
  const words = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));
  if (!words.length) return "";
  const second = words.length > 1 ? words.at(-1)[0] : words[0][1] || "";
  return (words[0][0] + second).toLocaleUpperCase("en");
}

const isSignedIn = () => appState.auth.status === "authenticated";
const isAdmin = () => isSignedIn() && appState.auth.user.role === "admin";
const getFirstName = () => appState.profile.first;
const getFullName = () =>
  [appState.profile.first, appState.profile.last].filter(Boolean).join(" ") || "Guest";

/**
 * Store the signed-in member and optional profile fields returned by GET /api/v2/me.
 * Optional fields may be absent because the backend excludes null values.
 */
function setSignedInUser(user) {
  const email = String(user?.email || "");
  const name = String(user?.name || "").trim() || email.split("@")[0];
  const [first = "", ...rest] = name.split(/\s+/);
  appState.auth = {
    status: "authenticated",
    user: { ...user, id: user?.id, name, email, role: String(user?.role || "user") },
  };
  appState.profile = {
    first,
    last: rest.join(" "),
    email,
    phone: String(user?.phone || ""),
    city: String(user?.city || ""),
    bio: String(user?.bio || ""),
    display_name: String(user?.display_name || ""),
    avatar_key: String(user?.avatar_key || ""),
  };
}

/** Forget the signed-in member (no session, or after logout). */
function setSignedOut() {
  appState.auth = { status: "anonymous", user: null };
  appState.profile = { first: "", last: "", email: "", phone: "", city: "", bio: "", display_name: "", avatar_key: "" };
}

const findListing = (id) => sampleListings.find((p) => p.id === id) || sampleListings[0];

/**
 * get filtered listings
 */
function getFilteredListings() {
  let list = sampleListings.filter(
    (p) =>
      (appState.category === "All" || p.category === appState.category) &&
      p.price <= appState.maxPrice &&
      (!appState.query ||
        [p.name, p.category, p.desc]
          .join(" ")
          .toLocaleLowerCase("en")
          .includes(appState.query.toLocaleLowerCase("en"))) &&
      (!appState.location ||
        p.location.toLocaleLowerCase("en").includes(appState.location.toLocaleLowerCase("en")) ||
        appState.location.toLowerCase() === "zagreb and nearby") &&
      (!appState.verifiedOnly || p.id !== "workspace") &&
      (!appState.availableOnly || p.id !== "camera"),
  );
  if (appState.sort === "price-up") list.sort((a, b) => a.price - b.price);
  if (appState.sort === "price-down") list.sort((a, b) => b.price - a.price);
  if (appState.sort === "rating")
    list.sort((a, b) => Number(b.rating.replace(",", ".")) - Number(a.rating.replace(",", ".")));
  return list;
}

/**
 * prefill listing draft
 * @param {*} p See docs/ARCHITECTURE.md for data flow and page variants.
 */
function prefillListingDraft(p) {
  appState.listing = {
    title: p.title || p.name,
    description: p.description || p.desc,
    category: p.category,
    price: p.price,
    deposit: p.deposit ?? 30,
    location: p.location || "Zagreb",
    type: "Item",
    aiChecked: false,
  };
  appState.editId = p.id;
  appState.uploads["listing-0"] = "assets/images/" + p.img;
}

/**
 * capture listing draft
 */
function captureListingDraft() {
  const n = appState.listingStep,
    d = appState.listing;
  if (n === 0) {
    d.title = selectElement("#listing-title")?.value || d.title;
    d.description = selectElement("#listing-description")?.value || d.description;
    d.category = selectElement("#listing-category")?.value || d.category;
  }
  if (n === 2) {
    d.price = Number(selectElement("#listing-price")?.value || d.price);
    d.deposit = Number(selectElement("#listing-deposit")?.value || 0);
    d.location = selectElement("#listing-location")?.value || d.location;
    d.from = selectElement("#listing-from")?.value;
    d.to = selectElement("#listing-to")?.value;
    d.condition = selectElement("#listing-condition")?.value;
  }
}
