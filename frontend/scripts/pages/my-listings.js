/** My listings — real, authenticated account listings from GET /api/v2/listings. */
"use strict";

function renderMyListingsPage() {
  const status = appState.ownListingsStatus;
  const listings = appState.ownListings;
  const content = !isSignedIn()
    ? '<p class="muted">Sign in to view your listings.</p>'
    : status === "loading" || status === "idle"
      ? '<p class="muted">Loading your listings…</p>'
      : status === "error"
        ? `<p role="alert">${escapeHtml(appState.ownListingsError)}</p>`
        : !listings.length
          ? '<p class="muted">You have not published any listings yet.</p>'
          : `<div class="table-scroll"><table>
              <thead><tr><th>Item</th><th>Price / day</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>${listings.map((p) => /* HTML */ `<tr>
                <td><div class="flex">
                  <div><div class="table-name">${escapeHtml(p.title || "Untitled listing")}</div>
                  <div class="table-sub">${escapeHtml(p.category || "")}</div></div>
                </div></td>
                <td>${formatCurrency(Number(p.price_per_day || 0) / 100)}</td>
                <td>${renderBadge(p.is_available ? "Active" : "Unavailable", p.is_available ? "" : "gray")}</td>
                <td><span class="small muted">Editing unavailable</span></td>
              </tr>`).join("")}</tbody></table></div>`;
  return renderAccountLayout(
    /* HTML */ `${renderPageHeading("My listings", "Your things could be someone else's next great plan.", renderLink("new-listing", "New listing", "plus", "btn small"))}
      <div class="grid3">
        ${renderStatisticCard("My listings", status === "loaded" ? String(listings.length) : "—", "box")}
        ${renderStatisticCard("Views this month", "—", "eye")}
        ${renderStatisticCard("Rental earnings", "—", "wallet")}
      </div>
      <section class="section-card mt28">
        <div class="section-card-head"><h3>All listings</h3></div>
        <div style="padding: 18px 24px">${content}</div>
      </section>
      <div class="notice mt28">${renderIcon("info")}
        <p><b>A great listing starts with a great photo.</b> Show the item from several angles,
        include accessories and describe its condition honestly.</p>
      </div>`,
  );
}
