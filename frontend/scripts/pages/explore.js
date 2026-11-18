/**
 * @file scripts/pages/explore.js
 * Page template: explore. Keep presentation here and data operations in the core/service layer.
 */
"use strict";

/**
 * Render the explore screen using the shared RentIt design system.
 * @param {*} mapMode See docs/ARCHITECTURE.md for data flow and page variants.
 * @returns {string} HTML for this view.
 */
function renderExplorePage(mapMode = false) {
  appState.map = mapMode;
  const list = getFilteredPublicListings();
  const status = appState.publicListingsStatus;
  return renderPublicLayout(
    /* HTML */ `${renderPageHeading("What do you need today?", "A great plan starts with the right thing. Find it in your neighbourhood.")}
      ${renderSearchForm()}
      <div class="explore-layout">
        <aside class="filters" id="filters">
          <div class="between">
            <h3>Filters</h3>
            ${renderButton("reset-filters", "Clear", "", "link small")}
          </div>
          <h4>Categories</h4>
          ${listingCategories
            .map(
              ([c, i]) =>
                /* HTML */ `<label class="checkrow">
                  <input
                    type="radio"
                    name="category-filter"
                    value="${c}"
                    ${appState.category === c ? "checked" : ""}
                  />${c}<span
                    >${appState.categoryCounts?.[c] ?? 0}</span
                  >
                </label>`,
            )
            .join("")}
          <hr />
          <h4>Price per day</h4>
          <input
            type="range"
            id="price-range"
            aria-label="Maximum daily price"
            min="1"
            max="100"
            value="${appState.maxPrice}"
          />
          <div class="between small muted mt12">
            <span>1 €</span>
            <span id="price-label">Up to ${appState.maxPrice} €</span>
          </div>
          <hr />
          <h4>More options</h4>
          <label class="checkrow">
            <input
              id="verified-filter"
              type="checkbox"
              ${appState.verifiedOnly ? "checked" : ""}
            />Verified members</label
          >
          <div class="notice mt28">
            ${renderIcon("shield")}
            <p>Your rental agreement and condition records stay together.</p>
          </div>
        </aside>
        <section>
          <div class="filterbar">
            <strong class="grow" style="font-size:12px"
              >${list.length} ${list.length === 1 ? "result" : "results"}
              <span class="muted" style="font-weight:400">near you</span>
            </strong>
            <button class="chip mobile-only" data-action="filters">
              ${renderIcon("filter")}Filters
            </button>
            <select id="sort" class="sort" aria-label="Sort listings">
              <option value="recommended" ${appState.sort === "recommended" ? "selected" : ""}>
                Recommended
              </option>
              <option value="price-up" ${appState.sort === "price-up" ? "selected" : ""}>
                Price: low to high
              </option>
              <option value="price-down" ${appState.sort === "price-down" ? "selected" : ""}>
                Price: high to low
              </option>
              <option value="rating" ${appState.sort === "rating" ? "selected" : ""}>
                Highest rated
              </option>
            </select>
            <div class="switcher">
              ${renderButton("view-list", "List", "grid", !mapMode ? "active" : "")}${renderButton("view-map", "Map", "map", mapMode ? "active" : "")}
            </div>
          </div>
          ${
            appState.category !== "All" || appState.query
              ? /* HTML */ `<div class="filterbar">
                  <span class="chip active">${escapeHtml(appState.query || appState.category)}</span
                  >${renderButton("reset-filters", "Clear filters", "close", "link small")}
                </div>`
              : ""
          }${
            status === "idle" || status === "loading"
              ? '<p class="muted" role="status">Loading listings…</p>'
              : status === "error"
                ? `<p role="alert">${escapeHtml(appState.publicListingsError)}</p>`
                : mapMode
                  ? `<div class="product-grid">${list.map(renderPublicListingCard).join("")}</div><p class="state-line mt28">Map locations are not yet available for published listings.</p>`
                  : list.length
                    ? `<div class="product-grid">${list.map(renderPublicListingCard).join("")}</div><p class="state-line mt28">You are viewing all listings that match your filters.</p>`
                    : /* HTML */ `<div class="empty">
                    <div class="empty-icon">${renderIcon("search")}</div>
                    <h2>We could not find that item.</h2>
                    <p>Try another search, a broader category or a higher price limit.</p>
                    ${renderButton("reset-filters", "View all listings", "arrow")}
                  </div>`
          }
        </section>
      </div>`,
  );
}

/** Apply catalogue filters to the real API response (prices are stored in cents). */
function getFilteredPublicListings() {
  let list = appState.publicListings.filter((p) => {
    const price = Number(p.price_per_day || 0) / 100;
    return (appState.category === "All" || p.category === appState.category) &&
      price <= appState.maxPrice &&
      (!appState.query || [p.title, p.category, p.description].join(" ").toLocaleLowerCase("en").includes(appState.query.toLocaleLowerCase("en"))) &&
      (!appState.location || String(p.location || "").toLocaleLowerCase("en").includes(appState.location.toLocaleLowerCase("en")) || appState.location.toLowerCase() === "zagreb and nearby") &&
      p.is_available === true &&
      (!appState.verifiedOnly || p.owner?.is_verified === true);
  });
  if (appState.sort === "price-up") list.sort((a, b) => a.price_per_day - b.price_per_day);
  if (appState.sort === "price-down") list.sort((a, b) => b.price_per_day - a.price_per_day);
  return list;
}

/** Backend listings do not have the demo catalogue's images, ratings or reviews. */
function renderPublicListingCard(p) {
  const id = encodeURIComponent(String(p.id));
  const title = escapeHtml(p.title || "Untitled listing");
  const category = escapeHtml(p.category || "");
  const location = escapeHtml(p.location || "Location not specified");
  return `<article class="product-card">
    <div class="product-photo"><a href="#/product/api-${id}" aria-label="View ${title}">
      <img src="assets/images/calculator.svg" alt="No listing photo available" loading="lazy" />
    </a></div>
    <div class="product-info"><div class="loc">${renderIcon("pin")}${location} · ${category}</div>
      <a href="#/product/api-${id}"><h3>${title}</h3></a>
      <div class="product-meta"><span><b>${formatCurrency(Number(p.price_per_day || 0) / 100)}</b> <small>/ day</small></span></div>
    </div>
  </article>`;
}
