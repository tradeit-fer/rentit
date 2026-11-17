/**
 * @file scripts/pages/member-profile.js
 * Page template: member profile. Keep presentation here and data operations in the core/service layer.
 */
"use strict";

/**
 * Render the member profile screen using the shared RentIt design system.
 * @param {*} publicView See docs/ARCHITECTURE.md for data flow and page variants.
 * @returns {string} HTML for this view.
 */
function renderProfilePage(publicView = false) {
  const name = publicView
    ? "Marko Kovač"
    : escapeHtml(getFullName());
  const content = /* HTML */ `<div class="profile-banner"></div>
    <div class="profile-header">
      ${renderAvatar(publicView ? "marko" : "me", "large")}
      <div>
        <h1>${name}</h1>
        <p>${renderIcon("pin")} ${publicView ? "Zagreb · Member since 2024." : escapeHtml(appState.profile.city || "City not provided")}</p>
      </div>
      ${publicView ? renderLink("messages", "Send message", "chat", "btn light small") : renderLink("settings", "View details", "edit", "btn light small")}
    </div>
    <div class="two-col mt28">
      <aside class="stack">
        <div class="card">
          <span class="eyebrow">${publicView ? "OWNER & RENTER" : "YOUR PROFILE"}</span>
          ${publicView ? `<div class="profile-facts">` : ""}
            ${publicView ? `<div>
              <b>4.9</b>
              <span>Average rating</span>
            </div>
            <div>
              <b>${publicView ? "32" : "12"}</b>
              <span>Reviews</span>
            </div>
            <div>
              <b>${publicView ? "48" : "18"}</b>
              <span>Rentals</span>
            </div>` : ""}
          ${publicView ? "</div>" : ""}
          <h4 class="mt20">A little about me</h4>
          <p class="small mt12">
            ${publicView ? "Photography, outdoor trips and small home projects. I love things having more than one user. Get in touch if you have any questions about the equipment." : escapeHtml(appState.profile.bio || "No bio provided yet.")}
          </p>
          ${!publicView ? `<hr />
          <div class="stack small">
            <div>${renderIcon("mail")} ${escapeHtml(appState.profile.email || "Email not provided")}</div>
            <div>${renderIcon("check")} ${escapeHtml(appState.profile.phone || "Phone not provided")}</div>
            ${appState.profile.display_name ? `<div>Display name: ${escapeHtml(appState.profile.display_name)}</div>` : ""}
          </div>` : ""}
          ${!publicView ? renderLink("verification", "Identity verification settings", "arrow", "link small mt20") : ""}
        </div>
      </aside>
      <section class="stack">
        <div class="card">
          <div class="between mb20">
            <h3>Community experiences</h3>
            ${publicView ? `<span class="stars small">★★★★★</span>` : ""}
          </div>
          ${publicView ? `<div class="tabs">
            <button class="tab active" data-action="host-reviews">As an owner</button>
            <button class="tab" data-action="renter-reviews">As a renter</button>
          </div>` : ""}
          <div id="profile-reviews">
            ${(publicView ? appState.reviews : [])
              .map(
                (r) =>
                  /* HTML */ `<div class="review-block">
                    <div class="host-mini">
                      ${renderAvatar("me")}
                      <div>
                        <h4>${escapeHtml(getFirstName() || "You")} · camera rental</h4>
                        <p>${"★".repeat(r.rating)}</p>
                      </div>
                    </div>
                    <p>${escapeHtml(r.text)}</p>
                  </div>`,
              )
              .join("")}${publicView ? renderSampleReviews() : `<p class="small">Reviews are not available from the profile API yet.</p>`}
          </div>
        </div>
        <div>
          <div class="section-head">
            <h2 style="font-size:21px">${publicView ? "Marko's listings" : "My listings"}</h2>
            ${renderLink(publicView ? "explore" : "listings", "All listings", "arrow", "link")}
          </div>
          <div class="product-grid" style="grid-template-columns:repeat(2,minmax(0,1fr))">
            ${publicView ? [sampleListings[0], sampleListings[2]].map(renderListingCard).join("") : `<p class="small">Your listings are not available from the profile API yet.</p>`}
          </div>
        </div>
      </section>
    </div>`;
  return publicView
    ? renderPublicLayout(
        /* HTML */ `<div class="breadcrumbs">
            <a href="#/explore">Explore</a>${renderIcon("chevron")}<span>Owner profile</span>
          </div>
          ${content}`,
      )
    : renderAccountLayout(
        `${renderPageHeading("My profile", "Your place in a community that shares.")}${content}`,
      );
}
