/** Create listings using the authenticated backend API. */
"use strict";

const listingService = {
  /** Load all public listings, including subsequent pages. */
  async getPublicListings() {
    const results = [];
    const limit = 100;
    for (let page = 1; ; page++) {
      const response = await fetch(`${API_URL}/api/v2/listings?page=${page}&limit=${limit}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Could not load public listings (${response.status}).`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error("Unexpected listings response.");
      results.push(...batch);
      if (batch.length < limit) return results;
    }
  },
  // The public endpoint is paginated and has no owner filter. Fetch every page
  // before selecting the signed-in user's listings.
  async getMyListings(ownerId) {
    if (!ownerId) return [];
    const results = [];
    const limit = 100;
    for (let page = 1; ; page++) {
      const response = await fetch(`${API_URL}/api/v2/listings?page=${page}&limit=${limit}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Could not load listings (${response.status}).`);
      const batch = await response.json();
      if (!Array.isArray(batch)) throw new Error("Unexpected listings response.");
      results.push(...batch.filter((item) => String(item.owner?.id) === String(ownerId)));
      if (batch.length < limit) return results;
    }
  },
  async createListing(draft) {
    const euroToCents = (value) => Math.round(Number(value) * 100);
    const payload = {
      title: String(draft.title || "").trim(),
      description: String(draft.description || "").trim(),
      category: String(draft.category || "").trim(),
      location: String(draft.location || "").trim(),
      price_per_day: euroToCents(draft.price),
      deposit: euroToCents(draft.deposit),
      tags: [],
      features: [],
      images: [],
    };
    if (!payload.title || !payload.category || !payload.location ||
        !Number.isSafeInteger(payload.price_per_day) || payload.price_per_day < 0 ||
        !Number.isSafeInteger(payload.deposit) || payload.deposit < 0) {
      throw new Error("Please enter valid listing details and prices.");
    }
    // Re-fetch on each create to avoid stale tokens after a login/session change.
    const csrfToken = await authService.getCsrfToken();
    const response = await fetch(`${API_URL}/api/v2/listings`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      let detail;
      try {
        const body = await response.json();
        detail = typeof body.detail === "string" ? body.detail : body.detail?.message;
      } catch (_) { /* Response may not be JSON. */ }
      if (response.status === 401) throw new Error("Sign in to publish a listing.");
      if (response.status === 403) throw new Error("Session expired. Please sign in again.");
      throw new Error(detail || `Publishing failed (${response.status}).`);
    }
    return response.json();
  },
};
