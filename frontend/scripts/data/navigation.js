/**
 * @file scripts/data/navigation.js
 * Navigation labels and the complete 35-screen directory. Hash paths are relative to index.html.
 */
"use strict";

const memberNavigation = [
  ["dashboard", "Overview", "grid"],
  ["profile", "My profile", "user"],
  ["rentals", "My rentals", "calendar"],
  ["messages", "Messages", "chat"],
  ["notifications", "Notifications", "bell"],
  ["saved", "Saved", "heart"],
  ["listings", "My listings", "box"],
  ["payments", "Payments & payouts", "wallet"],
  ["settings", "Settings", "settings"],
  ["support", "Help & support", "help"],
];

const adminNavigation = [
  ["admin", "Overview", "grid"],
  ["admin/tickets", "Reports & disputes", "flag"],
  ["admin/listings", "Listing review", "box"],
  ["admin/users", "Users", "users"],
];

const screenGroups = [
  [
    "Discovery & booking",
    [
      ["", "Home", "home"],
      ["explore", "Search & filters", "search"],
      ["explore-map", "Explore on a map", "map"],
      ["product/camera", "Listing details", "camera"],
      ["host/marko", "Public profile & reviews", "user"],
      ["booking/camera", "Booking & payment", "credit"],
      ["booking-success", "Booking confirmation", "check"],
      ["how", "How RentIt works", "repeat"],
    ],
  ],
  [
    "Your account",
    [
      ["dashboard", "Account overview", "grid"],
      ["profile", "My profile", "user"],
      ["rentals", "My rentals", "calendar"],
      ["messages", "Messages", "chat"],
      ["notifications", "Notifications", "bell"],
      ["saved", "Saved listings", "heart"],
      ["rental/current", "Rental details", "box"],
      ["handover", "Pickup & condition photos", "camera"],
      ["return", "Return an item", "repeat"],
      ["review", "Write a review", "star"],
      ["listings", "Manage listings", "list"],
      ["new-listing", "Create a listing · 4 steps", "plus"],
      ["edit-listing", "Edit a listing", "edit"],
      ["payments", "Payments & payouts", "wallet"],
      ["verification", "Identity verification", "shield"],
      ["settings", "Account settings", "settings"],
    ],
  ],
  [
    "Access, support & administration",
    [
      ["login", "Sign in", "lock"],
      ["register", "Create an account", "user"],
      ["forgot", "Password recovery", "mail"],
      ["support", "Help centre", "help"],
      ["tickets/new", "New support request", "flag"],
      ["tickets/current", "Request status", "file"],
      ["admin", "Admin overview", "grid"],
      ["admin/tickets", "Manage support requests", "flag"],
      ["admin/ticket/TI-0248", "Dispute review & evidence", "shield"],
      ["admin/listings", "Listing moderation", "box"],
      ["admin/users", "User management", "users"],
    ],
  ],
];

const screenCount = screenGroups.reduce((sum, g) => sum + g[1].length, 0);
