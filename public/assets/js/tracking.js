/* Consent-gated analytics. No requests are made until IDs are configured
   and the visitor accepts analytics. */
(function () {
  "use strict";
  var cfg = window.ICONIC_TRACKING || {};
  var hasIds = !!(cfg.ga4 || cfg.gtm || cfg.clarity);
  if (!hasIds) return;

  var KEY = "iconic-analytics-consent";
  var stored = "";
  try { stored = localStorage.getItem(KEY) || ""; } catch (e) {}
  var loaded = false;

  function dataLayerPush(obj) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(obj);
  }
  function track(name, params) {
    if (!loaded) return;
    dataLayerPush(Object.assign({ event: name }, params || {}));
    if (window.gtag) window.gtag("event", name, params || {});
  }
  function load() {
    if (loaded) return;
    loaded = true;
    dataLayerPush({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    if (cfg.gtm) {
      var g = document.createElement("script");
      g.async = true;
      g.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(cfg.gtm);
      document.head.appendChild(g);
    }
    if (cfg.ga4 && !cfg.gtm) {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(cfg.ga4);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", cfg.ga4, { anonymize_ip: true });
    }
    if (cfg.clarity) {
      var c = document.createElement("script");
      c.async = true;
      c.src = "https://www.clarity.ms/tag/" + encodeURIComponent(cfg.clarity);
      document.head.appendChild(c);
    }
  }
  function save(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }
  function banner() {
    var el = document.createElement("div");
    el.className = "cookie-banner";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "Analytics consent");
    el.innerHTML = '<p><b>Analytics cookies</b> help us understand how the store is used. Essential storage is always on; analytics is optional. Read our <a href="privacy.html">privacy policy</a>.</p>' +
      '<div class="cookie-banner__actions"><button type="button" class="btn btn--sm" data-consent="accept">Accept analytics</button>' +
      '<button type="button" class="btn btn--ghost btn--sm" data-consent="reject">Essential only</button></div>';
    document.body.appendChild(el);
    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-consent]");
      if (!b) return;
      var choice = b.getAttribute("data-consent");
      save(choice);
      el.remove();
      if (choice === "accept") load();
    });
  }

  if (stored === "accept") load();
  else if (stored !== "reject") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", banner);
    else banner();
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[href^='tel:'],a[href*='wa.me']");
    if (a) track("contact_click", { method: a.getAttribute("href").indexOf("tel:") === 0 ? "phone" : "whatsapp" });
    var cart = e.target.closest("[data-open-cart]");
    if (cart) track("cart_open");
    var checkout = e.target.closest("[data-checkout-link],a[href*='checkout.html']");
    if (checkout) track("checkout_start");
  }, true);

  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || !f.id) return;
    if (f.id === "contact-form") track("contact_submit");
    if (f.id === "checkout-form" || f.id === "place-order") track("checkout_submit");
    if (f.id === "review-form") track("review_submit");
  }, true);
})();
