/** DOM integration tests. Run `npm install` once, then `npm test`. No browser is started. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, VirtualConsole } = require("jsdom");
const root = path.resolve(__dirname, "..");
// `fetchImpl` stands in for the backend; by default the session check never answers.
function createApp(saved, fetchImpl) {
  const errors = [];
  const consoleBridge = new VirtualConsole();
  consoleBridge.on("jsdomError", (e) => errors.push(e.message));
  const dom = new JSDOM(fs.readFileSync(path.join(root, "index.html"), "utf8"), {
    url: "https://rentit.example/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
    virtualConsole: consoleBridge,
  });
  const w = dom.window;
  w.scrollTo = () => {};
  w.fetch = fetchImpl || (() => new Promise(() => {}));
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.URL.createObjectURL = () => "blob:sample-image";
  if (saved) w.localStorage.setItem("rentit.frontend.v1", saved);
  const context = dom.getInternalVMContext();
  for (const tag of w.document.querySelectorAll("script[src]")) {
    const source = tag.getAttribute("src");
    new vm.Script(fs.readFileSync(path.join(root, source), "utf8"), {
      filename: source,
    }).runInContext(context);
  }
  const evaluate = (s) => vm.runInContext(s, context);
  function route(p) {
    w.history.replaceState(null, "", "#/" + p);
    evaluate("renderCurrentRoute()");
  }
  function submit(selector) {
    const form = w.document.querySelector(selector);
    assert.ok(form, selector);
    form.dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
  }
  function click(selector) {
    const el = w.document.querySelector(selector);
    assert.ok(el, selector);
    el.click();
  }
  function field(selector, value) {
    const el = w.document.querySelector(selector);
    assert.ok(el, selector);
    if (el.type === "checkbox") el.checked = value;
    else el.value = value;
    return el;
  }
  return {
    dom,
    w,
    d: w.document,
    errors,
    evaluate,
    route,
    submit,
    click,
    field,
    close: () => dom.window.close(),
  };
}

test("all 35 routes and additional states render with valid local assets and labels", () => {
  const a = createApp();
  try {
    const routes = a.evaluate("screenGroups.flatMap(group=>group[1].map(row=>row[0]))");
    assert.equal(routes.length, 35);
    function check(label) {
      assert.ok(a.d.querySelector("main"), label + ": main");
      const ids = [...a.d.querySelectorAll("[id]")].map((el) => el.id);
      assert.equal(new Set(ids).size, ids.length, label + ": duplicate ids");
      for (const img of a.d.querySelectorAll("img")) {
        assert.ok(img.hasAttribute("alt"), label + ": image alt");
        const src = img.getAttribute("src");
        if (!/^(blob:|data:|https?:)/.test(src))
          assert.ok(fs.existsSync(path.join(root, src)), label + ": " + src);
      }
      for (const el of a.d.querySelectorAll("label[for]"))
        assert.ok(a.d.getElementById(el.htmlFor), label + ": label " + el.htmlFor);
      assert.doesNotMatch(a.d.querySelector("#app").textContent, /\b(?:undefined|NaN)\b/, label);
      assert.equal(a.d.querySelectorAll("en").length, 0, label + ": invalid translated hr");
      for (const el of a.d.querySelectorAll("a,button")) {
        const name =
          el.textContent.trim() ||
          el.getAttribute("aria-label") ||
          el.getAttribute("title") ||
          el.querySelector("img[alt]")?.alt;
        assert.ok(name, label + ": unnamed " + el.outerHTML.slice(0, 170));
      }
    }
    for (const route of routes) {
      a.route(route);
      check(route);
    }
    for (let step = 0; step < 4; step++) {
      a.evaluate("appState.listingStep=" + step);
      a.route("new-listing");
      check("wizard " + step);
    }
    for (const tab of ["profile", "security", "notifications", "privacy"]) {
      a.evaluate("appState.settingsTab=" + JSON.stringify(tab));
      a.route("settings");
      check("settings " + tab);
    }
    a.route("register");
    check("signup");
    assert.deepEqual(a.errors, []);
  } finally {
    a.close();
  }
});

test("English catalogue search, filters and persistent saved listings", () => {
  const a = createApp();
  try {
    a.field('[name="query"]', "camera");
    a.submit("#search-form");
    a.route("explore");
    assert.ok(a.d.querySelectorAll(".product-card").length > 0);
    assert.ok(
      a.evaluate(
        'getFilteredListings().every(p=>[p.name,p.category,p.desc].join(" ").toLowerCase().includes("camera"))',
      ),
    );
    a.click('[data-action="reset-filters"]');
    a.click('[data-action="save"][data-id="camera"]');
    assert.equal(a.evaluate('appState.saved.includes("camera")'), false);
    const b = createApp(a.w.localStorage.getItem("rentit.frontend.v1"));
    try {
      assert.equal(b.evaluate('appState.saved.includes("camera")'), false);
    } finally {
      b.close();
    }
  } finally {
    a.close();
  }
});

test("booking rejects reversed dates and calculates the configured platform fee", () => {
  const a = createApp();
  try {
    a.route("product/camera");
    a.field("#date-start", "2026-11-20");
    a.field("#date-end", "2026-11-19");
    a.submit("#product-booking-form");
    assert.equal(a.w.location.hash, "#/product/camera");
    assert.equal(a.evaluate("updateBookingPrice()"), null);
    a.field("#date-end", "2026-11-23");
    a.submit("#product-booking-form");
    assert.equal(a.w.location.hash, "#/booking/camera");
    a.route("booking/camera");
    const result = a.evaluate("updateBookingPrice()");
    assert.equal(result.days, 3);
    assert.equal(result.total, 82.5);
    assert.equal(result.fee, 7.5);
    a.field('[name="terms"]', true);
    a.submit("#checkout-form");
    assert.equal(a.w.location.hash, "#/booking-success");
  } finally {
    a.close();
  }
});

test("listing wizard requires authentication to publish", () => {
  const a = createApp();
  try {
    a.route("new-listing");
    a.field("#listing-title", "Weekend camera kit");
    a.field("#listing-description", "A clean camera kit with two lenses and a protective carrying case.");
    a.submit("#listing-form");
    assert.equal(a.evaluate("appState.listingStep"), 1);
    a.submit("#listing-form");
    assert.equal(a.evaluate("appState.listingStep"), 1);
    a.click('[data-action="sample-photos"]');
    a.submit("#listing-form");
    a.field("#listing-price", "20");
    a.submit("#listing-form");
    a.field('[name="listing-terms"]', true);
    a.submit("#listing-form");
    assert.equal(a.evaluate("appState.ownListings.length"), 0);
  } finally {
    a.close();
  }
});

test("My listings loads paginated backend results and filters by owner", async () => {
  const mine = {id: 1, title: "Calculator", price_per_day: 500, category: "Learning", is_available: true, owner: {id: "user-a"}};
  const other = {id: 2, title: "Not mine", price_per_day: 300, category: "Tools", is_available: true, owner: {id: "user-b"}};
  const urls = [];
  const a = createApp(null, async (url) => {
    urls.push(String(url));
    if (String(url).includes("/api/v2/listings?")) return {ok: true, json: async () => [mine, other]};
    return new Promise(() => {});
  });
  try {
    a.evaluate('setSignedInUser({id:"user-a",name:"Test User",email:"test@example.com"})');
    a.route("listings");
    for (let i = 0; i < 10 && a.evaluate('appState.ownListingsStatus') !== 'loaded'; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    assert.equal(a.evaluate('appState.ownListingsStatus'), 'loaded');
    assert.equal(a.evaluate('appState.ownListings.length'), 1);
    assert.match(a.d.querySelector('#app').textContent, /Calculator/);
    assert.doesNotMatch(a.d.querySelector('#app').textContent, /Not mine/);
    assert.ok(urls.some((url) => url.includes('page=1&limit=100')));
  } finally {
    a.close();
  }
});

test("messages treat typed HTML as text and persist it", () => {
  const a = createApp();
  try {
    a.route("messages");
    const value = '<img src=x onerror="alert(1)"> Hello!';
    a.field('[name="message"]', value);
    a.submit("#message-form");
    assert.equal(a.d.querySelectorAll('#chat-body img[src="x"]').length, 0);
    assert.ok(a.d.querySelector("#chat-body").textContent.includes(value));
    assert.equal(a.evaluate("appState.messages.at(-1).text"), value);
  } finally {
    a.close();
  }
});

test("return requires evidence and confirmations before opening a review", () => {
  const a = createApp();
  try {
    a.route("return");
    a.submit("#handover-form");
    assert.equal(a.evaluate("appState.returnDone"), false);
    a.click('[data-action="sample-photos"]');
    for (const name of ["equipment1", "equipment2", "equipment3", "condition"])
      a.field('[name="' + name + '"]', true);
    a.submit("#handover-form");
    assert.equal(a.evaluate("appState.returnDone"), true);
    assert.ok(a.d.querySelector('[role="dialog"]'));
    a.route("review");
    a.click('[data-action="rate"][data-rating="4"]');
    a.field('[name="text"]', "An easy rental and friendly pickup.");
    a.submit("#review-form");
    assert.equal(a.evaluate("appState.reviews.at(-1).rating"), 4);
  } finally {
    a.close();
  }
});

test("support requests and admin outcomes retain entered content", () => {
  const a = createApp();
  try {
    a.route("tickets/new");
    a.field('[name="ticket-title"]', "Pickup time needs updating");
    a.field('[name="description"]', "I would like to arrange a later pickup with the owner.");
    a.field('[name="ticket-terms"]', true);
    a.submit("#ticket-form");
    assert.equal(a.evaluate("appState.tickets.at(-1).title"), "Pickup time needs updating");
    a.route("tickets/current");
    assert.ok(a.d.querySelector("#app").textContent.includes("Pickup time needs updating"));
    a.route("admin/ticket/TI-0248");
    const option = a.d.querySelector("#decision option:nth-child(3)").value;
    a.field("#decision", option);
    a.field('[name="reason"]', "Both members have agreed to the revised pickup arrangement.");
    a.submit("#admin-decision-form");
    assert.equal(a.evaluate("appState.adminDecision"), option);
  } finally {
    a.close();
  }
});

test("screen directory, dialog Escape and skip link work without losing the route", () => {
  const a = createApp();
  try {
    a.route("dashboard");
    a.click(".skip-link");
    assert.equal(a.w.location.hash, "#/dashboard");
    assert.equal(a.d.activeElement.id, "main");
    a.click('[data-action="screens"]');
    assert.equal(a.d.querySelectorAll("[data-screen-link]").length, 35);
    a.d.dispatchEvent(new a.w.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    assert.equal(a.d.querySelector('[role="dialog"]'), null);
  } finally {
    a.close();
  }
});

// ---- Signed-in member from GET /api/v1/auth/me -------------------------------------------------
// The app starts an auth check on load that fails in jsdom (no fetch); wait for it to settle first.
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
async function createAppAs(user) {
  const a = createApp();
  await settle();
  a.evaluate(user ? `setSignedInUser(${JSON.stringify(user)})` : "setSignedOut()");
  return a;
}
const ana = { id: "u1", name: "Ana Horvat", email: "ana@example.com", role: "user" };

test("signed-in member sees their own name, initials and email instead of sample data", async () => {
  const a = await createAppAs(ana);
  try {
    a.route("dashboard");
    assert.equal(a.d.querySelector(".header .nav-right .avatar").textContent.trim(), "AH");
    assert.equal(a.d.querySelector(".user-meta .avatar").textContent.trim(), "AH");
    assert.equal(a.d.querySelector(".user-meta h4").textContent.trim(), "Ana Horvat");
    assert.equal(a.d.querySelector(".user-meta p").textContent.trim(), "Personal account");
    assert.match(a.d.querySelector("h1").textContent, /Hi, Ana\./);
    a.route("profile");
    assert.equal(a.d.querySelector(".profile-header h1").textContent.trim(), "Ana Horvat");
    a.route("verification");
    assert.match(a.d.body.textContent, /ana@example\.com/);
    for (const route of ["dashboard", "profile", "settings", "payments", "messages", "tickets/current"]) {
      a.route(route);
      const text = a.d.body.textContent;
      assert.ok(!/Ivan|ivan\.petrovic/.test(text), route + ": sample member still visible");
      assert.ok(!/\bIP\b/.test([...a.d.querySelectorAll(".avatar")].map((e) => e.textContent.trim()).join(" ")), route + ": IP avatar");
    }
    assert.deepEqual(a.errors, []);
  } finally {
    a.close();
  }
});

test("nobody signed in shows a Sign in button and no member name", async () => {
  const a = await createAppAs(null);
  try {
    a.route("explore");
    const link = a.d.querySelector('.header .nav-right a[href="#/login"]');
    assert.ok(link, "Sign in link in header");
    assert.equal(link.textContent.trim(), "Sign in");
    assert.equal(a.d.querySelector(".header .nav-right .avatar"), null);
    a.route("dashboard");
    assert.equal(a.d.querySelector(".user-meta h4").textContent.trim(), "Not signed in");
    assert.equal(a.d.querySelector('[data-action="logout"]'), null);
    assert.ok(a.d.querySelector('.sidebar a[href="#/login"]'), "Sign in link in sidebar");
    assert.ok(!/Ivan/.test(a.d.body.textContent));
  } finally {
    a.close();
  }
});

test("while the session is being checked the header shows neutral placeholders", async () => {
  const a = createApp();
  await settle();
  try {
    a.evaluate('appState.auth = { status: "loading", user: null }; renderCurrentRoute()');
    assert.equal(a.d.querySelector('.header .nav-right a[href="#/login"]'), null);
    assert.equal(a.d.querySelector(".header .nav-right .avatar").textContent.trim(), "");
    a.route("dashboard");
    assert.equal(a.d.querySelector(".user-meta h4").textContent.trim(), "");
    assert.ok(!/Not signed in/.test(a.d.body.textContent));
  } finally {
    a.close();
  }
});

test("administration is offered only to members with the admin role", async () => {
  const user = await createAppAs(ana);
  try {
    user.route("dashboard");
    assert.equal(user.d.querySelector('.sidebar a[href="#/admin"]'), null);
  } finally {
    user.close();
  }
  const admin = await createAppAs({ ...ana, name: "Pavao Admin", role: "admin" });
  try {
    admin.route("dashboard");
    assert.ok(admin.d.querySelector('.sidebar a[href="#/admin"]'));
    admin.route("admin");
    assert.equal(admin.d.querySelector(".user-meta h4").textContent.trim(), "Pavao Admin");
    assert.equal(admin.d.querySelector(".user-meta p").textContent.trim(), "Administrator");
  } finally {
    admin.close();
  }
});

test("logout clears the signed-in member and returns to sign in", async () => {
  const a = await createAppAs(ana);
  try {
    a.evaluate("authService.logout = async () => {}");
    a.route("dashboard");
    a.click('[data-action="logout"]');
    await settle();
    assert.equal(a.evaluate("appState.auth.status"), "anonymous");
    assert.equal(a.evaluate("appState.profile.first"), "");
    assert.equal(a.w.location.hash, "#/login");
  } finally {
    a.close();
  }
});

test("initials and unusual names are handled safely", async () => {
  const a = await createAppAs(null);
  try {
    const initials = (n) => a.evaluate(`getInitials(${JSON.stringify(n)})`);
    assert.equal(initials("Ana Horvat"), "AH");
    assert.equal(initials("Madonna"), "MA");
    assert.equal(initials("  šime   Đurić  "), "ŠĐ");
    assert.equal(initials("Ana Maria Horvat"), "AH");
    assert.equal(initials(""), "");
    a.evaluate('setSignedInUser({ id: "x", name: "", email: "no.name@example.com", role: "user" })');
    assert.equal(a.evaluate("appState.profile.first"), "no.name");
    a.evaluate('setSignedInUser({ id: "x", name: "<img src=x onerror=1> Horvat", email: "e@example.com", role: "user" })');
    a.route("dashboard");
    assert.equal(a.d.querySelector(".user-meta img"), null);
    assert.equal(a.d.querySelector(".header img.avatar"), null);
    assert.ok(a.d.querySelector(".user-meta h4").textContent.includes("<img"));
  } finally {
    a.close();
  }
});

test("the session check on load fills in the member, or shows Sign in", async () => {
  const wait = () => new Promise((resolve) => setTimeout(resolve, 20));
  const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
  const requests = [];
  const ok = createApp(undefined, async (url, options) => {
    requests.push([url, options]);
    return reply(200, ana)();
  });
  try {
    await wait();
    assert.equal(ok.d.querySelector(".header .nav-right .avatar").textContent.trim(), "AH");
    assert.match(requests[0][0], /\/api\/v2\/me$/);
    assert.equal(requests[0][1].credentials, "include");
  } finally {
    ok.close();
  }
  for (const impl of [
    reply(401, { detail: "Not authenticated" }),
    async () => {
      throw new Error("network down");
    },
  ]) {
    const a = createApp(undefined, impl);
    try {
      await wait();
      assert.equal(a.d.querySelector('.header .nav-right a[href="#/login"]').textContent.trim(), "Sign in");
      assert.equal(a.evaluate("appState.auth.status"), "anonymous");
    } finally {
      a.close();
    }
  }
});


test("v2 profile data fills optional fields and does not show fake verification or profile statistics", async () => {
  const a = await createAppAs({
    id: "u2", name: "Mia Novak", email: "mia@example.com", role: "user",
    display_name: "Mia N", phone: "+385123456", city: "Split", bio: "Hello from Split",
  });
  try {
    a.route("profile");
    const text = a.d.querySelector("main").textContent;
    assert.match(text, /Mia Novak/);
    assert.match(text, /Split/);
    assert.match(text, /Hello from Split/);
    assert.match(text, /\+385123456/);
    assert.doesNotMatch(text, /Identity verified|Phone number verified|Member since 2025|Average rating/);
    a.route("settings");
    assert.match(a.d.querySelector("main").textContent, /Mia N/);
    assert.equal(a.d.querySelector("#settings-form"), null);
  } finally { a.close(); }
});
