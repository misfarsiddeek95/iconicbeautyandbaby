/* ============================================================
   Iconic Beauty & Baby — prototype interactions
   Vanilla JS, no build step. Everything here is demo behaviour:
   the cart lives in localStorage, there is no backend.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Data ---------- */
  var CATALOG = window.ICONIC_CATALOG || { products: [], brands: [], categories: [] };
  var PRODUCTS = CATALOG.products;
  var CAT_LABELS = {}, CATEGORY_META = {};
  CATALOG.categories.forEach(function (c) {
    CAT_LABELS[c.key] = c.label;
    CATEGORY_META[c.key] = { label: c.label, chip: c.chip, desc: c.desc, img: c.img, count: c.count, hidden: !!c.hidden,
      types: c.types.map(function (t) { return { key: t.key, label: t.label, count: t.count }; }) };
  });
  var BRANDS = CATALOG.brands;
  function byBrand(id) { for (var i = 0; i < BRANDS.length; i++) if (BRANDS[i].id === id) return BRANDS[i]; return null; }
  function brandName(id) { var b = byBrand(id); return b ? b.name : ""; }
  function brandLabel(id) {
    if (id === "Iconic") return "Other / unbranded";
    return brandName(id) || "Other / unbranded";
  }
  /* Real catalogue: no invented ratings, reviews, ingredients or expiry dates. */
  function pdpContent(p) { return (p && p.content) || {}; }

  var FREE_SHIPPING = 10000; /* LKR placeholder: set the real free-delivery threshold */
  var CART_KEY = "iconic-cart";
  var WISH_KEY = "iconic-wish";

  /* ---------- Helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function money(n) { n = Math.round(n * 100) / 100; return "Rs " + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
  function byId(id) { for (var i = 0; i < PRODUCTS.length; i++) if (PRODUCTS[i].id === id) return PRODUCTS[i]; return null; }

  /* Clean static URLs. Generated pages live in products/ and categories/ and
     set <base href="../">, so these relative paths resolve from anywhere. */
  function productHref(pOrId) {
    var id = typeof pOrId === "string" ? pOrId : (pOrId && pOrId.id);
    return "/products/" + id;
  }
  function categoryHref(cat) { return "/categories/" + cat; }
  function imgTag(name, alt, cls) {
    var isBrand = /^brand-/.test(name);
    var w = isBrand ? 200 : 600, h = isBrand ? 200 : 600;
    return '<img' + (cls ? ' class="' + cls + '"' : '') + ' src="/assets/img/' + name + '.svg" alt="' + esc(alt || "") + '" width="' + w + '" height="' + h + '" loading="lazy" decoding="async">';
  }

  /* ---------- Product variants ----------
     Every product is normalised to carry a variants array, so the cart,
     cards and checkout always have one code path. Simple products get a
     single implicit "default" variant; variable products carry real
     option groups and per-variant price, was-price, image, SKU and stock. */
  function normalizeProduct(p) {
    p.options = p.options || [];
    var raw = (p.variants && p.variants.length) ? p.variants : [{
      vid: "default", label: p.size, price: p.price, was: p.was,
      stock: p.stock == null ? 60 : p.stock, sku: "ICN-" + p.id.toUpperCase()
    }];
    p.variants = raw.map(function (v) {
      var out = {
        vid: String(v.vid || "default"),
        label: v.label || v.vid || p.size,
        price: Number(v.price != null ? v.price : p.price),
        was: Number(v.was || 0),
        img: v.img || p.img,
        sku: v.sku || ("ICN-" + p.id.toUpperCase()),
        stock: Number(v.stock == null ? 60 : v.stock),
        opts: v.opts || {}
      };
      out.price = Math.round(out.price * 100) / 100;
      out.was = Math.round(out.was * 100) / 100;
      return out;
    });
    p.variable = p.options.length > 0;
    p.brand = p.brand || "Iconic";

    var prices = p.variants.map(function (v) { return v.price; });
    p.minPrice = Math.min.apply(null, prices);
    p.maxPrice = Math.max.apply(null, prices);
    p.totalStock = p.variants.reduce(function (n, v) { return n + Math.max(0, v.stock); }, 0);
    p.bestDiscount = p.variants.reduce(function (n, v) {
      var d = v.was > v.price ? Math.round((1 - v.price / v.was) * 100) : 0;
      return Math.max(n, d);
    }, 0);
    return p;
  }
  PRODUCTS.forEach(normalizeProduct);

  function defaultVariant(p) {
    if (!p) return null;
    for (var i = 0; i < p.variants.length; i++) if (p.variants[i].stock > 0) return p.variants[i];
    return p.variants[0] || null;
  }
  function variantOf(p, vid) {
    if (!p) return null;
    if (!vid || vid === "default") return defaultVariant(p);
    for (var i = 0; i < p.variants.length; i++) if (p.variants[i].vid === String(vid)) return p.variants[i];
    return defaultVariant(p);
  }
  function inStock(v) { return !!v && v.stock > 0; }
  function priceInfo(p) {
    if (!p.variable) return { price: p.price, was: p.was, from: false };
    return { price: p.minPrice, was: 0, from: p.minPrice !== p.maxPrice };
  }
  function discount(p) { return p.variable ? p.bestDiscount : (p.was ? Math.round((1 - p.price / p.was) * 100) : 0); }
  function lineKey(id, vid) { return id + "::" + (vid || "default"); }
  function parseLineKey(key) {
    var i = String(key).indexOf("::");
    if (i < 0) return { id: String(key), vid: "default" };
    return { id: String(key).slice(0, i), vid: String(key).slice(i + 2) || "default" };
  }
  function lineProduct(l) { return byId(l && l.id); }
  function lineVariant(l) { var p = lineProduct(l); return p ? variantOf(p, l && l.vid) : null; }
  function lineUnitPrice(l) { var v = lineVariant(l); return v ? v.price : 0; }

  function starSVG(fill) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.5 6.1 20.6l1.2-6.5L2.5 9.5l6.6-.9z"/></svg>';
  }
  function stars(rating) {
    var out = '<span class="stars" role="img" aria-label="' + rating + ' out of 5">';
    for (var i = 1; i <= 5; i++) {
      out += '<span style="opacity:' + (rating >= i - 0.25 ? 1 : 0.22) + '">' + starSVG() + "</span>";
    }
    return out + "</span>";
  }

  function dealLabel(p) {
    var seed = 0;
    for (var i = 0; i < p.id.length; i++) seed += p.id.charCodeAt(i);
    var days = 3 + (seed % 4), hrs = (seed * 7) % 24, mins = (seed * 13) % 60;
    return days + "d " + String(hrs).padStart(2, "0") + "h " + String(mins).padStart(2, "0") + "m";
  }

  function cardHTML(p) {
    var d = discount(p), info = priceInfo(p), soldOut = p.totalStock === 0;
    var price = (info.from ? '<span class="price__from">From</span> ' : "") + money(info.price);
    var was = (info.was && info.was > info.price) ? "<del>" + money(info.was) + "</del>" : "";
    var cta = soldOut
      ? '<button type="button" class="pcard__cta pcard__cta--out" disabled>Sold out</button>'
      : p.variable
        ? '<button type="button" class="pcard__cta" data-choose="' + p.id + '">Choose options</button>'
        : '<button type="button" class="pcard__cta" data-add="' + p.id + '">Add to bag</button>';
    var shadeGroup = null;
    p.options.forEach(function (g) { if (g.type === "shade") shadeGroup = g; });
    var swatches = shadeGroup ? '<div class="pcard__swatches" aria-label="Available shades">' + shadeGroup.values.slice(0, 6).map(function (v) {
      return '<span class="pcard__swatch" style="background:' + v.swatch + '" title="' + esc(v.label) + '"></span>';
    }).join("") + "</div>" : "";
    var sizeTxt = p.variable ? (p.options.length + (p.options.length === 1 ? " option" : " options")) : (p.size || "");
    return '' +
      '<article class="pcard' + (p.variable ? " pcard--variable" : "") + '" data-cat="' + p.cats.join(" ") + '" data-price="' + info.price + '" data-rating="' + p.rating + '" data-id="' + p.id + '">' +
        '<div class="pcard__media">' +
          '<a class="pcard__img" href="' + productHref(p) + '" aria-label="' + esc(p.name) + '">' + imgTag(p.img, p.name) + "</a>" +
          (soldOut ? '<span class="pcard__badge pcard__badge--out">Sold out</span>' : d ? '<span class="pcard__badge">-' + d + "%</span>" : "") +
          '<button type="button" class="pcard__wish" data-wish="' + p.id + '" aria-label="Save ' + esc(p.name) + ' to wishlist" aria-pressed="false">' + heartIcon() + "</button>" +
          '<div class="pcard__actions">' +
            '<button type="button" class="icon-btn" data-quick="' + p.id + '" aria-label="Quick view ' + esc(p.name) + '">' + eyeIcon() + "</button>" +
            '<button type="button" class="icon-btn" data-compare="' + p.id + '" aria-label="Add ' + esc(p.name) + ' to compare" aria-pressed="false">' + compareIcon() + "</button>" +
          "</div>" +
        "</div>" +
        '<div class="pcard__body">' +
          '<span class="pcard__brand">' + esc(brandName(p.brand)) + "</span>" +
          '<h3 class="pcard__title"><a href="' + productHref(p) + '">' + esc(p.name) + "</a></h3>" +
          (sizeTxt ? '<span class="pcard__size">' + esc(sizeTxt) + "</span>" : "") +
          swatches +
          '<div class="pcard__price">' + price + was + "</div>" +
          cta +
        "</div>" +
      "</article>";
  }

  function compareIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M4 12h16M4 17h7"/><path d="M17 5l3 3-3 3"/></svg>'; }

  function clockIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'; }
  function eyeIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>'; }
  function heartIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 3.4c0 5-7.5 9.6-7.5 9.6z"/></svg>'; }
  function plusIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'; }

  /* ---------- Cart ---------- */
  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]") || []; } catch (e) { cart = []; }
  if (!Array.isArray(cart)) cart = [];

  // Normalise older {id, qty} carts into variant-aware lines.
  cart = cart.filter(function (l) { return l && byId(l.id); }).map(function (l) {
    var p = byId(l.id);
    var vid = l.vid || "default";
    if (p.variable && !p.variants.some(function (v) { return v.vid === String(vid); })) vid = defaultVariant(p).vid;
    if (!p.variable) vid = "default";
    return { id: l.id, vid: String(vid), qty: Math.max(1, parseInt(l.qty, 10) || 1) };
  });

  function saveCart() { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (e) {} }
  function cartCount() { return cart.reduce(function (n, l) { return n + l.qty; }, 0); }
  function cartTotal() {
    return cart.reduce(function (n, l) { return n + lineUnitPrice(l) * l.qty; }, 0);
  }

  function addToCart(id, qty, vid) {
    var p = byId(id); if (!p) return;
    var v = variantOf(p, vid);
    if (!v) return;
    if (v.stock <= 0) { toast(p.name + " — that option is sold out"); return; }
    var key = lineKey(p.id, v.vid), line = null;
    for (var i = 0; i < cart.length; i++) if (lineKey(cart[i].id, cart[i].vid) === key) line = cart[i];
    var add = Math.max(1, parseInt(qty, 10) || 1);
    if (line) line.qty = Math.min(line.qty + add, v.stock);
    else cart.push({ id: p.id, vid: v.vid, qty: Math.min(add, v.stock) });
    saveCart(); renderCart();
    toast(p.name + (p.variable ? " · " + v.label : "") + " added to cart");
    openCart();
  }
  function setQty(key, qty) {
    var ref = parseLineKey(key);
    for (var i = 0; i < cart.length; i++) {
      if (lineKey(cart[i].id, cart[i].vid) !== key) continue;
      var v = lineVariant(cart[i]);
      var max = v ? v.stock : 99;
      cart[i].qty = Math.max(0, Math.min(qty, max));
      if (cart[i].qty < 1) cart.splice(i, 1);
      break;
    }
    saveCart(); renderCart();
  }
  function removeLine(key) {
    cart = cart.filter(function (l) { return lineKey(l.id, l.vid) !== key; });
    saveCart(); renderCart();
  }

  function renderCart() {
    var count = cartCount();
    $$("[data-cart-count]").forEach(function (el) { el.textContent = count; });
    $$("[data-cart-total]").forEach(function (el) { el.textContent = money(cartTotal()); });

    var body = $("#cart-body");
    if (!body) return;
    if (!cart.length) {
      body.innerHTML = '<div class="drawer__empty">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.55L20.5 8H6"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/></svg>' +
        "<p>Your bag is empty — let's fix that.</p>" +
        '<a class="btn btn--dark btn--sm" href="/shop">Shop all products</a></div>';
    } else {
      body.innerHTML = cart.map(function (l) {
        var p = lineProduct(l), v = lineVariant(l); if (!p || !v) return "";
        var key = lineKey(p.id, v.vid);
        return '<div class="line-item" data-line="' + key + '">' +
          '<div class="line-item__media"><img src="/assets/img/' + v.img + '.svg" alt=""></div>' +
          "<div>" +
            '<p class="line-item__title"><a href="' + productHref(p) + '">' + esc(p.name) + "</a></p>" +
            '<p class="line-item__meta">' + esc(p.variable ? v.label : p.size) + " · " + money(v.price) + "</p>" +
            '<div class="line-item__row">' +
              '<div class="qty"><button type="button" data-dec="' + key + '" aria-label="Decrease quantity">−</button><span>' + l.qty + '</span><button type="button" data-inc="' + key + '" aria-label="Increase quantity">+</button></div>' +
              '<span class="line-item__price">' + money(v.price * l.qty) + "</span>" +
            "</div>" +
            '<button type="button" class="line-item__remove" data-remove="' + key + '">Remove</button>' +
          "</div>" +
        "</div>";
      }).join("");
    }

  }

  function openCart() {
    var d = $("#cart-drawer"), b = $("#backdrop");
    if (!d) return;
    closeMobile(); closeOffers();
    cartReturnFocus = document.activeElement;
    d.removeAttribute("inert");
    d.classList.add("is-open"); d.setAttribute("aria-hidden", "false");
    if (b) b.classList.add("is-open");
    document.body.classList.add("is-locked");
    var cf = d.querySelector("[data-close-cart], button, a");
    if (cf) setTimeout(function () { cf.focus(); }, 60);
  }
  var cartReturnFocus = null;
  function closeCart() {
    var d = $("#cart-drawer");
    if (!d) return;
    var wasOpen = d.classList.contains("is-open");
    d.classList.remove("is-open"); d.setAttribute("aria-hidden", "true");
    d.setAttribute("inert", "");
    refreshOverlayState();
    if (wasOpen && cartReturnFocus && document.contains(cartReturnFocus)) { try { cartReturnFocus.focus(); } catch (e) {} }
  }

  /* Unlock the page only when no overlay is still visible, and drop the
     shared scrim once neither side drawer is showing. */
  function refreshOverlayState() {
    var b = $("#backdrop");
    var drawerOpen = !!document.querySelector(".drawer.is-open");
    var searchOpen = !!document.querySelector(".search-pop.is-open");
    if (b && !drawerOpen && !searchOpen) b.classList.remove("is-open");
    if (!drawerOpen &&
        !searchOpen &&
        !document.querySelector(".modal.is-open") &&
        !document.querySelector(".popup.is-open")) {
      document.body.classList.remove("is-locked");
    }
  }

  function closeSearch() {
    var searchPop = $("#search-pop");
    if (!searchPop) return;
    searchPop.classList.remove("is-open");
    searchPop.setAttribute("aria-hidden", "true");
    searchPop.setAttribute("inert", "");
    var searchBackdrop = $("#search-backdrop");
    if (searchBackdrop) searchBackdrop.classList.remove("is-open");
    refreshOverlayState();
  }

  /* ---------- Top offers drawer ---------- */
  function offerCardHTML(p) {
    var info = priceInfo(p);
    var price = (info.from ? '<span class="price__from">From</span> ' : "") + money(info.price) +
      (info.was ? "<del>" + money(info.was) + "</del>" : "");
    var action = p.variable
      ? '<button type="button" class="offer-card__add" data-choose="' + p.id + '" aria-label="Choose options for ' + p.name + '">' + plusIcon() + "</button>"
      : '<button type="button" class="offer-card__add" data-add="' + p.id + '" aria-label="Add ' + p.name + ' to cart">' + plusIcon() + "</button>";
    return '<article class="offer-card" data-id="' + p.id + '">' +
      '<a class="offer-card__media" href="' + productHref(p) + '" aria-label="' + p.name + '">' +
        '<img loading="lazy" src="/assets/img/' + p.img + '.svg" alt="' + p.name + '">' +
        '<span class="offer-card__badge">-' + discount(p) + "%</span>" +
      "</a>" +
      '<h4 class="offer-card__title"><a href="' + productHref(p) + '">' + p.name + "</a></h4>" +
      '<div class="offer-card__meta">' + (p.reviews ? stars(p.rating) + "<small>(" + p.reviews + ")</small>" : "") + "</div>" +
      '<div class="offer-card__foot">' +
        '<span class="price">' + price + "</span>" + action +
      "</div>" +
    "</article>";
  }

  function renderOffers() {
    var body = $("#offers-grid");
    if (!body) return;
    var list = PRODUCTS.filter(function (p) { return discount(p) > 0 && p.totalStock > 0; })
      .sort(function (a, b) { return discount(b) - discount(a) || b.reviews - a.reviews; })
      .slice(0, 10);
    body.innerHTML = list.length ? list.map(offerCardHTML).join("") : '<p class="empty-state">No offers right now. Items appear here as soon as a sale price is set.</p>';
    $$("[data-offers-count]").forEach(function (el) { el.textContent = list.length; el.hidden = !list.length; });
  }

  function openOffers() {
    var d = $("#offers-drawer"), b = $("#backdrop");
    if (!d) return;
    closeCart(); closeMobile(); closeModal(); closeSearch();
    offersReturnFocus = document.activeElement;
    d.removeAttribute("inert");
    d.classList.add("is-open"); d.setAttribute("aria-hidden", "false");
    if (b) b.classList.add("is-open");
    document.body.classList.add("is-locked");
    var of = d.querySelector("[data-close-offers], button, a"); if (of) setTimeout(function () { of.focus(); }, 60);
    $$("[data-open-offers]").forEach(function (t) { t.setAttribute("aria-expanded", "true"); });
  }
  var offersReturnFocus = null;
  function closeOffers() {
    var d = $("#offers-drawer");
    if (!d) return;
    var oWas = d.classList.contains("is-open");
    d.classList.remove("is-open"); d.setAttribute("aria-hidden", "true"); d.setAttribute("inert", "");
    if (oWas && offersReturnFocus && document.contains(offersReturnFocus)) { try { offersReturnFocus.focus(); } catch (e) {} }
    $$("[data-open-offers]").forEach(function (t) { t.setAttribute("aria-expanded", "false"); });
    refreshOverlayState();
  }

  /* ---------- Wishlist ---------- */
  var wish = [];
  try { wish = JSON.parse(localStorage.getItem(WISH_KEY) || "[]") || []; } catch (e) { wish = []; }
  wish = wish.filter(function (id) { return !!byId(id); });
  function toggleWish(id, btn) {
    var i = wish.indexOf(id);
    if (i > -1) { wish.splice(i, 1); }
    else { wish.push(id); toast("Saved to your wishlist"); }
    try { localStorage.setItem(WISH_KEY, JSON.stringify(wish)); } catch (e) {}
    var on = wish.indexOf(id) > -1;
    if (btn) markWish(btn, on);
    $$('[data-wish="' + id + '"]').forEach(function (b) { markWish(b, on); });
    $$("[data-wish-count]").forEach(function (el) { el.textContent = wish.length; });
    if ($("#wishlist-grid")) renderWishlistPage();
    if ($("#account-view") && !$("#account-view").hidden) {
      renderWishInto("#account-wishlist", 4);
      renderWishInto("#account-overview-wish", 2);
      var sw = $("[data-stat-wish]"); if (sw) sw.textContent = wish.length;
    }
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function toast(msg) {
    var el = $("#toast");
    if (!el) return;
    el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5"/></svg><span>' + msg + "</span>";
    el.classList.add("is-open");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-open"); }, 2600);
  }

  /* ---------- Grids ---------- */
  /* Ranking rules (no sales or review data exists yet, so they use what the stock report has):
     Most loved  = most units on hand among branded beauty lines (a stand-in until sales data is available)
     Just landed = newest stock codes (CO numbers are issued in order)
     On offer    = products with a sale price below the regular price */
  var SHOWCASE = ["skin-care", "hair-care", "makeup", "fragrance", "body-and-bath", "baby-and-mother"];
  function isShowcase(p) { return !!p.brand && SHOWCASE.indexOf(p.cats[0]) > -1 && p.totalStock > 0; }
  function lovedList(list) { return list.filter(isShowcase).sort(function (a, b) { return b.totalStock - a.totalStock || a.order - b.order; }); }
  function landedList(list) { return list.filter(isShowcase).sort(function (a, b) { return b.landed - a.landed || b.order - a.order; }); }
  function offerList(list) { return list.filter(function (p) { return discount(p) > 0 && p.totalStock > 0; }).sort(function (a, b) { return discount(b) - discount(a); }); }
  function productsFor(key) {
    if (!key || key === "featured" || key === "loved") return lovedList(PRODUCTS);
    if (key === "new" || key === "landed") return landedList(PRODUCTS);
    if (key === "best") return PRODUCTS.filter(function (p) { return p.totalStock > 0; }).sort(function (a, b) { return b.totalStock - a.totalStock; });
    if (key === "offer") return offerList(PRODUCTS);
    return PRODUCTS.filter(function (p) { return p.cats.indexOf(key) > -1 && p.totalStock > 0; }).sort(function (a, b) { return (b.brand ? 1 : 0) - (a.brand ? 1 : 0) || b.totalStock - a.totalStock; });
  }

  function renderHomeRows() {
    $$("[data-cat-row]").forEach(function (host) {
      var limit = parseInt(host.getAttribute("data-limit") || "8", 10);
      var tones = ["", "cat-item--sage", "cat-item--rose", "cat-item--lilac", "cat-item--sand"];
      host.innerHTML = CATALOG.categories.filter(function (c) { return !c.hidden && c.key !== "other"; }).slice(0, limit).map(function (c, i) {
        return '<a class="cat-item ' + tones[i % 5] + '" href="' + categoryHref(c.key) + '"><span class="cat-item__circle">' + imgTag(c.img, "") + '</span><span class="cat-item__name">' + esc(c.label) + '</span><span class="cat-item__count">' + c.count + " products</span></a>";
      }).join("");
    });
    $$("[data-brand-row]").forEach(function (host) {
      var limit = parseInt(host.getAttribute("data-limit") || "40", 10);
      host.innerHTML = BRANDS.slice(0, limit).map(function (b) {
        var n = PRODUCTS.filter(function (p) { return p.brand === b.id; }).length;
        return '<a class="brand-card" href="/brand-' + b.id + '"><span class="brand-card__logo"><img src="/assets/img/brand-' + b.id + '.svg" alt="" width="200" height="200" loading="lazy"></span>' +
          '<span class="brand-card__name">' + esc(b.name) + '</span><span class="brand-card__count">' + n + (n === 1 ? " product" : " products") + "</span></a>";
      }).join("") + '<a class="brand-card brand-card--all" href="/brands"><span class="brand-card__all">See all ' + BRANDS.length + ' brands <span aria-hidden="true">→</span></span></a>';
      var wrap = host.closest("[data-brand-slider]");
      if (!wrap) return;
      var prev = $("[data-brand-prev]", wrap), next = $("[data-brand-next]", wrap);
      function sync() {
        var max = host.scrollWidth - host.clientWidth - 2;
        if (prev) { prev.disabled = host.scrollLeft <= 2; }
        if (next) { next.disabled = host.scrollLeft >= max; }
      }
      if (prev) prev.addEventListener("click", function () { host.scrollBy({ left: -host.clientWidth * 0.85, behavior: "smooth" }); });
      if (next) next.addEventListener("click", function () { host.scrollBy({ left: host.clientWidth * 0.85, behavior: "smooth" }); });
      host.addEventListener("scroll", function () { window.requestAnimationFrame(sync); }, { passive: true });
      host.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight") { e.preventDefault(); host.scrollBy({ left: host.clientWidth * 0.5, behavior: "smooth" }); }
        if (e.key === "ArrowLeft") { e.preventDefault(); host.scrollBy({ left: -host.clientWidth * 0.5, behavior: "smooth" }); }
      });
      window.addEventListener("resize", sync); setTimeout(sync, 60);
    });
  }

  function renderGrids() {
    $$("[data-grid]").forEach(function (el) {
      var key = el.getAttribute("data-grid");
      var limit = parseInt(el.getAttribute("data-limit") || "7", 10);
      var list = productsFor(key).slice(0, limit);
      el.innerHTML = list.length ? list.map(cardHTML).join("") : '<div class="empty-state">' + (el.getAttribute("data-empty") || "Nothing here yet.") + "</div>";
    });
  }

  /* ---------- Countdowns ---------- */
  var cdTargets = [];
  function initCountdowns() {
    cdTargets = $$("[data-cd]").map(function (el) {
      var hrs = parseFloat(el.getAttribute("data-cd")) || 24;
      return { el: el, end: Date.now() + hrs * 3600 * 1000 };
    });
    tickCountdowns();
    setInterval(tickCountdowns, 1000);
  }
  function tickCountdowns() {
    cdTargets.forEach(function (t) {
      var diff = Math.max(0, t.end - Date.now());
      var d = Math.floor(diff / 86400000),
          h = Math.floor(diff / 3600000) % 24,
          m = Math.floor(diff / 60000) % 60,
          s = Math.floor(diff / 1000) % 60;
      var units = t.el.querySelectorAll("[data-u]");
      if (units.length === 4) {
        units[0].textContent = d; units[1].textContent = String(h).padStart(2, "0");
        units[2].textContent = String(m).padStart(2, "0"); units[3].textContent = String(s).padStart(2, "0");
      }
    });
  }

  /* ---------- Header ---------- */
  function initHeader() {
    var header = $(".site-header");
    if (header) {
      var onScroll = function () { header.classList.toggle("is-stuck", window.scrollY > 8); };
      window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
    }

    // Mega menus: keep aria-expanded in sync and support Escape dismissal.
    $$(".nav-item--has-mega").forEach(function (item) {
      var trigger = item.querySelector(".nav-link");
      if (!trigger) return;
      var set = function (open) { trigger.setAttribute("aria-expanded", open ? "true" : "false"); };
      item.addEventListener("mouseenter", function () {
        item.classList.remove("is-mega-dismissed");
        set(true);
      });
      item.addEventListener("mouseleave", function () {
        if (!item.contains(document.activeElement)) set(false);
      });
      item.addEventListener("focusin", function (e) {
        // A dismissed menu stays closed until the user leaves or hovers again.
        if (e.target === trigger && item.classList.contains("is-mega-dismissed")) return;
        item.classList.remove("is-mega-dismissed");
        set(true);
      });
      item.addEventListener("focusout", function (e) {
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove("is-mega-dismissed");
          set(false);
        }
      });
      item.addEventListener("keydown", function (e) {
        if (e.key !== "Escape") return;
        var open = trigger.getAttribute("aria-expanded") === "true" ||
                   item.matches(":hover") || item.contains(document.activeElement);
        if (!open) return;
        e.preventDefault();
        e.stopPropagation();
        item.classList.add("is-mega-dismissed");
        set(false);
        trigger.focus();
      });
    });
    $$("[data-open-cart]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); closeSearch(); openCart(); }); });
    $$("[data-close-cart]").forEach(function (b) { b.addEventListener("click", closeCart); });
    $$("[data-open-offers]").forEach(function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openOffers(); }); });
    $$("[data-close-offers]").forEach(function (b) { b.addEventListener("click", closeOffers); });
    var backdrop = $("#backdrop");
    if (backdrop) backdrop.addEventListener("click", function () { closeCart(); closeMobile(); closeOffers(); });

    var searchReturnFocus = null;
    var searchPop = $("#search-pop");
    var searchBackdrop = $("#search-backdrop");
    var openSearch = function () {
      if (!searchPop) return;
      closeCart(); closeModal(); closeMobile(); closeOffers();
      searchPop.removeAttribute("inert");
      searchPop.classList.add("is-open");
      searchPop.setAttribute("aria-hidden", "false");
      if (searchBackdrop) searchBackdrop.classList.add("is-open");
      document.body.classList.add("is-locked");
      var inp = $("#search-input"); if (inp) { inp.value = ""; searchReturnFocus = document.activeElement; setTimeout(function () { inp.focus(); }, 120); }
      renderSearch("");
    };
    if (searchBackdrop) searchBackdrop.addEventListener("click", closeSearch);
    $$("[data-open-search]").forEach(function (b) { b.addEventListener("click", openSearch); });
    $$("[data-close-search]").forEach(function (b) { b.addEventListener("click", closeSearch); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeCart(); closeSearch(); closeModal(); closeMobile(); closePopup(); closeOffers(); }
      if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); openSearch(); }
      if (e.key === "Tab") {
        var open = $(".drawer.is-open, .modal.is-open, .search-pop.is-open, .popup.is-open, .lightbox:not([hidden])");
        if (!open) return;
        var f = $$("a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])", open)
          .filter(function (el) { return el.offsetParent !== null; });
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var si = $("#search-input");
    if (si) si.addEventListener("input", function () { renderSearch(si.value); });
    var sform = $("#search-form");
    if (sform) sform.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = (si ? si.value : "").trim();
      if (v) location.href = "/shop?q=" + encodeURIComponent(v);
    });
    var hdrSearch = $(".search__input");
    if (hdrSearch) hdrSearch.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); openSearch(); } });
    var sc = $("#search-cat");
    if (sc) sc.addEventListener("change", function () { renderSearch(si ? si.value : ""); });

    // mobile
    var mt = $("[data-open-mobile]");
    if (mt) mt.addEventListener("click", function () { closeSearch(); openMobile(); });
    $$("[data-close-mobile]").forEach(function (b) { b.addEventListener("click", closeMobile); });
    $$("#mobile-menu a").forEach(function (a) { a.addEventListener("click", closeMobile); });
  }


  /* ---------- Search matching: word forms, synonyms, small typos ---------- */
  var SEARCH_SYN = {
    shaving: ["shave"], shaver: ["shave"], nappy: ["diaper", "baby"], nappies: ["diaper", "baby"], diapers: ["diaper"],
    lipstick: ["lip"], lipgloss: ["lip"], gloss: ["lip"], perfume: ["fragrance", "spray", "attar"], parfum: ["fragrance"],
    cologne: ["fragrance"], deodorant: ["deo", "roll"], facewash: ["face wash", "cleanser"], cleanser: ["face wash"],
    moisturiser: ["moisturizer", "cream", "lotion"], moisturizer: ["cream", "lotion"], sunscreen: ["sun", "spf"], sunblock: ["sun", "spf"],
    dye: ["hair colour", "colour"], colour: ["color"], color: ["colour"], earring: ["jewellery"], jewelry: ["jewellery"], bangle: ["bangles"],
    kids: ["baby"], infant: ["baby"], newborn: ["baby"], mascara: ["eye"], kajal: ["eye", "kohl"], kohl: ["kajal"], tonic: ["toner"]
  };
  function qStem(w) {
    if (w.length > 5 && /ing$/.test(w)) return w.slice(0, -3);
    if (w.length > 4 && /ies$/.test(w)) return w.slice(0, -3) + "y";
    if (w.length > 4 && /(es|ed)$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && /s$/.test(w)) return w.slice(0, -1);
    return w;
  }
  function near(a, b) { /* edit distance <= 1 */
    if (Math.abs(a.length - b.length) > 1) return false;
    var i = 0, j = 0, miss = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue; }
      if (++miss > 1) return false;
      if (a.length > b.length) i++; else if (a.length < b.length) j++; else { i++; j++; }
    }
    return miss + (a.length - i) + (b.length - j) <= 1;
  }
  var HAY_CACHE = {};
  function productHay(p) {
    if (!HAY_CACHE[p.id]) {
      var t = (p.name + " " + p.desc + " " + p.cats.join(" ") + " " + p.types.join(" ") + " " + brandName(p.brand) + " " +
        (p.searchTerms || "") + " " + p.variants.map(function (v) { return v.label + " " + v.sku; }).join(" ")).toLowerCase();
      HAY_CACHE[p.id] = { text: t, words: t.split(/[^a-z0-9']+/).filter(function (x) { return x.length > 3; }) };
    }
    return HAY_CACHE[p.id];
  }
  function searchScore(p, q) {
    var words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return 1;
    var h = productHay(p), name = p.name.toLowerCase(), total = 0;
    for (var i = 0; i < words.length; i++) {
      var w = words[i], opts = [w, qStem(w)].concat(SEARCH_SYN[w] || []), best = 0;
      for (var k = 0; k < opts.length && !best; k++) {
        var o = opts[k], at = h.text.indexOf(o);
        if (at > -1) best = name.indexOf(o) === 0 ? 5 : name.indexOf(o) > -1 ? 4 : 2;
      }
      if (!best && w.length >= 5) {
        for (var m = 0; m < h.words.length; m++) { if (near(w, h.words[m])) { best = 1; break; } }
      }
      if (!best) return 0; /* every word must match */
      total += best;
    }
    return total;
  }

  function renderSearch(q) {
    var box = $("#search-results");
    if (!box) return;
    q = (q || "").trim().toLowerCase();
    var catSel = $("#search-cat");
    var cat = catSel ? catSel.value : "";
    var scored = PRODUCTS.map(function (p) {
      var score = searchScore(p, q);
      if (cat && p.cats.indexOf(cat) === -1) score = 0;
      return { p: p, score: score };
    }).filter(function (x) { return x.score > 0 || !q; });
    scored.sort(function (a, b) { return b.score - a.score || (b.p.totalStock || 0) - (a.p.totalStock || 0); });
    var list = scored.slice(0, 8).map(function (x) { return x.p; });
    if (!list.length) {
      box.innerHTML = '<p class="search-empty" role="status">No results for “' + esc(q) + '”. Check the spelling, or try a shorter word such as “cream”, “shampoo” or “baby”.</p>' +
        '<p class="search-empty">Or browse: ' + Object.keys(CAT_LABELS).slice(0, 6).map(function (k) { return '<a class="link-underline" href="' + categoryHref(k) + '">' + esc(CAT_LABELS[k]) + "</a>"; }).join(" · ") + "</p>";
      return;
    }
    box.setAttribute("aria-live", "polite");
    box.innerHTML = (q ? "" : '<p class="search-results__label">Popular right now</p>') + list.map(function (p) {
      var info = priceInfo(p);
      var meta = [brandName(p.brand), CAT_LABELS[p.cats[0]] || ""].filter(Boolean).join(" · ");
      return '<a href="' + productHref(p) + '" class="search-result">' +
        '<span class="search-result__media">' + imgTag(p.img, "") + "</span>" +
        '<span class="search-result__body"><span class="search-result__name">' + esc(p.name) + "</span>" +
        '<span class="search-result__meta">' + esc(meta) + "</span></span>" +
        '<span class="price">' + (info.from ? "From " : "") + money(info.price) + "</span></a>";
    }).join("") + '<a class="search-all" href="/shop' + (q ? "?q=" + encodeURIComponent(q) : "") + '">' + (q ? "See all results" : "Browse the full shop") + ' <span aria-hidden="true">→</span></a>';
  }

  /* ---------- Quick view ---------- */
  function quickVariant(p, v) {
    var host = $("#qv-options");
    if (!host) return;
    if (!p.variable) { host.hidden = true; host.innerHTML = ""; }
    else {
      host.hidden = false;
      var group = p.options[0];
      var values = (group && group.values) || [];
      host.innerHTML = '<p class="qv-options__label">' + (group ? group.label : "Option") + ': <b>' + v.label + "</b></p>" +
        '<div class="qv-options__row">' + values.map(function (val) {
          var sv = null;
          p.variants.forEach(function (x) { if (x.vid === val.vid) sv = x; });
          var sw = val.swatch ? '<span class="qv-swatch" style="background:' + val.swatch + '"></span>' : "";
          return '<button type="button" class="qv-option' + (val.vid === v.vid ? " is-on" : "") + (sv && sv.stock <= 0 ? " is-out" : "") + '" data-qv-opt="' + val.vid + '">' + sw + val.label + "</button>";
        }).join("") + "</div>";
      $$("#qv-options [data-qv-opt]").forEach(function (b) {
        b.addEventListener("click", function () {
          var next = variantOf(p, b.getAttribute("data-qv-opt"));
          if (next) quickVariant(p, next);
        });
      });
    }
    $("#qv-img").src = "/assets/img/" + v.img + ".svg";
    $("#qv-size").textContent = p.variable ? v.label : p.size;
    $("#qv-price").innerHTML = money(v.price) + (v.was ? "<del>" + money(v.was) + "</del>" : "");
    var add = $("#qv-add");
    if (add) {
      add.setAttribute("data-add", p.id);
      if (p.variable) add.setAttribute("data-vid", v.vid); else add.removeAttribute("data-vid");
      add.disabled = v.stock <= 0;
      add.textContent = v.stock <= 0 ? "Sold out" : "Add to cart";
    }
    var stock = $("#qv-stock");
    if (stock) {
      stock.textContent = v.stock > 0
        ? (v.stock <= 8 ? "Only " + v.stock + " left" : "In stock") + " · " + v.sku
        : "Sold out · " + v.sku;
      stock.className = "qv-stock" + (v.stock <= 0 ? " is-out" : "");
    }
  }
  function openQuick(id) {
    var p = byId(id); if (!p) return;
    var m = $("#quickview");
    if (!m) return;
    $("#qv-name").textContent = p.name;
    $("#qv-desc").textContent = p.desc;
    var qvb = $("#qv-brand");
    if (qvb) qvb.textContent = brandName(p.brand).toUpperCase();
    $("#qv-link").href = productHref(p);
    quickVariant(p, defaultVariant(p));
    closeCart(); closeMobile(); closeOffers();
    m.classList.add("is-open"); document.body.classList.add("is-locked");
  }
  function closeModal() {
    var m = $("#quickview");
    if (m) m.classList.remove("is-open");
    refreshOverlayState();
  }

  /* ---------- Mobile menu ---------- */
  function openMobile() {
    var m = $("#mobile-menu"), b = $("#backdrop");
    if (!m) return;
    closeCart(); closeOffers(); closeSearch();
    m.classList.add("is-open");
    m.setAttribute("aria-hidden", "false");
    if (b) b.classList.add("is-open");
    document.body.classList.add("is-locked");
    mobileReturnFocus = document.activeElement;
    m.removeAttribute("inert");
    var first = m.querySelector("a, button");
    if (first) setTimeout(function () { first.focus(); }, 60);
  }
  var mobileReturnFocus = null;
  function closeMobile() {
    var m = $("#mobile-menu");
    var mWasOpen = m && m.classList.contains("is-open");
    if (m) { m.classList.remove("is-open"); m.setAttribute("aria-hidden", "true"); m.setAttribute("inert", ""); }
    refreshOverlayState();
    if (mWasOpen && mobileReturnFocus && document.contains(mobileReturnFocus)) { try { mobileReturnFocus.focus(); } catch (e) {} }
  }

  /* ---------- Welcome popup ---------- */
  var POPUP_KEY = "iconic-popup-off";

  function closePopup() {
    var p = $("#popup");
    if (!p) return;
    p.classList.remove("is-open");
    p.setAttribute("aria-hidden", "true");
    refreshOverlayState();
  }

  function initPopup() {
    var p = $("#popup");
    if (!p) return;
    // Never show the welcome modal on mobile/tablet; it is too intrusive there.
    if (window.matchMedia && window.matchMedia("(max-width: 860px)").matches) return;

    var remembered = false;
    try { remembered = localStorage.getItem(POPUP_KEY) === "1"; } catch (e) {}
    // ?nopopup=1 keeps the welcome offer down (deep links, screenshots, tests).
    if (/[?&]nopopup=1/.test(window.location.search) || window.location.hash === "#nopopup") {
      try { sessionStorage.setItem("iconic-popup-seen", "1"); } catch (e) {}
      return;
    }
    if (remembered) return;

    // Show the welcome offer once per browsing session unless explicitly dismissed.
    var seen = false;
    try { seen = sessionStorage.getItem("iconic-popup-seen") === "1"; } catch (e) {}
    if (seen) return;

    p.setAttribute("aria-hidden", "true");
    var shown = false;
    var show = function () {
      if (shown || remembered) return;
      shown = true;
      try { sessionStorage.setItem("iconic-popup-seen", "1"); } catch (e) {}
      p.classList.add("is-open");
      p.setAttribute("aria-hidden", "false");
      document.body.classList.add("is-locked");
      var email = $("#popup-email");
      if (email) setTimeout(function () { email.focus(); }, 320);
    };
    // Offer it after real engagement: 25% scroll, 25 s on the page, or exit intent. Never on checkout/cart/account.
    if (/\/(checkout|cart|account|order-confirmation)\/?$/.test(location.pathname)) return;
    var onScroll = function () {
      var h = document.documentElement;
      if ((h.scrollTop + window.innerHeight) / h.scrollHeight > 0.45) { window.removeEventListener("scroll", onScroll); show(); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    setTimeout(show, 25000);
    document.addEventListener("mouseout", function (e) { if (!e.relatedTarget && e.clientY < 8) show(); });

    $$("[data-close-popup]").forEach(function (b) {
      b.addEventListener("click", function () {
        var chk = $("#popup-dismiss");
        if (chk && chk.checked) {
          remembered = true;
          try { localStorage.setItem(POPUP_KEY, "1"); } catch (e) {}
        }
        closePopup();
      });
    });

    var chk = $("#popup-dismiss");
    if (chk) chk.addEventListener("change", function () {
      try {
        if (chk.checked) localStorage.setItem(POPUP_KEY, "1");
        else localStorage.removeItem(POPUP_KEY);
      } catch (e) {}
    });

    var form = $("#popup-form");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = $("#popup-email"), err = $("#popup-error");
      var value = input ? input.value.trim() : "";
      if (!validEmail(value)) {
        if (err) {
          err.hidden = false;
          err.textContent = "Enter a valid email address, e.g. you@example.com";
        }
        if (input) input.focus();
        return;
      }
      if (err) err.hidden = true;
      try { localStorage.setItem("iconic-subscriber", value); } catch (e2) {}
      form.reset();
      closePopup();
      toast("You're on the list. This demo stores your sign-up in this browser.");
    });
  }

  /* ---------- Tabs ---------- */
  function initTabs() {
    $$("[data-tabs]").forEach(function (group) {
      var targetId = group.getAttribute("data-target");
      var target = targetId ? $(targetId) : null;
      $$(".tab", group).forEach(function (btn) {
        btn.addEventListener("click", function () {
          $$(".tab", group).forEach(function (b) { b.classList.remove("is-active"); });
          btn.classList.add("is-active");
          if (target) {
            var key = btn.getAttribute("data-key");
            target.innerHTML = productsFor(key).slice(0, 7).map(cardHTML).join("");
          }
        });
      });
    });
  }

  /* ---------- Hero slider ---------- */
  function initHero() {
    var slider = $("#hero-slider");
    if (!slider) return;
    var slides = $$(".hero-slide", slider);
    var dots = $$(".hero-dot", slider);
    var i = 0, timer, paused = false;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        s.classList.toggle("is-active", k === i);
        s.setAttribute("aria-hidden", k === i ? "false" : "true");
        if (k === i) s.removeAttribute("inert"); else s.setAttribute("inert", "");
      });
      dots.forEach(function (d, k) {
        d.classList.toggle("is-active", k === i);
        d.setAttribute("aria-selected", k === i ? "true" : "false");
      });
    }
    dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); restart(); }); });
    function restart() {
      clearInterval(timer);
      if (paused || reduce) return;
      timer = setInterval(function () { go(i + 1); }, 6500);
    }
    var pause = $("#hero-pause");
    if (pause) {
      if (reduce) { paused = true; pause.textContent = "Play"; }
      pause.addEventListener("click", function () {
        paused = !paused;
        pause.setAttribute("aria-pressed", paused ? "true" : "false");
        pause.textContent = paused ? "Play" : "Pause";
        if (paused) clearInterval(timer); else restart();
      });
    }
    restart(); go(0);
  }

  /* ---------- Carousel arrows ---------- */
  function initCarousels() {
    $$("[data-carousel]").forEach(function (wrap) {
      var track = $(".pcarousel", wrap);
      if (!track) return;
      $$("[data-scroll]", wrap).forEach(function (btn) {
        btn.addEventListener("click", function () {
          var dir = btn.getAttribute("data-scroll") === "next" ? 1 : -1;
          track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: "smooth" });
        });
      });
    });
  }

  /* ---------- Shop filters ---------- */
  function initFilterToggles() {
    $$("[data-toggle-filters]").forEach(function (btn) {
      var filters = btn.closest(".filters");
      if (!filters) return;
      btn.addEventListener("click", function () {
        var open = filters.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        btn.textContent = open ? "Hide" : "Show";
      });
    });
  }

  function initShop() {
    var grid = $("#shop-grid");
    if (!grid) return;
    var state = { cats: [], brands: [], price: "all", rating: 0, sizes: [], sort: "default", page: 1, per: 24 };
    var all = PRODUCTS.slice();

    function bucketOf(str) {
      var m = /([\d.]+)\s*(ml|g)\b/i.exec(str || "");
      if (!m) return "other";
      var v = parseFloat(m[1]);
      return v < 30 ? "small" : v < 100 ? "medium" : "large";
    }
    function variantSize(p, v) {
      if (p.variable && p.options[0] && p.options[0].type === "size") return v.label;
      return p.size;
    }
    function hasSizeBucket(p, bucket) {
      return p.variants.some(function (v) { return bucketOf(variantSize(p, v)) === bucket; });
    }

    /* Category filter, rendered from the catalogue so counts never go stale. */
    var catHost = $("#filter-cats");
    if (catHost) {
      catHost.innerHTML = Object.keys(CAT_LABELS).map(function (key) {
        var n = PRODUCTS.filter(function (p) { return p.cats.indexOf(key) > -1; }).length;
        return '<label class="check"><input type="checkbox" data-filter-cat="' + key + '"> ' + esc(CAT_LABELS[key]) + " <span>" + n + "</span></label>";
      }).join("");
    }

    /* Brand filter checkboxes, rendered from the brand registry. */
    var brandHost = $("#filter-brands");
    if (brandHost) {
      brandHost.innerHTML = BRANDS.map(function (b) {
        var n = PRODUCTS.filter(function (p) { return p.brand === b.id; }).length;
        return '<label class="check"><input type="checkbox" data-filter-brand="' + b.id + '"> ' + esc(b.name) + " <span>" + n + "</span></label>";
      }).join("");
    }

    /* Active filter chips reflect the current state and remove one filter. */
    var chipsHost = $("#active-filters");
    function renderChips() {
      if (!chipsHost) return;
      var chips = [];
      state.cats.forEach(function (c) { chips.push({ k: "cat", v: c, label: CAT_LABELS[c] }); });
      state.brands.forEach(function (b) { chips.push({ k: "brand", v: b, label: brandLabel(b) }); });
      if (state.rating) chips.push({ k: "rating", v: String(state.rating), label: state.rating + "★ & up" });
      if (state.price !== "all") {
        var pl = { "u1000": "Under Rs 1,000", "1000-3000": "Rs 1,000–3,000", "3000-6000": "Rs 3,000–6,000", "6000p": "Rs 6,000+" };
        chips.push({ k: "price", v: state.price, label: pl[state.price] || state.price });
      }
      state.sizes.forEach(function (s) {
        var sl = { small: "Under 30ml", medium: "30–60ml", large: "100ml+" };
        chips.push({ k: "size", v: s, label: sl[s] || s });
      });
      chipsHost.innerHTML = chips.length
        ? chips.map(function (c) {
            return '<button type="button" class="chip chip--removable" data-remove-filter="' + c.k + '" data-value="' + c.v + '">' + esc(c.label) + ' <span aria-hidden="true">×</span><span class="sr-only">Remove filter</span></button>';
          }).join("") + '<button type="button" class="chip chip--clear" id="chips-clear">Clear all</button>'
        : "";
    }
    if (chipsHost) chipsHost.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-remove-filter]");
      if (e.target.closest("#chips-clear")) {
        if (clear) clear.click();
        return;
      }
      if (!btn) return;
      var k = btn.getAttribute("data-remove-filter"), v = btn.getAttribute("data-value");
      if (k === "cat") state.cats = state.cats.filter(function (x) { return x !== v; });
      if (k === "brand") state.brands = state.brands.filter(function (x) { return x !== v; });
      if (k === "size") state.sizes = state.sizes.filter(function (x) { return x !== v; });
      if (k === "rating") state.rating = 0;
      if (k === "price") state.price = "all";
      syncInputs(); state.page = 1; apply();
    });

    function syncInputs() {
      $$("[data-filter-cat]").forEach(function (cb) { cb.checked = state.cats.indexOf(cb.getAttribute("data-filter-cat")) > -1; });
      $$("[data-filter-brand]").forEach(function (cb) { cb.checked = state.brands.indexOf(cb.getAttribute("data-filter-brand")) > -1; });
      $$("[data-filter-price]").forEach(function (r) { r.checked = r.value === state.price; });
      $$("[data-filter-rating]").forEach(function (r) { r.checked = parseFloat(r.value) === state.rating; });
      $$("[data-filter-size]").forEach(function (b) { b.classList.toggle("is-on", state.sizes.indexOf(b.getAttribute("data-filter-size")) > -1); });
    }

    function syncURL() {
      var p = new URLSearchParams();
      if (state.cats.length) p.set("cat", state.cats.join(","));
      if (state.brands.length) p.set("brand", state.brands.join(","));
      if (state.price !== "all") p.set("price", state.price);
      if (state.rating) p.set("rating", String(state.rating));
      if (state.sizes.length) p.set("size", state.sizes.join(","));
      if (state.sort !== "default") p.set("sort", state.sort);
      if (qParam) p.set("q", qParam);
      var qs = p.toString();
      try { history.replaceState(null, "", location.pathname + (qs ? "?" + qs : "")); } catch (e) {}
    }

    /* Deep links from the mega menu: category, price, collection, search and sale. */
    var params = new URLSearchParams(location.search);
    var catParam = (params.get("cat") || "").split(",").filter(function (c) { return CAT_LABELS[c]; });
    if (catParam.length) {
      state.cats = catParam;
      $$("[data-filter-cat]").forEach(function (cb) {
        cb.checked = state.cats.indexOf(cb.getAttribute("data-filter-cat")) > -1;
      });
    }
    var priceParam = params.get("price");
    if (["u1000", "1000-3000", "3000-6000", "6000p"].indexOf(priceParam) > -1) {
      state.price = priceParam;
      $$("[data-filter-price]").forEach(function (r) { r.checked = r.value === priceParam; });
    }
    var sortParam = params.get("sort");
    if (["low", "high", "rating", "name"].indexOf(sortParam) > -1) {
      state.sort = sortParam;
      var sortEl = $("#sort");
      if (sortEl) sortEl.value = sortParam;
    }
    var ratingParam = parseFloat(params.get("rating") || "0");
    if (ratingParam) state.rating = ratingParam;
    var sizeParam = (params.get("size") || "").split(",").filter(function (s) { return ["small", "medium", "large"].indexOf(s) > -1; });
    if (sizeParam.length) state.sizes = sizeParam;
    var qParam = (params.get("q") || "").trim().toLowerCase();
    if (qParam) {
      var ranked = all.map(function (p) { return { p: p, s: searchScore(p, qParam) }; }).filter(function (x) { return x.s > 0; });
      ranked.sort(function (a, b) { return b.s - a.s; });
      all = ranked.map(function (x) { return x.p; });
    }

    /* Deep link to a brand (brand pages and the mega menu link with ?b=). */
    var brandParam = (params.get("b") || params.get("brand") || "").split(",").filter(function (b) { return byBrand(b); });
    if (brandParam.length) {
      state.brands = brandParam.slice();
      $$("[data-filter-brand]").forEach(function (cb) {
        cb.checked = state.brands.indexOf(cb.getAttribute("data-filter-brand")) > -1;
      });
    }
    if (params.get("deal") === "1") all = all.filter(function (p) { return discount(p) > 0; });
    var collection = params.get("collection");
    if (collection === "bestsellers") state.sort = "bestsellers";
    if (collection === "top-rated") {
      state.sort = "rating";
      var sortTop = $("#sort"); if (sortTop) sortTop.value = "rating";
    }
    if (collection === "loved") all = lovedList(all);
    if (collection === "new" || collection === "landed") all = landedList(all);
    if (collection === "offer") all = offerList(all);

    var shopTitle = $("#shop-title"), shopDesc = $("#shop-desc");
    if (collection === "bestsellers" && shopTitle) {
      shopTitle.textContent = "Bestsellers";
      if (shopDesc) shopDesc.textContent = "Ranked by units on hand until sales data is connected.";
    } else if (collection === "top-rated" && shopTitle) {
      shopTitle.textContent = "Top rated";
      if (shopDesc) shopDesc.textContent = "The highest-scoring formulas in the range, according to verified reviews.";
    } else if (collection === "loved" && shopTitle) {
      shopTitle.textContent = "Most loved";
      if (shopDesc) shopDesc.textContent = "Our deepest-stocked branded lines, a stand-in for best sellers until sales data is connected.";
    } else if (collection === "offer" && shopTitle) {
      shopTitle.textContent = "On offer";
      if (shopDesc) shopDesc.textContent = "Products with a sale price below the regular price.";
    } else if ((collection === "new" || collection === "landed") && shopTitle) {
      shopTitle.textContent = "Just landed";
      if (shopDesc) shopDesc.textContent = "The newest stock codes on the shelf.";
    } else if (params.get("price") === "u1000" && shopTitle) {
      shopTitle.textContent = "Under Rs 1,000";
      if (shopDesc) shopDesc.textContent = "Everything in the range that costs less than Rs 1,000.";
    } else if (params.get("deal") === "1" && shopTitle) {
      shopTitle.textContent = "On sale";
      if (shopDesc) shopDesc.textContent = "Every formula currently reduced, while stock lasts.";
    } else if (state.brands.length === 1 && shopTitle) {
      shopTitle.textContent = brandName(state.brands[0]);
      if (shopDesc) shopDesc.textContent = "Everything currently on the shelf from " + brandName(state.brands[0]) + ".";
    } else if (qParam && shopTitle) {
      shopTitle.textContent = "Search: “" + params.get("q") + "”";
      if (shopDesc) shopDesc.textContent = "Results matching your search across names, categories and ingredients.";
    } else if (state.cats.length && shopTitle) {
      shopTitle.textContent = CAT_LABELS[state.cats[0]] || "Shop all";
      if (shopDesc) shopDesc.textContent = "Filtered to " + state.cats.map(function (c) { return CAT_LABELS[c].toLowerCase(); }).join(" and ") + ".";
    }

    function apply() {
      var list = all.filter(function (p) {
        if (state.cats.length && !state.cats.some(function (c) { return p.cats.indexOf(c) > -1; })) return false;
        if (state.brands.length && state.brands.indexOf(p.brand) === -1) return false;
        if (state.sizes.length && !state.sizes.some(function (b) { return hasSizeBucket(p, b); })) return false;
        if (state.rating && p.rating < state.rating) return false;
        if (state.instock && !p.variants.some(function (v) { return v.stock > 0; })) return false;
        var info = priceInfo(p);
        if (state.price === "u1000" && info.price >= 1000) return false;
        if (state.price === "1000-3000" && (info.price < 1000 || info.price >= 3000)) return false;
        if (state.price === "3000-6000" && (info.price < 3000 || info.price >= 6000)) return false;
        if (state.price === "6000p" && info.price < 6000) return false;
        return true;
      });
      if (state.sort === "low") list.sort(function (a, b) { return priceInfo(a).price - priceInfo(b).price; });
      if (state.sort === "high") list.sort(function (a, b) { return priceInfo(b).price - priceInfo(a).price; });
      if (state.sort === "rating") list.sort(function (a, b) { return b.rating - a.rating; });
      if (state.sort === "bestsellers") list.sort(function (a, b) { return b.totalStock - a.totalStock; });
      if (state.sort === "name") list.sort(function (a, b) { return a.name.localeCompare(b.name); });

      var shown = list.slice(0, state.page * state.per);
      grid.innerHTML = shown.length ? shown.map(cardHTML).join("")
        : '<div class="empty-state" role="status"><p><b>' + (qParam ? "No results for “" + esc(qParam) + "”" : "Nothing matches those filters") + '</b></p><p>' +
          (qParam ? "Check the spelling or try a shorter word." : "Try clearing a filter.") + '</p><p class="empty-state__links">' +
          Object.keys(CAT_LABELS).slice(0, 5).map(function (k) { return '<a class="link-underline" href="' + categoryHref(k) + '">' + esc(CAT_LABELS[k]) + "</a>"; }).join(" · ") + "</p></div>";
      var count = $("#shop-count");
      if (count) count.textContent = "Showing " + (shown.length ? "1–" + shown.length : "0") + " of " + list.length + " results";
      var more = $("#load-more");
      if (more) more.style.display = shown.length < list.length ? "inline-flex" : "none";
      renderChips();
      syncURL();
      $$("#shop-grid [data-compare]").forEach(function (b) { markCompare(b, isCompared(b.getAttribute("data-compare"))); });
      $$("#shop-grid [data-wish]").forEach(function (b) { markWish(b, wish.indexOf(b.getAttribute("data-wish")) > -1); });
    }

    $$("[data-filter-cat]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var v = cb.getAttribute("data-filter-cat");
        if (cb.checked) state.cats.push(v);
        else state.cats = state.cats.filter(function (c) { return c !== v; });
        state.page = 1; apply();
      });
    });
    $$("[data-filter-brand]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var v = cb.getAttribute("data-filter-brand");
        if (cb.checked) state.brands.push(v);
        else state.brands = state.brands.filter(function (b) { return b !== v; });
        state.page = 1; apply();
      });
    });
    $$("[data-filter-price]").forEach(function (r) {
      r.addEventListener("change", function () { state.price = r.value; state.page = 1; apply(); });
    });
    $$("[data-filter-rating]").forEach(function (r) {
      r.addEventListener("change", function () { state.rating = parseFloat(r.value); state.page = 1; apply(); });
    });
    $$("[data-filter-size]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-filter-size");
        b.classList.toggle("is-on");
        if (b.classList.contains("is-on")) state.sizes.push(v);
        else state.sizes = state.sizes.filter(function (s) { return s !== v; });
        state.page = 1; apply();
      });
    });
    var inStockCb = $("#filter-instock");
    if (inStockCb) inStockCb.addEventListener("change", function () { state.instock = inStockCb.checked; state.page = 1; apply(); });
    var brandFind = $("#brand-find");
    if (brandFind) brandFind.addEventListener("input", function () {
      var t = brandFind.value.trim().toLowerCase(), shownN = 0;
      $$("#filter-brands .check").forEach(function (l) {
        var on = !t || l.textContent.toLowerCase().indexOf(t) > -1;
        l.hidden = !on; if (on) shownN++;
      });
      var none = $("#brand-find-none"); if (none) none.hidden = shownN > 0;
    });
    var sort = $("#sort");
    if (sort) sort.addEventListener("change", function () { state.sort = sort.value; apply(); });
    var more = $("#load-more");
    if (more) more.addEventListener("click", function () { state.page++; apply(); });
    var clear = $("#clear-filters");
    if (clear) clear.addEventListener("click", function () {
      state = { cats: [], brands: [], price: "all", rating: 0, sizes: [], sort: "default", page: 1, per: 8, instock: false };
      var isc = $("#filter-instock"); if (isc) isc.checked = false;
      $$("[data-filter-cat]").forEach(function (c) { c.checked = false; });
      $$("[data-filter-size]").forEach(function (b) { b.classList.remove("is-on"); });
      $$("[data-filter-price]").forEach(function (r) { r.checked = r.value === "all"; });
      $$("[data-filter-rating]").forEach(function (r) { r.checked = r.value === "0"; });
      $$("[data-filter-brand]").forEach(function (c) { c.checked = false; });
      if (sort) sort.value = "default";
      apply();
    });
    var toggle = $$("[data-view]");
    toggle.forEach(function (b) {
      b.addEventListener("click", function () {
        toggle.forEach(function (x) { x.classList.remove("is-on"); });
        b.classList.add("is-on");
        grid.classList.toggle("is-list", b.getAttribute("data-view") === "list");
      });
    });
    apply();
  }

  /* ---------- Category landing page ---------- */
  function productsInCategory(cat, type) {
    return PRODUCTS.filter(function (p) {
      if (p.cats.indexOf(cat) === -1) return false;
      if (type && (p.types || []).indexOf(type) === -1) return false;
      return true;
    });
  }

  function priceInBucket(value, bucket) {
    var v = Number(value);
    if (bucket === "u1000") return v < 1000;
    if (bucket === "1000-3000") return v >= 1000 && v < 3000;
    if (bucket === "3000-6000") return v >= 3000 && v < 6000;
    if (bucket === "6000p") return v >= 6000;
    return true;
  }

  /* Shared size filter helpers (shop, category and brand pages). */
  function sizeBucketOf(str) {
    var m = /([\d.]+)\s*(ml|g)\b/i.exec(str || "");
    if (!m) return "other";
    var v = parseFloat(m[1]);
    return v < 30 ? "small" : v < 100 ? "medium" : "large";
  }
  function productHasSize(p, bucket) {
    return p.variants.some(function (v) {
      var label = (p.variable && p.options[0] && p.options[0].type === "size") ? v.label : p.size;
      return sizeBucketOf(label) === bucket;
    });
  }
  function bindSizeChips(scope, state, onChange) {
    $$("[data-size-chip]", scope).forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-size-chip");
        var on = state.sizes.indexOf(v) === -1;
        if (on) state.sizes.push(v); else state.sizes = state.sizes.filter(function (x) { return x !== v; });
        b.classList.toggle("is-on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        onChange();
      });
    });
  }
  function resetSizeChips(scope) {
    $$("[data-size-chip]", scope).forEach(function (b) {
      b.classList.remove("is-on");
      b.setAttribute("aria-pressed", "false");
    });
  }

  function initCategoryPage() {
    var root = $("#category-page");
    if (!root) return;

    var params = new URLSearchParams(location.search);
    var requested = params.get("cat") || root.getAttribute("data-category") || "skin-care";
    var key = CATEGORY_META[requested] ? requested : CATALOG.categories[0].key;
    var meta = CATEGORY_META[key];
    var state = {
      type: params.get("type") || "",
      brands: params.get("brand") ? [params.get("brand")] : [],
      price: "all",
      sizes: [],
      inStock: false,
      sort: "default"
    };
    if (state.type && !meta.types.some(function (t) { return t.key === state.type; })) state.type = "";

    var brandsInCat = [];
    PRODUCTS.forEach(function (p) {
      if (p.cats.indexOf(key) > -1 && brandsInCat.indexOf(p.brand) === -1) brandsInCat.push(p.brand);
    });

    var titleEl = $("#cat-title"), descEl = $("#cat-desc"), crumbEl = $("#cat-crumb");
    var countEl = $("#cat-count"), gridEl = $("#cat-grid"), sortEl = $("#cat-sort");
    var typeHost = $("#cat-type-filters"), brandHost = $("#cat-brand-filters"), clearBtn = $("#cat-clear"), stockEl = $("#cat-instock");

    function selectedType() {
      var out = null;
      meta.types.forEach(function (t) { if (t.key === state.type) out = t; });
      return out;
    }
    function updateHead() {
      var selected = selectedType();
      if (titleEl) titleEl.textContent = selected ? selected.label : meta.label;
      if (descEl && selected) {
        descEl.textContent = "Our " + selected.label.toLowerCase() + " edit within " + meta.label.toLowerCase() + ". Compare sizes, prices and stock, and check the pack for directions.";
      }
      if (crumbEl) crumbEl.textContent = meta.label;
    }
    function renderFilters() {
      if (typeHost) {
        typeHost.innerHTML = '<label class="check"><input type="radio" name="cat-type" value=""' + (!state.type ? " checked" : "") + '> All types</label>' +
          meta.types.map(function (t) {
            return '<label class="check"><input type="radio" name="cat-type" value="' + t.key + '"' + (state.type === t.key ? " checked" : "") + '> ' + esc(t.label) + ' <span class="check__count">' + t.count + "</span></label>";
          }).join("");
      }
      if (brandHost) {
        brandHost.innerHTML = brandsInCat.map(function (b) {
          var n = productsInCategory(key, state.type).filter(function (p) { return p.brand === b; }).length;
          return '<label class="check"><input type="checkbox" name="cat-brand" value="' + esc(b) + '"' + (state.brands.indexOf(b) > -1 ? " checked" : "") + '> ' + esc(brandLabel(b)) + ' <span class="check__count">' + n + "</span></label>";
        }).join("");
      }
    }
    function filtered() {
      var list = productsInCategory(key, state.type);
      if (state.brands.length) list = list.filter(function (p) { return state.brands.indexOf(p.brand) > -1; });
      list = list.filter(function (p) { return priceInBucket(priceInfo(p).price, state.price); });
      if (state.sizes.length) list = list.filter(function (p) { return state.sizes.some(function (b) { return productHasSize(p, b); }); });
      if (state.inStock) list = list.filter(function (p) { return p.totalStock > 0; });
      return list;
    }
    function render() {
      var list = filtered().slice();
      if (state.sort === "low") list.sort(function (a, b) { return priceInfo(a).price - priceInfo(b).price; });
      if (state.sort === "high") list.sort(function (a, b) { return b.maxPrice - a.maxPrice; });
      if (state.sort === "rating") list.sort(function (a, b) { return b.rating - a.rating; });
      if (state.sort === "discount") list.sort(function (a, b) { return discount(b) - discount(a); });

      gridEl.innerHTML = list.length
        ? list.map(cardHTML).join("")
        : '<div class="category-empty"><p>Nothing matches these filters.</p><p style="margin-top:8px"><a href="' + categoryHref(key) + '">Clear filters and browse all ' + meta.chip.toLowerCase() + '</a> or <a href="/shop">shop everything</a>.</p></div>';
      if (countEl) {
        countEl.innerHTML = list.length
          ? "Showing <b>" + list.length + "</b> " + (list.length === 1 ? "product" : "products") + " in " + meta.label.toLowerCase()
          : "No products match these filters";
      }
      updateHead();
      $$("[data-wish]").forEach(function (b) {
        if (wish.indexOf(b.getAttribute("data-wish")) > -1) b.classList.add("is-on");
      });
    }

    if (sortEl) sortEl.addEventListener("change", function () { state.sort = sortEl.value; render(); });
    if (typeHost) typeHost.addEventListener("change", function (e) {
      if (e.target.name !== "cat-type") return;
      state.type = e.target.value;
      renderFilters(); render();
    });
    if (brandHost) brandHost.addEventListener("change", function (e) {
      if (e.target.name !== "cat-brand") return;
      var b = e.target.value;
      if (e.target.checked) { if (state.brands.indexOf(b) === -1) state.brands.push(b); }
      else state.brands = state.brands.filter(function (x) { return x !== b; });
      render();
    });
    $$('input[name="cat-price"]').forEach(function (el) {
      el.addEventListener("change", function () { state.price = el.value; render(); });
    });
    bindSizeChips(root, state, render);
    if (stockEl) stockEl.addEventListener("change", function () { state.inStock = stockEl.checked; render(); });
    if (clearBtn) clearBtn.addEventListener("click", function () {
      state.type = ""; state.brands = []; state.price = "all"; state.sizes = []; state.inStock = false; state.sort = "default";
      $$('input[name="cat-price"]').forEach(function (el) { el.checked = el.value === "all"; });
      resetSizeChips(root);
      if (stockEl) stockEl.checked = false;
      if (sortEl) sortEl.value = "default";
      renderFilters(); render();
    });

    renderFilters();
    render();
  }

  /* ---------- Brand pages ---------- */
  function brandProducts(bid) {
    return PRODUCTS.filter(function (p) { return p.brand === bid; });
  }

  function renderBrandsPage() {
    var host = $("#brands-grid");
    if (!host) return;
    var sorted = BRANDS.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var seenL = {}, letters = [];
    if (!$("#brand-tools")) {
      var tools = document.createElement("div");
      tools.id = "brand-tools"; tools.className = "brand-tools";
      tools.innerHTML = '<label class="brand-tools__find"><span class="sr-only">Find a brand</span><input type="search" id="brands-find" placeholder="Find a brand" autocomplete="off"></label>' +
        '<nav class="brand-tools__az" aria-label="Jump to letter" id="brands-az"></nav><p class="muted" id="brands-none" role="status" hidden>No brand matches that search.</p>';
      host.parentNode.insertBefore(tools, host);
      $("#brands-find").addEventListener("input", function (e) {
        var t = e.target.value.trim().toLowerCase(), n = 0;
        $$(".brand-tile", host).forEach(function (el) {
          var on = !t || el.textContent.toLowerCase().indexOf(t) > -1; el.hidden = !on; if (on) n++;
        });
        $("#brands-none").hidden = n > 0;
      });
    }
    host.innerHTML = sorted.map(function (b) {
      var n = brandProducts(b.id).length;
      var L = (b.name.charAt(0) || "#").toUpperCase(); if (!/[A-Z]/.test(L)) L = "#";
      var anchor = ""; if (!seenL[L]) { seenL[L] = 1; letters.push(L); anchor = ' id="brand-letter-' + (L === "#" ? "num" : L) + '"'; }
      var inStock = brandProducts(b.id).reduce(function (s, p) { return s + (p.totalStock > 0 ? 1 : 0); }, 0);
      return '<a class="brand-tile"' + anchor + ' href="/brand-' + b.id + '">' +
        '<span class="brand-tile__logo"><img src="/assets/img/brand-' + b.id + '.svg" alt="' + esc(b.name) + ' logo"></span>' +
        '<span class="brand-tile__name">' + esc(b.name) + "</span>" +
        '<span class="brand-tile__tag">' + esc(b.tag) + "</span>" +
        '<span class="brand-tile__count">' + n + (n === 1 ? " product" : " products") + " · " + inStock + " in stock</span>" +
        '<span class="brand-tile__link">Shop ' + esc(b.name) + ' <span aria-hidden="true">→</span></span>' +
      "</a>";
    }).join("");
    var az = $("#brands-az");
    if (az) az.innerHTML = letters.map(function (L) { return '<a href="#brand-letter-' + (L === "#" ? "num" : L) + '">' + L + "</a>"; }).join("");
  }

  function initBrandPage() {
    var root = $("[data-brand-page]");
    if (!root) return;
    var b = byBrand(root.getAttribute("data-brand-page"));
    if (!b) return;
    var all = brandProducts(b.id);

    var logo = $("#brand-logo"); if (logo) logo.src = "/assets/img/brand-" + b.id + ".svg";
    var set = function (sel, val) { var el = $(sel); if (el) el.textContent = val; };
    set("#brand-name", b.name);
    set("#brand-tag", b.tag);
    set("#brand-blurb", b.blurb);
    set("#brand-crumb", b.name);

    var countEl = $("#brand-count"), grid = $("#brand-grid"), sortBy = $("#brand-sort");
    var catHost = $("#brand-cat-filters"), clearBtn = $("#brand-clear"), stockEl = $("#brand-instock");
    var state = { cats: [], price: "all", sizes: [], inStock: false, sort: "default" };
    var cats = [];
    all.forEach(function (p) {
      p.cats.forEach(function (c) { if (cats.indexOf(c) === -1) cats.push(c); });
    });

    function renderFilters() {
      if (!catHost) return;
      catHost.innerHTML = cats.map(function (c) {
        var n = all.filter(function (p) { return p.cats.indexOf(c) > -1; }).length;
        return '<label class="check"><input type="checkbox" name="brand-cat" value="' + esc(c) + '"' + (state.cats.indexOf(c) > -1 ? " checked" : "") + '> ' + esc(CAT_LABELS[c] || c) + ' <span class="check__count">' + n + "</span></label>";
      }).join("");
    }
    function filtered() {
      var list = all.slice();
      if (state.cats.length) list = list.filter(function (p) { return p.cats.some(function (c) { return state.cats.indexOf(c) > -1; }); });
      list = list.filter(function (p) { return priceInBucket(priceInfo(p).price, state.price); });
      if (state.sizes.length) list = list.filter(function (p) { return state.sizes.some(function (b) { return productHasSize(p, b); }); });
      if (state.inStock) list = list.filter(function (p) { return p.totalStock > 0; });
      return list;
    }
    function renderGrid() {
      var list = filtered();
      if (state.sort === "low") list.sort(function (a, b) { return priceInfo(a).price - priceInfo(b).price; });
      if (state.sort === "high") list.sort(function (a, b) { return b.maxPrice - a.maxPrice; });
      if (state.sort === "rating") list.sort(function (a, b) { return b.rating - a.rating; });
      if (state.sort === "discount") list.sort(function (a, b) { return discount(b) - discount(a); });
      if (countEl) countEl.innerHTML = "Showing <b>" + list.length + "</b> " + (list.length === 1 ? "product" : "products") + " from " + esc(b.name);
      if (grid) {
        grid.innerHTML = list.length
          ? list.map(cardHTML).join("")
          : '<div class="empty-state">Nothing from ' + esc(b.name) + ' matches these filters.</div>';
        $$("[data-wish]").forEach(function (el) {
          if (wish.indexOf(el.getAttribute("data-wish")) > -1) el.classList.add("is-on");
        });
      }
    }

    if (sortBy) sortBy.addEventListener("change", function () { state.sort = sortBy.value; renderGrid(); });
    if (catHost) catHost.addEventListener("change", function (e) {
      if (e.target.name !== "brand-cat") return;
      var c = e.target.value;
      if (e.target.checked) { if (state.cats.indexOf(c) === -1) state.cats.push(c); }
      else state.cats = state.cats.filter(function (x) { return x !== c; });
      renderGrid();
    });
    $$('input[name="brand-price"]').forEach(function (el) {
      el.addEventListener("change", function () { state.price = el.value; renderGrid(); });
    });
    bindSizeChips(root, state, renderGrid);
    if (stockEl) stockEl.addEventListener("change", function () { state.inStock = stockEl.checked; renderGrid(); });
    if (clearBtn) clearBtn.addEventListener("click", function () {
      state.cats = []; state.price = "all"; state.sizes = []; state.inStock = false; state.sort = "default";
      $$('input[name="brand-price"]').forEach(function (el) { el.checked = el.value === "all"; });
      resetSizeChips(root);
      if (stockEl) stockEl.checked = false;
      if (sortBy) sortBy.value = "default";
      renderFilters(); renderGrid();
    });

    renderFilters();
    renderGrid();
    /* Related-brand rail */
    var rail = $("#brand-others");
    if (rail) {
      rail.innerHTML = BRANDS.filter(function (x) { return x.id !== b.id; }).slice(0, 12).map(function (x) {
        return '<a class="brand-mini" href="/brand-' + x.id + '"><img src="/assets/img/brand-' + x.id + '.svg" alt=""><span>' + esc(x.name) + "</span></a>";
      }).join("");
    }
  }

  /* ---------- Top deals page ---------- */
  function initDealsPage() {
    var grid = $("#deals-grid");
    if (!grid) return;
    var state = { sort: "discount" };
    function render() {
      var list = PRODUCTS.filter(function (p) { return discount(p) > 0; }).slice();
      if (state.sort === "discount") list.sort(function (a, b) { return discount(b) - discount(a); });
      if (state.sort === "low") list.sort(function (a, b) { return priceInfo(a).price - priceInfo(b).price; });
      if (state.sort === "high") list.sort(function (a, b) { return b.maxPrice - a.maxPrice; });
      if (state.sort === "rating") list.sort(function (a, b) { return b.rating - a.rating; });
      grid.innerHTML = list.map(cardHTML).join("");
      var count = $("#deals-count");
      if (count) count.innerHTML = list.length ? "<b>" + list.length + "</b> reduced products, up to <b>" + discount(list[0]) + "% off</b>." : "No products are reduced right now. They appear here as soon as a sale price is set.";
      $$("[data-wish]").forEach(function (b) {
        if (wish.indexOf(b.getAttribute("data-wish")) > -1) b.classList.add("is-on");
      });
    }
    var sortEl = $("#deals-sort");
    if (sortEl) sortEl.addEventListener("change", function () { state.sort = sortEl.value; render(); });
    render();
  }

  /* ---------- Product detail page ---------- */
  var REVIEW_KEY = "iconic-reviews";
  var RECENT_KEY = "iconic-recent";
  var COMPARE_KEY = "iconic-compare";

  function readIdList(key) {
    try {
      var v = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(v) ? v.filter(function (id) { return !!byId(id); }) : [];
    } catch (e) { return []; }
  }
  function writeIdList(key, list) {
    try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) {}
  }
  function compareIds() { return readIdList(COMPARE_KEY).slice(0, 4); }
  function isCompared(id) { return compareIds().indexOf(id) > -1; }
  function markCompare(btn, on) {
    if (!btn) return;
    btn.classList.toggle("is-on", !!on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function markWish(btn, on) {
    if (!btn) return;
    btn.classList.toggle("is-on", !!on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  function toggleCompare(id, btn) {
    if (!byId(id)) return;
    var list = compareIds(), i = list.indexOf(id);
    if (i > -1) { list.splice(i, 1); toast("Removed from compare"); }
    else if (list.length >= 4) { toast("Compare holds up to 4 products"); return; }
    else { list.push(id); toast("Added to compare"); }
    writeIdList(COMPARE_KEY, list);
    $$("[data-compare]").forEach(function (b) {
      markCompare(b, list.indexOf(b.getAttribute("data-compare")) > -1);
    });
    $$("[data-compare-count]").forEach(function (el) { el.textContent = list.length; });
    if ($("#compare-page")) renderComparePage();
  }

  function reviewsAll() {
    var v;
    try {
      v = JSON.parse(localStorage.getItem(REVIEW_KEY) || "{}");
    } catch (e) { return {}; }
    if (!v || typeof v !== "object" || Array.isArray(v)) return {};
    // Earlier prototype builds seeded sample reviews into localStorage. Drop
    // those entries so returning visitors never see demo quotes labelled as
    // their own reviews.
    var clean = {}, changed = false;
    Object.keys(v).forEach(function (id) {
      var list = Array.isArray(v[id]) ? v[id] : [];
      var kept = list.filter(function (r) { return r && r.seed !== true; });
      if (kept.length !== list.length) changed = true;
      if (kept.length) clean[id] = kept;
    });
    if (changed) saveReviewsAll(clean);
    return clean;
  }
  function saveReviewsAll(v) { try { localStorage.setItem(REVIEW_KEY, JSON.stringify(v)); } catch (e) {} }
  function reviewsFor(p) {
    var all = reviewsAll();
    return Array.isArray(all[p.id]) ? all[p.id] : [];
  }
  function reviewCount(p) {
    return (p.reviews || 0) + reviewsFor(p).length;
  }
  function reviewHTML(r) {
    return '<article class="review">' +
      '<div class="review__head"><div class="review__who"><b>' + esc(r.name) + '</b>' +
        '<span class="review__badge">Your review</span></div>' +
        '<span class="review__date">' + (r.date ? fmtDate(r.date) : "Just now") + "</span></div>" +
      stars(r.rating) +
      '<p class="review__text">' + esc(r.text) + "</p></article>";
  }
  function renderPdpReviews(p) {
    var list = reviewsFor(p).slice().sort(function (a, b) {
      return (b.date || "").localeCompare(a.date || "");
    });
    var host = $("#pdp-reviews");
    var total = reviewCount(p);
    var tab = $('[data-pdp-tab="rev"]');
    if (tab) tab.textContent = "Reviews (" + total + ")";
    var count = $("#pdp-review-count");
    if (count) count.textContent = total + (total === 1 ? " review" : " reviews");
    var avgEl = $("#pdp-review-avg");
    if (!list.length) {
      if (host) host.innerHTML = '<p class="review-empty">No reviews yet. Be the first to share your experience.</p>';
      if (avgEl) avgEl.innerHTML = '<span class="review-empty">No ratings yet</span>';
      return;
    }
    if (host) host.innerHTML = list.map(reviewHTML).join("");
    var avg = list.reduce(function (n, r) { return n + r.rating; }, 0) / list.length;
    if (avgEl) avgEl.innerHTML = stars(Math.round(avg * 2) / 2) + "<b>" + avg.toFixed(1) + "</b><span>average rating</span>";
  }

  function rememberRecent(id) {
    var list = readIdList(RECENT_KEY).filter(function (x) { return x !== id; });
    list.unshift(id);
    writeIdList(RECENT_KEY, list.slice(0, 8));
  }
  function initRecent(p) {
    var section = $("#recent-section"), grid = $("#recent-grid");
    if (!section || !grid) return;
    var ids = readIdList(RECENT_KEY).filter(function (id) { return id !== p.id; }).slice(0, 6);
    section.hidden = !ids.length;
    grid.innerHTML = ids.map(function (id) { return cardHTML(byId(id)); }).join("");
  }

  function initPDP() {
    var root = $("#pdp");
    if (!root) return;
    var params = new URLSearchParams(location.search);
    var p = byId(root.getAttribute("data-product-id") || params.get("id") || "") || PRODUCTS[0];
    var content = pdpContent(p);
    var selected = defaultVariant(p);
    function set(sel, val, html) {
      var el = $(sel); if (!el) return;
      if (html) el.innerHTML = val; else el.textContent = val;
    }

    document.title = p.metaTitle || (p.name + " — Iconic Beauty & Baby");
    var descMeta = document.querySelector('meta[name="description"]');
    if (descMeta) descMeta.setAttribute("content", p.desc);
    set("#pdp-brand", brandName(p.brand) || "Iconic");
    var brandLink = $("#pdp-brand-link");
    if (brandLink) brandLink.href = byBrand(p.brand) ? "/brand-" + p.brand : "/brands";
    set("#pdp-title", p.name);
    set("#pdp-desc", p.desc);
    set("#pdp-crumb", p.name);
    set("#pdp-cat-crumb", CAT_LABELS[p.cats[0]] || "Shop");
    var catLink = $("#pdp-cat-link");
    if (catLink) catLink.href = categoryHref(p.cats[0]);

    /* Per-product editorial content. The static page carries the long copy;
       only replace it when the JS bundle also has content. */
    var benefitsEl = $("#pdp-benefits");
    if (benefitsEl && content.benefits && content.benefits.length) benefitsEl.innerHTML = content.benefits.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("");
    var benefitsTab = $("#pdp-benefits-tab");
    if (benefitsTab && content.benefits && content.benefits.length) benefitsTab.innerHTML = content.benefits.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("");
    set("#pdp-why", content.why || "");
    set("#pdp-actives", content.actives || "");
    set("#pdp-inci", content.inci || content.actives || "");
    set("#pdp-freefrom", content.freeFrom || "");
    set("#pdp-how", content.how || "");
    set("#pdp-age", content.age || "");
    var goodEl = $("#pdp-good");
    if (goodEl && content.goodToKnow && content.goodToKnow.length) goodEl.innerHTML = content.goodToKnow.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("");
    var warnEl = $("#pdp-warning");
    if (warnEl) { warnEl.textContent = content.warnings || ""; warnEl.hidden = !content.warnings; }
    var warnEl2 = $("#pdp-warning-2");
    if (warnEl2) warnEl2.textContent = content.warnings || "";
    var warnBox2 = $("#pdp-warning-box-2");
    if (warnBox2) warnBox2.hidden = !content.warnings;
    var warnBox = $("#pdp-warning-box");
    if (warnBox) warnBox.hidden = !content.warnings;
    var descLong = $("#pdp-desc-long");
    if (descLong && p.descLong && p.descLong.length) {
      descLong.innerHTML = p.descLong.map(function (par) { return "<p>" + esc(par) + "</p>"; }).join("");
    }

    /* Cosmetic details: skin/hair type, volume and expiry meta lines.
       Re-rendered on variant change so the volume always matches the badge. */
    var cm = $("#pdp-cosmeta");
    function renderCosmeta(v) {
      if (!cm) return;
      var icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
      var vol = (p.variable ? v.label : p.size) || p.size || "";
      var rows = "";
      rows += '<p>' + icon + '<span><b>' + (p.variable ? esc(p.options[0].label) : 'Size') + ':</b> ' + esc(vol) + '</span></p>';
      cm.innerHTML = rows;
    }
    renderCosmeta(selected);
    /* Ingredient-tab spec table rows for this product. */
    var spec = $("#pdp-spec");
    if (spec) {
      var trs = "";
      trs += "<tr><th>Brand</th><td>" + esc(brandName(p.brand) || "Not stated") + "</td></tr>";
      trs += "<tr><th>Category</th><td>" + esc(CAT_LABELS[p.cats[0]] || "") + "</td></tr>";
      trs += "<tr><th>" + (p.variable ? "Options" : "Size") + "</th><td>" + esc(p.variable ? p.variants.map(function (x) { return x.label; }).join(", ") : p.size) + "</td></tr>";
      trs += "<tr><th>SKU</th><td>" + esc(p.variants.map(function (x) { return x.sku; }).join(", ")) + "</td></tr>";
      spec.innerHTML = trs;
    }

    /* Gallery: a packshot plus detail views. Every image carries dimensions. */
    var gallery = $("#pdp-main-img");
    var thumbsHost = $("#pdp-thumbs");
    var galleryImgs = content.gallery || [p.img];
    function galleryAlt(name, i) {
      return i === 0 ? p.name : p.name + " — detail view " + i;
    }
    function renderThumbs(v) {
      if (!thumbsHost) return;
      var list = [v.img].concat(galleryImgs.filter(function (x) { return x !== v.img; })).slice(0, 5);
      thumbsHost.innerHTML = list.map(function (name, i) {
        return '<button type="button" class="thumb' + (i === 0 ? " is-on" : "") + '" data-gallery="' + name + '" aria-label="View image ' + (i + 1) + '">' +
          imgTag(name, galleryAlt(name, i)) + "</button>";
      }).join("");
      $$(".thumb", thumbsHost).forEach(function (t) {
        t.addEventListener("click", function () {
          $$(".thumb", thumbsHost).forEach(function (x) { x.classList.remove("is-on"); });
          t.classList.add("is-on");
          if (gallery) {
            gallery.style.opacity = 0;
            gallery.src = "/assets/img/" + t.getAttribute("data-gallery") + ".svg";
            gallery.alt = t.querySelector("img").alt;
            setTimeout(function () { gallery.style.opacity = 1; }, 120);
          }
        });
      });
    }
    renderThumbs(selected);
    if (gallery) {
      var thumbList = content.gallery || [p.img, "gallery-texture", "gallery-swatch", "gallery-pack"];
      gallery.src = "/assets/img/" + (selected ? selected.img : thumbList[0]) + ".svg";
      gallery.alt = p.name;
    }

    /* Lightbox / zoom. */
    var zoom = $(".gallery__zoom");
    if (zoom && gallery) zoom.addEventListener("click", function () {
      var box = $("#gallery-lightbox");
      if (!box) return;
      var img = $("#gallery-lightbox-img");
      if (img) { img.src = gallery.src; img.alt = gallery.alt; }
      box.hidden = false;
      document.body.classList.add("is-locked");
      var close = $("#gallery-lightbox-close"); if (close) close.focus();
    });
    $$("[data-close-lightbox]").forEach(function (b) {
      b.addEventListener("click", function () {
        var box = $("#gallery-lightbox");
        if (box) box.hidden = true;
        refreshOverlayState();
        if (zoom) zoom.focus();
      });
    });

    function renderOptions() {
      var host = $("#pdp-options");
      if (!host) return;
      if (!p.variable) { host.hidden = true; host.innerHTML = ""; return; }
      host.hidden = false;
      host.innerHTML = p.options.map(function (g) {
        var isSize = g.type === "size";
        return '<div class="pdp-option">' +
          '<div class="pdp-option__head"><span class="pdp-option__label">' + g.label + ": <b>" + selected.label + "</b></span>" +
          (isSize ? '<a class="pdp-option__guide" href="/help#size-guide">Size guide</a>' : "") +
          (g.type === "shade" ? '<button type="button" class="pdp-option__guide" id="pdp-shade-guide">Shade guide</button>' : "") + "</div>" +
          '<div class="pdp-option__values' + (g.type === "shade" ? " pdp-option__values--shades" : "") + '">' +
          g.values.map(function (val) {
            var sv = null;
            p.variants.forEach(function (x) { if (x.vid === val.vid) sv = x; });
            var on = selected.vid === val.vid;
            var out = sv && sv.stock <= 0;
            var sw = val.swatch ? '<span class="pdp-swatch" style="background:' + val.swatch + '"></span>' : "";
            return '<button type="button" class="pdp-choice' + (on ? " is-on" : "") + (out ? " is-out" : "") + '" data-pdp-opt="' + val.vid + '" aria-pressed="' + (on ? "true" : "false") + '">' + sw + "<span>" + val.label + "</span>" + (out ? "<em>Sold out</em>" : "") + "</button>";
          }).join("") + "</div></div>";
      }).join("");
      $$("[data-pdp-opt]", host).forEach(function (b) {
        b.addEventListener("click", function () {
          var next = variantOf(p, b.getAttribute("data-pdp-opt"));
          if (next) applyVariant(next);
        });
      });
    }

    function applyVariant(v) {
      selected = v;
      if (!v) return;
      set("#pdp-size", p.variable ? v.label : p.size);
      set("#pdp-price", money(v.price));
      var wasEl = $("#pdp-was");
      if (wasEl) { wasEl.textContent = v.was ? money(v.was) : ""; wasEl.hidden = !v.was; }
      set("#pdp-save", v.was && v.was > v.price ? "Save " + Math.round((1 - v.price / v.was) * 100) + "%" : ""); var saveEl = $("#pdp-save"); if (saveEl) saveEl.hidden = !(v.was && v.was > v.price);
      set("#pdp-rating", (p.reviews || reviewCount(p) ? stars(p.rating) + "<span>" + reviewCount(p) + " reviews</span>" : ""), true);
      set("#pdp-sold", "", true);
      renderThumbs(v);
      if (gallery) { gallery.src = "/assets/img/" + v.img + ".svg"; gallery.alt = p.name; }

      var stock = $("#pdp-stock");
      if (stock) {
        stock.textContent = v.stock <= 0 ? "Sold out" : v.stock <= 8 ? "Only " + v.stock + " left" : "In stock";
        stock.className = "pdp__stock" + (v.stock <= 0 ? " is-out" : v.stock <= 8 ? " is-low" : "");
      }
      set("#pdp-sku", "SKU: " + v.sku);
      renderCosmeta(v);
      var addBtn = $("#pdp-add"), buyBtn = $("#pdp-buy");
      if (addBtn) {
        addBtn.disabled = v.stock <= 0;
        addBtn.textContent = v.stock <= 0 ? "Sold out" : "Add to cart";
        addBtn.setAttribute("data-vid", p.variable ? v.vid : "default");
      }
      if (buyBtn) { buyBtn.disabled = v.stock <= 0; buyBtn.textContent = v.stock <= 0 ? "Sold out" : "Buy it now"; }
      var back = $("#pdp-backstock");
      if (back) back.hidden = v.stock > 0;
      var sk = $("#sticky-atc");
      if (sk) {
        var skn = $("#sticky-atc-name"), skp = $("#sticky-atc-price"), skb = $("#sticky-atc-btn");
        if (skn) skn.textContent = p.name + (p.variable ? " · " + v.label : "");
        if (skp) skp.textContent = money(v.price);
        if (skb) { skb.disabled = v.stock <= 0; skb.textContent = v.stock <= 0 ? "Sold out" : "Add to cart"; }
      }

      var host = $("#pdp-options");
      if (host) {
        $$("[data-pdp-opt]", host).forEach(function (b) {
          var on = b.getAttribute("data-pdp-opt") === v.vid;
          b.classList.toggle("is-on", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        var label = $(".pdp-option__label b", host);
        if (label) label.textContent = v.label;
      }
    }

    var wishBtn = $("#pdp .pdp__links [data-wish]");
    if (wishBtn) {
      wishBtn.setAttribute("data-wish", p.id);
      markWish(wishBtn, wish.indexOf(p.id) > -1);
    }
    var cmpBtn = $("#pdp-compare");
    if (cmpBtn) {
      cmpBtn.setAttribute("data-compare", p.id);
      markCompare(cmpBtn, isCompared(p.id));
    }
    var shareBtn = $("#pdp-share");
    if (shareBtn) shareBtn.addEventListener("click", function () {
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(function () { toast("Product link copied"); });
      else toast("Copy this URL: " + location.href);
    });

    var addBtn = $("#pdp-add");
    if (addBtn) addBtn.addEventListener("click", function () {
      var q = parseInt(($("#pdp-qty-val") || {}).textContent || "1", 10) || 1;
      addToCart(p.id, q, selected.vid);
    });
    var stickyBtn = $("#sticky-atc-btn");
    if (stickyBtn) stickyBtn.addEventListener("click", function () {
      var q = parseInt(($("#pdp-qty-val") || {}).textContent || "1", 10) || 1;
      addToCart(p.id, q, selected.vid);
    });
    var stickyBar = $("#sticky-atc");
    if (stickyBar && addBtn && "IntersectionObserver" in window) {
      new IntersectionObserver(function (en) {
        var gone = !en[0].isIntersecting && en[0].boundingClientRect.top < 0;
        stickyBar.classList.toggle("is-on", gone);
        document.body.classList.toggle("has-sticky-atc", gone);
      }).observe(addBtn);
    }
    var buyBtn = $("#pdp-buy");
    if (buyBtn) buyBtn.addEventListener("click", function () {
      var q = parseInt(($("#pdp-qty-val") || {}).textContent || "1", 10) || 1;
      addToCart(p.id, q, selected.vid);
      if (selected.stock > 0) setTimeout(function () { location.href = "/checkout"; }, 700);
    });

    /* Back-in-stock alert (demo: stored in this browser, no email sent). */
    var notifyForm = $("#backstock-form");
    if (notifyForm) notifyForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = notifyForm.querySelector('[name="email"]');
      var msg = $("#backstock-msg");
      if (!input || !validEmail(input.value.trim())) {
        if (msg) { msg.textContent = "Enter a valid email address."; msg.className = "form-msg is-bad"; }
        if (input) input.focus();
        return;
      }
      try { localStorage.setItem("iconic-backstock", JSON.stringify({ id: p.id, vid: selected.vid, email: input.value.trim() })); } catch (err) {}
      if (msg) { msg.textContent = "You're on the list. This demo stores your request in this browser only."; msg.className = "form-msg is-on"; }
      notifyForm.reset();
    });

    /* Shade guide drawer (delegated because the option row is re-rendered). */
    document.addEventListener("click", function (e) {
      var shadeBtn = e.target.closest("#pdp-shade-guide");
      if (!shadeBtn) return;
      e.preventDefault();
      var box = $("#shade-guide");
      if (!box) return;
      box.hidden = false;
      document.body.classList.add("is-locked");
      var close = $("#shade-guide-close"); if (close) close.focus();
    });
    $$("[data-close-shade]").forEach(function (b) {
      b.addEventListener("click", function () {
        var box = $("#shade-guide");
        if (box) box.hidden = true;
        refreshOverlayState();
      });
    });

    // qty
    var qv = $("#pdp-qty-val");
    var inc = $("#pdp-inc"), dec = $("#pdp-dec");
    if (inc) inc.addEventListener("click", function () { qv.textContent = Math.min(20, parseInt(qv.textContent, 10) + 1); });
    if (dec) dec.addEventListener("click", function () { qv.textContent = Math.max(1, parseInt(qv.textContent, 10) - 1); });

    // tabs
    var tabBtns = $$("[data-pdp-tab]");
    tabBtns.forEach(function (b, ti) {
      var key = b.getAttribute("data-pdp-tab");
      b.setAttribute("role", "tab"); b.id = "tab-" + key; b.setAttribute("aria-controls", "panel-" + key);
      b.setAttribute("aria-selected", b.classList.contains("is-active") ? "true" : "false");
      b.tabIndex = b.classList.contains("is-active") ? 0 : -1;
      var pn0 = $('[data-pdp-panel="' + key + '"]');
      if (pn0) { pn0.id = "panel-" + key; pn0.setAttribute("role", "tabpanel"); pn0.setAttribute("aria-labelledby", b.id); }
      b.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (e.key === "Home") dir = -99; if (e.key === "End") dir = 99;
        if (!dir) return;
        e.preventDefault();
        var nx = dir === -99 ? 0 : dir === 99 ? tabBtns.length - 1 : (ti + dir + tabBtns.length) % tabBtns.length;
        tabBtns[nx].focus(); tabBtns[nx].click();
      });
      b.addEventListener("click", function () {
        tabBtns.forEach(function (x) { x.classList.remove("is-active"); x.setAttribute("aria-selected", "false"); x.tabIndex = -1; });
        b.classList.add("is-active"); b.setAttribute("aria-selected", "true"); b.tabIndex = 0;
        $$("[data-pdp-panel]").forEach(function (pn) {
          pn.hidden = pn.getAttribute("data-pdp-panel") !== b.getAttribute("data-pdp-tab");
        });
      });
    });

    // review form
    var rf = $("#review-form");
    if (rf) rf.addEventListener("submit", function (e) {
      e.preventDefault();
      var nameEl = rf.querySelector('[name="reviewer"]');
      var ratingEl = rf.querySelector('[name="rating"]');
      var bodyEl = rf.querySelector('[name="body"]');
      var msg = $("#review-msg");
      var name = nameEl.value.trim(), text = bodyEl.value.trim();
      if (!name || !text) {
        if (msg) { msg.textContent = "Add your name and a few words about the product."; msg.className = "review-msg is-bad"; }
        return;
      }
      var all = reviewsAll();
      all[p.id] = reviewsFor(p);
      all[p.id].unshift({ name: name, rating: Number(ratingEl.value) || 5, text: text, date: new Date().toISOString(), seed: false });
      saveReviewsAll(all);
      rf.reset();
      if (msg) { msg.textContent = "Thanks — your review is live."; msg.className = "review-msg is-on"; }
      renderPdpReviews(p);
      set("#pdp-rating", (p.reviews || reviewCount(p) ? stars(p.rating) + "<span>" + reviewCount(p) + " reviews</span>" : ""), true);
      toast("Review published");
    });

    // related
    var rel = $("#pdp-related");
    if (rel) {
      var related = PRODUCTS.filter(function (x) { return x.id !== p.id; }).sort(function (a, b) {
        var as = a.cats.some(function (c) { return p.cats.indexOf(c) > -1; }) ? 1 : 0;
        var bs = b.cats.some(function (c) { return p.cats.indexOf(c) > -1; }) ? 1 : 0;
        return bs - as;
      });
      rel.innerHTML = related.slice(0, 5).map(cardHTML).join("");
    }
    // aside mini
    var aside = $("#aside-list");
    if (aside) {
      aside.innerHTML = PRODUCTS.filter(function (x) { return x.id !== p.id; }).slice(0, 3).map(function (x) {
        var info = priceInfo(x);
        return '<a class="aside-product" href="' + productHref(x) + '">' +
          '<span class="aside-product__media"><img src="/assets/img/' + x.img + '.svg" alt="" width="60" height="60" loading="lazy"></span>' +
          "<span><p>" + esc(x.name) + "</p>" + (x.reviews ? stars(x.rating) : "") + ' <span class="price" style="font-size:12px">' + (info.from ? "From " : "") + money(info.price) + "</span></span></a>";
      }).join("");
    }

    applyVariant(selected);
    renderOptions();
    renderPdpReviews(p);
    initRecent(p);
    rememberRecent(p.id);
  }
  function renderMini() {
    var grid = $("#mini-grid");
    if (!grid) return;
    ["ceramide", "vitc", "rosehip", "ha-b5", "glycolic", "foundation"].forEach(function (id) {
      var p = byId(id); if (!p) return;
      var info = priceInfo(p);
      var el = document.createElement("div");
      el.className = "mini";
      el.innerHTML =
        '<a class="mini__media" aria-label="' + esc(p.name) + '" href="' + productHref(p) + '"><img src="/assets/img/' + p.img + '.svg" alt=""></a>' +
        '<div class="mini__body">' +
          '<a class="mini__title" href="' + productHref(p) + '">' + esc(p.name) + "</a>" +
          '<div class="mini__rating">' + stars(p.rating) + '<span>' + p.reviews + "</span></div>" +
          '<div class="mini__buy">' +
            '<span class="price">' + (info.from ? "From " : "") + money(info.price) + "</span>" +
            (p.variable
              ? '<button type="button" class="mini__add" data-choose="' + p.id + '">Options' + plusIcon() + "</button>"
              : '<button type="button" class="mini__add" data-add="' + p.id + '">Add' + plusIcon() + "</button>") +
          "</div>" +
        "</div>";
      grid.appendChild(el);
    });
  }

  function all() { return PRODUCTS; }
  function flameIcon() { return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22c4.4 0 7-2.9 7-6.6 0-4.4-4.3-6.6-4.3-10.4C14.7 3.4 13.4 2 12 2c0 3.3-2.2 4.6-3.5 6.9C7.3 10.8 6 12.5 6 15.4 6 19.1 8.6 22 12 22z"/><path d="M12 22c1.9 0 3-1.4 3-3 0-1.9-1.6-2.6-1.6-4.4-.6.9-1.4 1.4-1.4 2.6 0 .9-.7 1.3-1.3 1.3-.8 0-1.4-.6-1.4-1.5 0 2.6 1.2 5 2.7 5z" fill="#fff" opacity=".85"/></svg>'; }

  /* ---------- Global click handling ---------- */
  document.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    if (add) {
      e.preventDefault();
      addToCart(add.getAttribute("data-add"), 1, add.getAttribute("data-vid"));
      if (add.closest("#quickview")) closeModal();
      return;
    }
    var choose = e.target.closest("[data-choose]");
    if (choose) { e.preventDefault(); openQuick(choose.getAttribute("data-choose")); return; }
    var quick = e.target.closest("[data-quick]");
    if (quick) { e.preventDefault(); openQuick(quick.getAttribute("data-quick")); return; }
    var wishBtn = e.target.closest("[data-wish]");
    if (wishBtn) { e.preventDefault(); toggleWish(wishBtn.getAttribute("data-wish"), wishBtn); return; }
    var cmp = e.target.closest("[data-compare]");
    if (cmp) { e.preventDefault(); toggleCompare(cmp.getAttribute("data-compare"), cmp); return; }
    var crm = e.target.closest("[data-compare-remove]");
    if (crm) {
      e.preventDefault();
      var cid = crm.getAttribute("data-compare-remove");
      writeIdList(COMPARE_KEY, compareIds().filter(function (id) { return id !== cid; }));
      $$("[data-compare]").forEach(function (b) { if (b.getAttribute("data-compare") === cid) { b.classList.remove("is-on"); b.setAttribute("aria-pressed", "false"); } });
      $$("[data-compare-count]").forEach(function (el) { el.textContent = compareIds().length; });
      if ($("#compare-page")) renderComparePage();
      return;
    }
    var inc = e.target.closest("[data-inc]");
    if (inc) {
      var k = inc.getAttribute("data-inc");
      var l = cart.filter(function (x) { return lineKey(x.id, x.vid) === k; })[0];
      if (l) setQty(k, l.qty + 1);
      return;
    }
    var dec = e.target.closest("[data-dec]");
    if (dec) {
      var k2 = dec.getAttribute("data-dec");
      var l2 = cart.filter(function (x) { return lineKey(x.id, x.vid) === k2; })[0];
      if (l2) setQty(k2, l2.qty - 1);
      return;
    }
    var rem = e.target.closest("[data-remove]");
    if (rem) { removeLine(rem.getAttribute("data-remove")); return; }
    if (e.target.closest("[data-close-modal]") || e.target.id === "quickview") closeModal();
  });

  /* ---------- Footer year ---------- */
  function initMisc() {
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    // restore wishlist visuals
    wish.forEach(function (id) {
      $$('[data-wish="' + id + '"]').forEach(function (b) { b.classList.add("is-on"); });
    });
    $$("[data-wish-count]").forEach(function (el) { el.textContent = wish.length; });
    var cmpList = compareIds();
    $$("[data-compare-count]").forEach(function (el) { el.textContent = cmpList.length; });
    $$("[data-compare]").forEach(function (b) {
      var on = cmpList.indexOf(b.getAttribute("data-compare")) > -1;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    var nf = $("#news-form");
    if (nf) nf.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = nf.querySelector('input[type="email"]');
      var msg = $("#news-msg");
      var value = input ? input.value.trim() : "";
      if (!validEmail(value)) {
        if (msg) { msg.textContent = "Enter a valid email address, e.g. you@example.com."; msg.className = "newsletter__msg is-bad"; }
        if (input) { input.focus(); input.setAttribute("aria-invalid", "true"); }
        return;
      }
      if (input) input.removeAttribute("aria-invalid");
      try { localStorage.setItem("iconic-subscriber", value); } catch (e2) {}
      if (msg) { msg.textContent = "You're on the list. This demo stores your sign-up in this browser."; msg.className = "newsletter__msg is-on"; }
      nf.reset(); toast("Welcome — your sign-up is saved in this browser");
    });
    var jn = $("#journal-news");
    if (jn) jn.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = jn.querySelector("input");
      var msg = jn.querySelector(".newsletter__msg");
      if (!input || !validEmail(input.value.trim())) {
        if (msg) { msg.textContent = "Enter a valid email address."; msg.className = "newsletter__msg is-bad"; }
        if (input) input.focus();
        return;
      }
      jn.reset();
      if (msg) { msg.textContent = "Subscribed — welcome to the journal."; msg.className = "newsletter__msg is-on"; }
      toast("Subscribed — welcome to the journal");
    });
  }


  /* ============================================================
     Account, checkout and commerce
     ============================================================ */
  var USER_KEY = "iconic-user";
  var SESSION_KEY = "iconic-session";
  var ORDERS_KEY = "iconic-orders";

  function readJSON(key, fallback) {
    try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v == null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function writeJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  function getUser() { return readJSON(USER_KEY, null); }
  function saveUser(u) { writeJSON(USER_KEY, u); }
  function currentUser() {
    var email = localStorage.getItem(SESSION_KEY);
    var u = getUser();
    return u && email && u.email.toLowerCase() === email.toLowerCase() ? u : null;
  }
  function setSession(email) { try { localStorage.setItem(SESSION_KEY, email); } catch (e) {} }
  function clearSession() { try { localStorage.removeItem(SESSION_KEY); } catch (e) {} }
  function getOrders() { var o = readJSON(ORDERS_KEY, []); return Array.isArray(o) ? o : []; }
  function saveOrders(list) { writeJSON(ORDERS_KEY, list); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* Passwords are hashed with SHA-256 before being stored. This is still a
     front-end-only prototype: never treat localStorage as secure. */
  function randomSalt() {
    var a = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(a);
    else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return Array.prototype.map.call(a, function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  function hashPassword(password, salt) {
    var value = salt + ":" + password;
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
      return window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ("0" + b.toString(16)).slice(-2); }).join("");
      });
    }
    /* Fallback for old browsers without Web Crypto: not cryptographically strong. */
    var h = 0;
    for (var i = 0; i < value.length; i++) { h = ((h << 5) - h + value.charCodeAt(i)) | 0; }
    return Promise.resolve("fallback-" + (h >>> 0).toString(16));
  }
  function setPassword(u, password) {
    return hashPassword(password, u.salt).then(function (hash) {
      u.passwordHash = hash;
      delete u.password;
      return u;
    });
  }
  function checkPassword(u, password) {
    if (!u) return Promise.resolve(false);
    if (u.passwordHash && u.salt) {
      return hashPassword(password, u.salt).then(function (hash) { return hash === u.passwordHash; });
    }
    /* Legacy plaintext record: verify once, then migrate it. */
    if (u.password != null) {
      var ok = u.password === password;
      if (ok) return setPassword(u, password).then(function () { saveUser(u); return true; });
    }
    return Promise.resolve(false);
  }
  function fmtDate(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  function addDays(iso, n) {
    var d = new Date(iso); d.setDate(d.getDate() + n);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  /* ---------- Shared form helpers ---------- */
  var errSeq = 0;
  function markInvalid(input, msg) {
    var f = input.closest(".field");
    if (!f) return;
    f.classList.add("is-invalid");
    input.setAttribute("aria-invalid", "true");
    var e = f.querySelector(".field__error");
    if (e) {
      if (!e.id) e.id = "field-error-" + (++errSeq);
      e.textContent = msg || "This field is required";
      input.setAttribute("aria-describedby", e.id);
    }
  }
  function clearInvalid(scope) {
    $$(".field.is-invalid", scope || document).forEach(function (f) {
      f.classList.remove("is-invalid");
      $$("input, select, textarea", f).forEach(function (el) {
        el.removeAttribute("aria-invalid");
        el.removeAttribute("aria-describedby");
      });
      var e = f.querySelector(".field__error"); if (e) e.textContent = "";
    });
  }
  function validateScope(scope) {
    var badFields = [];
    $$("input, select, textarea", scope).forEach(function (el) {
      if (el.disabled || el.type === "hidden" || el.type === "radio" || el.type === "checkbox") return;
      var f = el.closest(".field");
      var required = el.hasAttribute("required");
      var val = (el.value || "").trim();
      var bad = required && !val;
      if (!bad && val && el.type === "email" && !validEmail(val)) bad = true;
      var fmtMsg = "";
      if (!bad && val && /postcode/i.test(el.name || "")) {
        var ctry = (el.form && el.form.country && el.form.country.value) || "Sri Lanka";
        if (ctry === "Sri Lanka" ? !/^\d{5}$/.test(val) : !/^[A-Za-z0-9][A-Za-z0-9 \-]{2,9}$/.test(val)) { bad = true; fmtMsg = ctry === "Sri Lanka" ? "Enter a 5-digit postal code, for example 00300" : "Enter a valid postal code"; }
      }
      if (!bad && val && el.type === "tel" && !/^\+?[0-9][0-9 \-()]{6,17}$/.test(val)) { bad = true; fmtMsg = "Enter a phone number, for example 077 123 4567"; }
      if (bad) {
        var msg = fmtMsg || (el.type === "email" && val ? "Enter a valid email address" : "This field is required");
        markInvalid(el, msg);
        badFields.push({ el: el, msg: msg });
      } else if (f) {
        f.classList.remove("is-invalid");
        el.removeAttribute("aria-invalid");
        el.removeAttribute("aria-describedby");
      }
    });
    var summary = $("#form-error-summary");
    if (summary) {
      if (badFields.length) {
        summary.hidden = false;
        summary.setAttribute("role", "alert");
        summary.innerHTML = "<b>Check " + badFields.length + " field" + (badFields.length === 1 ? "" : "s") + " before continuing</b><ul>" +
          badFields.map(function (b) {
            var label = b.el.closest(".field").querySelector(".field__label");
            return "<li>" + esc((label ? label.textContent : "Field") + ": " + b.msg) + "</li>";
          }).join("") + "</ul>";
      } else {
        summary.hidden = true;
        summary.innerHTML = "";
      }
    }
    if (badFields.length) badFields[0].el.focus();
    return badFields.length === 0;
  }
  function showError(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
  }
  function clearError(el) { if (el) { el.textContent = ""; el.classList.remove("is-on"); } }

  /* ---------- Header account state ---------- */
  function refreshAccountUI() {
    var u = currentUser();
    $$("[data-account-name]").forEach(function (el) { el.textContent = u ? u.firstName : "Log in"; });
    $$("[data-mobile-account]").forEach(function (el) { el.textContent = u ? "My account · " + u.firstName : "My account"; });
  }

  /* ---------- Cart checkout guard ---------- */
  function initCheckoutLinks() {
    $$("[data-checkout-link]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (!cart.length) { e.preventDefault(); toast("Your bag is empty"); }
      });
    });
  }

  /* ============================================================
     Checkout
     ============================================================ */
  var PROMOS = {}; /* no promo codes supplied yet */
  var checkoutState = { step: 1, promo: null, delivery: "standard", placed: false };

  function initCheckout() {
    var form = $("#checkout-form");
    if (!form) return;

    var panels = $$("[data-panel]", form);
    var steps = $$(".step", $("#checkout-steps"));
    var totals = $("#summary-totals");

    if (!cart.length) {
      form.hidden = true;
      var ol = $("#checkout-steps"); if (ol) ol.hidden = true;
      var empty = $("#checkout-empty"); if (empty) empty.hidden = false;
      renderSummary();
      return;
    }

    var user = currentUser();
    if (user) {
      form.email.value = user.email;
      form.firstName.value = user.firstName || "";
      form.lastName.value = user.lastName || "";
      form.phone.value = user.phone || "";
      var saved = (user.addresses || [])[0];
      if (saved) {
        form.address1.value = saved.address1 || "";
        form.address2.value = saved.address2 || "";
        form.city.value = saved.city || "";
        form.region.value = saved.region || "";
        form.postcode.value = saved.postcode || "";
        if (saved.country) form.country.value = saved.country;
      }
      var si = $("#checkout-signed-in");
      if (si) { si.hidden = false; var ue = $("[data-checkout-user]"); if (ue) ue.textContent = user.email; }
      var cab = $("#create-account-block"); if (cab) cab.hidden = true;
    }
    /* Sensible default so the required country field is never silently blank. */
    if (form.country && !form.country.value) form.country.value = "Sri Lanka";

    $$("[data-sign-out]", form.parentNode).forEach(function (b) {
      b.addEventListener("click", function () {
        clearSession();
        var si = $("#checkout-signed-in"); if (si) si.hidden = true;
        var cab = $("#create-account-block"); if (cab) cab.hidden = false;
        refreshAccountUI();
        toast("Signed out");
      });
    });

    var ca = $("#create-account");
    if (ca) ca.addEventListener("change", function () {
      var af = $("#account-fields");
      if (af) af.hidden = !ca.checked;
    });

    function goStep(n, scroll) {
      checkoutState.step = n;
      panels.forEach(function (p) { p.hidden = Number(p.getAttribute("data-panel")) !== n; });
      steps.forEach(function (s) {
        var i = Number(s.getAttribute("data-step-ind"));
        s.classList.toggle("is-active", i === n);
        s.classList.toggle("is-done", i < n);
      });
      if (scroll === false) return;
      var top = $("#checkout-steps");
      if (top) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.pageYOffset - 24), behavior: "smooth" });
    }

    $$("[data-step-next]", form).forEach(function (b) {
      b.addEventListener("click", function () {
        var panel = $('[data-panel="' + checkoutState.step + '"]', form);
        if (!validateScope(panel)) return;
        if (checkoutState.step === 1 && ca && ca.checked) {
          var pw = form.password;
          if (!pw.value || pw.value.length < 6) {
            markInvalid(pw, "Use at least 6 characters");
            return;
          }
          var existing = getUser();
          if (existing) {
            if (existing.email.toLowerCase() === form.email.value.trim().toLowerCase()) {
              markInvalid(form.email, "You already have an account — sign in instead");
              toast("That email already has an account. Sign in, or untick create account.");
            } else {
              markInvalid(pw, "This browser already has a demo account. Sign in or check out as a guest.");
              toast("This browser already has an account. Sign in or use guest checkout.");
            }
            return;
          }
        }
        goStep(Math.min(3, checkoutState.step + 1));
      });
    });
    $$("[data-step-back]", form).forEach(function (b) {
      b.addEventListener("click", function () { goStep(Math.max(1, checkoutState.step - 1)); });
    });

    // Delivery option selection
    $$('input[name="delivery"]', form).forEach(function (r) {
      r.addEventListener("change", function () { checkoutState.delivery = r.value; renderSummary(); });
    });

    // Payment method toggle
    $$('input[name="payment"]', form).forEach(function (r) {
      r.addEventListener("change", function () {
        var cf = $("#card-fields");
        if (cf) cf.hidden = r.value !== "card";
      });
    });

    // Billing toggle
    var bs = $("#billing-same");
    if (bs) bs.addEventListener("change", function () {
      var bf = $("#billing-fields");
      if (bf) bf.hidden = bs.checked;
    });

    var termsBox = $("#terms");
    if (termsBox) termsBox.addEventListener("change", function () {
      var line = termsBox.closest(".check-line");
      if (line) line.classList.remove("is-invalid");
    });

    // Promo
    var promoForm = $("#promo-form");
    if (promoForm) promoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var code = ($("#promo-input").value || "").trim().toUpperCase();
      var msg = $("#promo-msg");
      if (!code) return;
      if (PROMOS[code]) {
        checkoutState.promo = code;
        if (msg) { msg.textContent = "Code applied — " + Math.round(PROMOS[code] * 100) + "% off your subtotal."; msg.className = "promo__msg is-on"; }
        toast("Promo code applied");
      } else {
        checkoutState.promo = null;
        if (msg) { msg.textContent = "No promo codes are active right now."; msg.className = "promo__msg is-bad"; }
      }
      renderSummary();
    });

    // Card formatting
    var cn = form.cardNumber, ce = form.cardExpiry;
    if (cn) cn.addEventListener("input", function () {
      var v = cn.value.replace(/\D/g, "").slice(0, 16);
      cn.value = v.replace(/(.{4})/g, "$1 ").trim();
    });
    if (ce) ce.addEventListener("input", function () {
      var v = ce.value.replace(/\D/g, "").slice(0, 4);
      ce.value = v.length > 2 ? v.slice(0, 2) + "/" + v.slice(2) : v;
    });

    // Submit
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (checkoutState.placed || !cart.length) return;
      var panel = $('[data-panel="3"]', form);
      if (!validateScope(panel)) return;

      var method = (form.querySelector('input[name="payment"]:checked') || {}).value || "card";
      var last4 = "";
      if (method === "card") {
        var num = (form.cardNumber.value || "").replace(/\s/g, "");
        var exp = (form.cardExpiry.value || "").trim();
        var cvc = (form.cardCvc.value || "").trim();
        var ok = true;
        if (!/^\d{13,19}$/.test(num)) { markInvalid(form.cardNumber, "Enter a 16-digit card number"); ok = false; }
        if (!/^\d{2}\/\d{2}$/.test(exp)) { markInvalid(form.cardExpiry, "Use MM/YY"); ok = false; }
        else {
          var mm = Number(exp.slice(0, 2)), yy = Number(exp.slice(3));
          var now = new Date(), cy = now.getFullYear() % 100, cm = now.getMonth() + 1;
          if (mm < 1 || mm > 12 || yy < cy || (yy === cy && mm < cm)) { markInvalid(form.cardExpiry, "That date has passed"); ok = false; }
        }
        if (!/^\d{3,4}$/.test(cvc)) { markInvalid(form.cardCvc, "3 or 4 digits"); ok = false; }
        if (!form.cardName.value.trim()) { markInvalid(form.cardName, "Add the name on the card"); ok = false; }
        if (!ok) return;
        last4 = num.slice(-4);
      }

      if (!form.terms.checked) {
        var t = $("#terms");
        if (t) t.closest(".check-line").classList.add("is-invalid");
        toast("Please accept the terms to continue");
        return;
      }

      checkoutState.placed = true;
      placeOrder(form, method, last4);
    });

    renderSummary();
    goStep(1, false);
  }

  function checkoutTotals() {
    var subtotal = cartTotal();
    if (!subtotal) return { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 };
    var rate = checkoutState.promo ? PROMOS[checkoutState.promo] : 0;
    var discount = Math.round(subtotal * rate * 100) / 100;
    var after = subtotal - discount;
    var shipping;
    if (checkoutState.delivery === "standard") shipping = after >= FREE_SHIPPING ? 0 : 450;
    else if (checkoutState.delivery === "express") shipping = 900;
    else shipping = 1500;
    var tax = 0; /* prices are shown as listed; set a tax rule when one is confirmed */
    return { subtotal: subtotal, discount: discount, shipping: shipping, tax: tax, total: after + shipping + tax };
  }

  function renderSummary() {
    var list = $("#summary-items");
    if (!list) return;
    if (!cart.length) {
      list.innerHTML = '<li class="summary__empty">Your bag is empty. <a class="link-underline" href="/shop">Shop the range</a></li>';
    } else {
      list.innerHTML = cart.map(function (l) {
        var p = lineProduct(l), v = lineVariant(l); if (!p || !v) return "";
        return '<li class="summary__item">' +
          '<span class="summary__item-media"><img src="/assets/img/' + v.img + '.svg" alt=""><span class="summary__item-qty">' + l.qty + '</span></span>' +
          '<span><span class="summary__item-name">' + esc(p.name) + '</span><span class="summary__item-meta">' + esc(p.variable ? v.label : p.size) + '</span></span>' +
          '<span class="summary__item-price">' + money(v.price * l.qty) + '</span>' +
          '</li>';
      }).join("");
    }

    var t = checkoutTotals();
    var $sub = $("[data-sum-subtotal]"), $disc = $("[data-sum-discount]"),
        $ship = $("[data-sum-shipping]"), $tax = $("[data-sum-tax]"), $tot = $("[data-sum-total]");
    if ($sub) $sub.textContent = money(t.subtotal);
    if ($disc) $disc.textContent = "−" + money(t.discount);
    if ($ship) $ship.textContent = t.shipping ? money(t.shipping) : "Free";
    if ($tax) $tax.textContent = money(t.tax);
    if ($tot) $tot.textContent = money(t.total);

    var drow = $("[data-sum-discount-row]");
    if (drow) drow.hidden = !t.discount;
    var chip = $("#promo-chip");
    if (chip) chip.textContent = checkoutState.promo || "";

    // Reflect standard shipping price in the radio list
    var std = $('[data-delivery-price]');
    $$("[data-delivery-price]").forEach(function (el) {
      var opt = el.closest(".option");
      var input = opt ? opt.querySelector("input") : null;
      if (!input) return;
      var code = input.value;
      if (code === "standard") el.textContent = t.subtotal - t.discount >= FREE_SHIPPING ? "Free" : money(450);
      else if (code === "express") el.textContent = money(900);
      else el.textContent = money(1500);
    });
  }

  function placeOrder(form, method, last4) {
    var t = checkoutTotals();
    var id = "ICN-" + String(Math.floor(100000 + Math.random() * 900000));
    var now = new Date();
    var deliveryMeta = {
      standard: { label: "Standard delivery", days: 5 },
      express: { label: "Express delivery", days: 2 },
      next: { label: "Next-day delivery", days: 1 }
    }[checkoutState.delivery] || { label: "Standard delivery", days: 5 };

    var user = currentUser();
    var email = form.email.value.trim();
    var name = form.firstName.value.trim() + " " + form.lastName.value.trim();

    var order = {
      id: id,
      date: now.toISOString(),
      email: email,
      phone: form.phone.value.trim(),
      customer: name.trim(),
      items: cart.map(function (l) { return { id: l.id, vid: l.vid, qty: l.qty }; }),
      subtotal: t.subtotal,
      discount: t.discount,
      promo: checkoutState.promo,
      shipping: t.shipping,
      tax: t.tax,
      total: t.total,
      delivery: deliveryMeta.label,
      deliveryDays: deliveryMeta.days,
      eta: addDays(now.toISOString(), deliveryMeta.days),
      payment: { method: method, last4: last4 },
      status: "Confirmed",
      note: form.note ? form.note.value.trim() : "",
      gift: form.gift ? form.gift.checked : false,
      address: {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        address1: form.address1.value.trim(),
        address2: form.address2.value.trim(),
        city: form.city.value.trim(),
        region: form.region.value.trim(),
        postcode: form.postcode.value.trim(),
        country: form.country.value
      }
    };

    var orders = getOrders();
    orders.unshift(order);
    saveOrders(orders);

    // Account creation requested at checkout
    function finish() {
      // Empty the bag
      cart = [];
      saveCart(); renderCart();
      window.location.href = "/order-confirmation?order=" + encodeURIComponent(id);
    }
    if (!user && form.password && form.password.value) {
      var existing = getUser();
      var newUser = {
        firstName: form.firstName.value.trim(),
        lastName: form.lastName.value.trim(),
        email: email,
        salt: randomSalt(),
        passwordHash: "",
        phone: form.phone.value.trim(),
        addresses: [order.address]
      };
      if (existing && existing.email.toLowerCase() === email.toLowerCase()) { finish(); return; }
      setPassword(newUser, form.password.value).then(function () {
        saveUser(newUser);
        setSession(email);
        refreshAccountUI();
        finish();
      });
      return;
    } else if (user) {
      var u = getUser();
      u.addresses = u.addresses || [];
      var dup = u.addresses.some(function (a) { return a.address1 === order.address.address1 && a.postcode === order.address.postcode; });
      if (!dup) { u.addresses.unshift(order.address); saveUser(u); }
    }

    finish();
  }

  /* ============================================================
     Order confirmation
     ============================================================ */
  function initConfirmation() {
    var host = $("#confirm-items");
    if (!host) return;
    var id = new URLSearchParams(location.search).get("order");
    var order = getOrders().filter(function (o) { return o.id === id; })[0];

    if (!order) {
      var note = $("#confirm-empty-note"); if (note) note.hidden = false;
      document.querySelectorAll("#confirm-number,#confirm-items,#confirm-totals,#confirm-address,#confirm-delivery,#confirm-eta,#confirm-payment,#confirm-status,#confirm-date").forEach(function (el) {
        if (el) el.textContent = "—";
      });
      var hero = document.querySelector(".confirm__hero h1");
      if (hero) hero.innerHTML = "Order not found";
      return;
    }

    var nameEl = $("#confirm-name");
    if (nameEl && order.customer) nameEl.textContent = ", " + order.customer.split(" ")[0];
    $("#confirm-number").textContent = order.id;
    $("#confirm-date").textContent = fmtDate(order.date);
    $("#confirm-status").textContent = order.status;

    host.innerHTML = order.items.map(function (l) {
      var p = lineProduct(l), v = lineVariant(l); if (!p || !v) return "";
      return '<li class="order-line">' +
        '<span class="order-line__media"><img src="/assets/img/' + v.img + '.svg" alt=""></span>' +
        '<span><span class="order-line__name">' + esc(p.name) + '</span><span class="order-line__meta">' + esc(p.variable ? v.label : p.size) + ' · Qty ' + l.qty + '</span></span>' +
        '<span class="order-line__price">' + money(v.price * l.qty) + '</span>' +
        '</li>';
    }).join("");

    $("#confirm-totals").innerHTML =
      '<div><dt>Subtotal</dt><dd>' + money(order.subtotal) + '</dd></div>' +
      (order.discount ? '<div><dt>Discount' + (order.promo ? " (" + order.promo + ")" : "") + '</dt><dd>−' + money(order.discount) + '</dd></div>' : "") +
      '<div><dt>Shipping</dt><dd>' + (order.shipping ? money(order.shipping) : "Free") + '</dd></div>' +
      '<div><dt>Tax</dt><dd>' + money(order.tax) + '</dd></div>' +
      '<div class="totals__grand"><dt>Total</dt><dd>' + money(order.total) + '</dd></div>';

    var a = order.address;
    var shipName = [a.firstName, a.lastName].filter(Boolean).join(" ") || a.name || order.customer || "";
    $("#confirm-address").innerHTML = esc(shipName) + "<br>" + esc(a.address1) +
      (a.address2 ? "<br>" + esc(a.address2) : "") + "<br>" + esc(a.city) + ", " + esc(a.region) + " " + esc(a.postcode) + "<br>" + esc(a.country);
    $("#confirm-delivery").textContent = order.delivery;
    $("#confirm-eta").textContent = order.eta;
    var payLabels = { card: "Card ending " + order.payment.last4, paypal: "PayPal", applepay: "Apple Pay", demo: "Demo — no payment taken" };
    $("#confirm-payment").textContent = payLabels[order.payment.method] || "Demo — no payment taken";
  }

  /* ============================================================
     Account
     ============================================================ */
  function initAccount() {
    var authView = $("#auth-view");
    var accountView = $("#account-view");
    if (!authView || !accountView) return;

    var params = new URLSearchParams(location.search);

    function showAuth(tab) {
      authView.hidden = false;
      accountView.hidden = true;
      switchAuthTab(tab || "login");
    }
    function showAccount() {
      authView.hidden = true;
      accountView.hidden = false;
      renderAccount();
      var tab = params.get("tab");
      if (tab) activateTab(tab);
    }

    function switchAuthTab(tab) {
      $$("[data-auth-tab]").forEach(function (b) {
        var on = b.getAttribute("data-auth-tab") === tab;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      $$("[data-auth-panel]").forEach(function (p) { p.hidden = p.getAttribute("data-auth-panel") !== tab; });
      clearError($("#login-error")); clearError($("#register-error"));
    }
    $$("[data-auth-tab]").forEach(function (b) { b.addEventListener("click", function () { switchAuthTab(b.getAttribute("data-auth-tab")); }); });
    $$("[data-auth-go]").forEach(function (b) { b.addEventListener("click", function () { switchAuthTab(b.getAttribute("data-auth-go")); }); });

    // Login
    var lf = $("#login-form");
    if (lf) lf.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError($("#login-error"));
      if (!validateScope(lf)) return;
      var email = lf.email.value.trim().toLowerCase();
      var pass = lf.password.value;
      var u = getUser();
      if (!u || u.email.toLowerCase() !== email) { showError($("#login-error"), "No account found for that email. Create one below."); return; }
      var btn = lf.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Signing in…"; }
      checkPassword(u, pass).then(function (ok) {
        if (btn) { btn.disabled = false; btn.textContent = "Sign in"; }
        if (!ok) { showError($("#login-error"), "That password doesn't match. Try again."); return; }
        setSession(u.email);
        toast("Welcome back, " + u.firstName);
        refreshAccountUI();
        showAccount();
      });
    });

    // Register
    var rf = $("#register-form");
    if (rf) rf.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError($("#register-error"));
      if (!validateScope(rf)) return;
      if (!rf.terms.checked) { showError($("#register-error"), "Please accept the terms to create an account."); return; }
      if (rf.password.value.length < 6) { markInvalid(rf.password, "Use at least 6 characters"); return; }
      if (rf.password.value !== rf.confirm.value) { markInvalid(rf.confirm, "Passwords don't match"); return; }
      var email = rf.email.value.trim().toLowerCase();
      var existing = getUser();
      if (existing && existing.email.toLowerCase() === email) {
        showError($("#register-error"), "An account with that email already exists. Sign in instead.");
        return;
      }
      var u = {
        firstName: rf.firstName.value.trim(),
        lastName: rf.lastName.value.trim(),
        email: rf.email.value.trim(),
        salt: randomSalt(),
        passwordHash: "",
        phone: "",
        addresses: []
      };
      setPassword(u, rf.password.value).then(function () {
        saveUser(u); setSession(u.email);
        toast("Account created — welcome to Iconic Beauty & Baby");
        refreshAccountUI();
        showAccount();
      });
    });

    // Forgot password (demo: no email is sent)
    var ff = $("#forgot-form");
    if (ff) ff.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("#forgot-msg");
      var email = (ff.email.value || "").trim();
      if (!validEmail(email)) {
        if (msg) { msg.textContent = "Enter the email address on your account."; msg.className = "form-msg is-bad"; }
        ff.email.focus(); return;
      }
      if (msg) {
        msg.textContent = "If an account exists for " + email + ", a reset link would be sent. This prototype does not send email.";
        msg.className = "form-msg is-on";
      }
    });

    // Tabs inside dashboard
    function activateTab(name) {
      $$("[data-account-tab]").forEach(function (b) { b.classList.toggle("is-active", b.getAttribute("data-account-tab") === name); });
      $$("[data-account-panel]").forEach(function (p) {
        var on = p.getAttribute("data-account-panel") === name;
        p.classList.toggle("is-active", on);
        p.hidden = !on;
      });
    }
    $$("[data-account-tab]").forEach(function (b) {
      b.addEventListener("click", function () { activateTab(b.getAttribute("data-account-tab")); });
    });
    $$("[data-account-go]").forEach(function (b) {
      b.addEventListener("click", function () { activateTab(b.getAttribute("data-account-go")); });
    });

    // Address book
    var af = $("#address-form");
    if (af) af.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError($("#address-error"));
      var u = currentUser(); if (!u) return;
      if (!af.name.value.trim() || !af.address1.value.trim() || !af.city.value.trim()) {
        showError($("#address-error"), "Add a name, street and city.");
        return;
      }
      u.addresses = u.addresses || [];
      u.addresses.unshift({
        label: af.label.value.trim() || "Address",
        name: af.name.value.trim(),
        address1: af.address1.value.trim(),
        city: af.city.value.trim(),
        region: af.region.value.trim(),
        postcode: af.postcode.value.trim(),
        country: af.country.value
      });
      saveUser(u); af.reset(); toast("Address saved"); renderAccount();
    });

    // Details
    var df = $("#details-form");
    if (df) df.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError($("#details-error"));
      if (!validateScope(df)) return;
      var u = currentUser(); if (!u) return;
      var newEmail = df.email.value.trim();
      var oldEmail = u.email;
      u.firstName = df.firstName.value.trim();
      u.lastName = df.lastName.value.trim();
      u.email = newEmail;
      u.phone = df.phone.value.trim();
      saveUser(u);
      if (oldEmail.toLowerCase() !== newEmail.toLowerCase()) setSession(newEmail);
      toast("Details updated"); refreshAccountUI(); renderAccount();
    });

    // Password
    var pf = $("#password-form");
    if (pf) pf.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError($("#password-error"));
      var u = currentUser(); if (!u) return;
      if (pf.password.value.length < 6) { showError($("#password-error"), "New password needs at least 6 characters."); return; }
      if (pf.password.value !== pf.confirm.value) { showError($("#password-error"), "Passwords don't match."); return; }
      checkPassword(u, pf.current.value).then(function (ok) {
        if (!ok) { showError($("#password-error"), "Current password is incorrect."); return; }
        setPassword(u, pf.password.value).then(function () {
          saveUser(u); pf.reset(); toast("Password updated");
        });
      });
    });

    // Claim a guest order
    var cf = $("#claim-form");
    if (cf) cf.addEventListener("submit", function (e) {
      e.preventDefault();
      var msg = $("#claim-msg");
      var u = currentUser(); if (!u) return;
      var num = (cf.orderNumber.value || "").trim().toUpperCase();
      var email = (cf.email.value || "").trim().toLowerCase();
      var orders = getOrders();
      var found = null;
      orders.forEach(function (o) {
        if ((o.id || "").toUpperCase() === num && (o.email || "").toLowerCase() === email) found = o;
      });
      if (!found) {
        if (msg) { msg.textContent = "No order found with that number and email. Check the confirmation email and try again."; msg.className = "form-msg is-bad"; }
        return;
      }
      found.email = u.email;
      saveOrders(orders);
      cf.reset();
      if (msg) { msg.textContent = "Order " + found.id + " added to your account."; msg.className = "form-msg is-on"; }
      renderAccount();
      toast("Order added to your account");
    });

    // Sign out
    $$("[data-sign-out]").forEach(function (b) {
      b.addEventListener("click", function () {
        clearSession(); refreshAccountUI(); toast("Signed out");
        if ($("#auth-view")) showAuth("login");
      });
    });

    if (currentUser()) showAccount(); else showAuth(params.get("tab") === "register" ? "register" : "login");
  }

  function userOrders(u) {
    if (!u) return [];
    return getOrders().filter(function (o) {
      return (o.email || "").toLowerCase() === u.email.toLowerCase();
    });
  }

  function renderAccount() {
    var u = currentUser();
    if (!u) return;
    var orders = userOrders(u);

    $$("[data-user-first]").forEach(function (el) { el.textContent = u.firstName; });
    $$("[data-user-email]").forEach(function (el) { el.textContent = u.email; });

    var spend = orders.reduce(function (n, o) { return n + o.total; }, 0);
    $$("[data-stat-orders]").forEach(function (el) { el.textContent = orders.length; });
    $$("[data-stat-wish]").forEach(function (el) { el.textContent = wish.length; });
    $$("[data-stat-spend]").forEach(function (el) { el.textContent = money(spend); });

    // Latest order
    var latest = $("#account-latest-order");
    if (latest) latest.innerHTML = orders.length ? orderCardHTML(orders[0], true) : '<p class="empty-inline">No orders yet. <a class="link-underline" href="/shop">Start shopping</a>.</p>';

    // Full history
    var list = $("#account-orders");
    if (list) list.innerHTML = orders.length
      ? orders.map(function (o) { return orderCardHTML(o); }).join("")
      : '<div class="empty-state empty-state--boxed"><h2 class="empty-state__title">No orders yet</h2><p>When you place an order it will appear here.</p><a class="btn" href="/shop">Shop all products</a></div>';

    // Wishlist panel + overview
    renderWishInto("#account-wishlist", 4);
    renderWishInto("#account-overview-wish", 2);

    // Addresses
    var addr = $("#account-addresses");
    if (addr) {
      var list2 = u.addresses || [];
      addr.innerHTML = list2.length ? list2.map(function (a, i) {
        return '<div class="addr-card">' +
          '<div><p class="addr-card__label">' + esc(a.label || "Address") + (i === 0 ? " · default" : "") + '</p>' +
          '<p>' + esc(a.name || (u.firstName + " " + u.lastName)) + "<br>" + esc(a.address1) + "<br>" +
          esc(a.city) + ", " + esc(a.region) + " " + esc(a.postcode) + "<br>" + esc(a.country) + '</p></div>' +
          '<div class="addr-card__actions"><button type="button" data-remove-address="' + i + '">Remove</button></div>' +
          '</div>';
      }).join("") : '<p class="empty-inline">No saved addresses yet.</p>';
    }

    // Details form values
    var df = $("#details-form");
    if (df) {
      df.firstName.value = u.firstName || "";
      df.lastName.value = u.lastName || "";
      df.email.value = u.email || "";
      df.phone.value = u.phone || "";
    }
  }

  function renderWishInto(sel, limit) {
    var host = $(sel);
    if (!host) return;
    var ids = wish.slice(0, limit || wish.length);
    if (!ids.length) {
      host.innerHTML = '<p class="empty-inline">Nothing saved yet. Tap the heart on a product.</p>';
      return;
    }
    host.innerHTML = ids.map(function (id) { var p = byId(id); return p ? cardHTML(p) : ""; }).join("");
    ids.forEach(function (id) {
      $$('[data-wish="' + id + '"]', host).forEach(function (b) { b.classList.add("is-on"); });
    });
  }

  function orderCardHTML(o, compact) {
    var items = o.items.slice(0, compact ? 2 : 6).map(function (l) {
      var p = lineProduct(l), v = lineVariant(l); if (!p || !v) return "";
      return '<div class="order-card__item"><img src="/assets/img/' + v.img + '.svg" alt=""><span class="order-card__name">' + esc(p.name) + (p.variable ? " · " + esc(v.label) : "") + ' × ' + l.qty + '</span><span>' + money(v.price * l.qty) + '</span></div>';
    }).join("");
    var more = o.items.length > (compact ? 2 : 6) ? '<p class="empty-inline">+' + (o.items.length - (compact ? 2 : 6)) + ' more item(s)</p>' : "";
    return '<article class="order-card">' +
      '<div class="order-card__head">' +
        '<div><span class="order-card__id">' + o.id + '</span><br><span class="order-card__date">' + fmtDate(o.date) + '</span></div>' +
        '<div class="order-card__meta"><span class="order-card__total">' + money(o.total) + '</span><span class="status">' + o.status + '</span></div>' +
      '</div>' +
      '<div class="order-card__body">' + items + more + '</div>' +
      '<div class="order-card__actions">' +
        '<button class="btn btn--ghost btn--sm" type="button" data-reorder="' + o.id + '">Buy again</button>' +
        '<a class="btn btn--ghost btn--sm" href="/order-confirmation?order=' + o.id + '">View receipt</a>' +
        '<a class="btn btn--ghost btn--sm" href="/track-order?order=' + o.id + '">Track</a>' +
      '</div>' +
      '</article>';
  }

  /* ============================================================
     Wishlist page
     ============================================================ */
  function renderWishlistPage() {
    var grid = $("#wishlist-grid");
    if (!grid) return;
    var bar = $("#wishlist-toolbar");
    var empty = $("#wishlist-empty");
    if (!wish.length) {
      grid.innerHTML = "";
      grid.hidden = true;
      if (bar) bar.hidden = true;
      if (empty) empty.hidden = false;
      return;
    }
    grid.hidden = false;
    if (empty) empty.hidden = true;
    if (bar) bar.hidden = false;
    var count = $("#wishlist-count");
    if (count) count.textContent = wish.length + (wish.length === 1 ? " saved item" : " saved items");
    $$("[data-wish-count]").forEach(function (el) { el.textContent = wish.length; });
    grid.innerHTML = wish.map(function (id) { var p = byId(id); return p ? cardHTML(p) : ""; }).join("");
    wish.forEach(function (id) { $$('[data-wish="' + id + '"]').forEach(function (b) { b.classList.add("is-on"); }); });
  }

  function initWishlistPage() {
    if (!$("#wishlist-grid")) return;
    renderWishlistPage();

    var sug = $("#wishlist-suggestions");
    if (sug) {
      sug.innerHTML = PRODUCTS.slice(0, 8).map(function (p) {
        return '<div class="pcarousel__cell">' + cardHTML(p) + "</div>";
      }).join("");
    }

    var addAll = $("#wishlist-add-all");
    if (addAll) addAll.addEventListener("click", function () {
      if (!wish.length) return;
      wish.forEach(function (id) {
        var p = byId(id); if (!p) return;
        var v = defaultVariant(p);
        if (!v || v.stock <= 0) return;
        var line = cart.filter(function (l) { return lineKey(l.id, l.vid) === lineKey(id, v.vid); })[0];
        if (line) line.qty = Math.min(line.qty + 1, v.stock);
        else cart.push({ id: id, vid: v.vid, qty: 1 });
      });
      saveCart(); renderCart(); toast("Wishlist added to your bag"); openCart();
    });
  }

  /* ============================================================
     Track order
     ============================================================ */
  function initTrack() {
    var form = $("#track-form");
    if (!form) return;

    var pre = new URLSearchParams(location.search).get("order");
    if (pre) { form.number.value = pre; }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError($("#track-error"));
      if (!validateScope(form)) return;
      var num = form.number.value.trim().toUpperCase();
      var email = form.email.value.trim().toLowerCase();
      var order = getOrders().filter(function (o) {
        return o.id.toUpperCase() === num && o.email.toLowerCase() === email;
      })[0];
      if (!order) {
        showError($("#track-error"), "We couldn't find that order. Check the number and use the email you ordered with.");
        return;
      }
      var host = $("#track-result");
      var days = (Date.now() - new Date(order.date).getTime()) / 86400000;
      var stage = days >= 3 ? 3 : days >= 1 ? 2 : 1;
      var steps = [
        ["Order recorded", "Saved in this browser only."],
        ["No payment taken", "This is a demo checkout."],
        ["No parcel shipped", "Nothing will be delivered."],
        ["Demo complete", "No further updates will appear."]
      ];
      host.hidden = false;
      host.innerHTML = '<div class="track-card">' +
        '<div class="track-card__head"><div><p class="eyebrow">Order ' + order.id + '</p><h2>' + esc(order.delivery) + '</h2></div><span class="status">Demo</span></div>' +
        '<p class="confirm__value" style="margin-bottom:18px">Estimated arrival <b>' + order.eta + '</b> · ' + esc(order.customer) + '</p>' +
        '<ol class="track-steps">' + steps.map(function (s, i) {
          return '<li class="track-step' + (i < stage ? " is-done" : "") + '"><b>' + s[0] + '</b><span>' + s[1] + '</span></li>';
        }).join("") + '</ol>' +
        '<div class="order-card__actions" style="padding:0">' +
          '<a class="btn btn--ghost btn--sm" href="/order-confirmation?order=' + order.id + '">View receipt</a>' +
          '<a class="btn btn--ghost btn--sm" href="/contact">Need help?</a>' +
        '</div></div>';
      host.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ============================================================
     Content page forms
     ============================================================ */
  function initContentForms() {
    var cf = $("#contact-form");
    if (cf) cf.addEventListener("submit", function (e) {
      e.preventDefault();
      clearError($("#contact-error"));
      if (!validateScope(cf)) return;
      if (!cf.message.value.trim()) { markInvalid(cf.message, "Tell us a little more"); return; }
      var msg = $("#contact-msg");
      try { localStorage.setItem("iconic-contact", JSON.stringify({ name: cf.name.value.trim(), email: cf.email.value.trim(), topic: cf.topic ? cf.topic.value : "", message: cf.message.value.trim(), at: new Date().toISOString() })); } catch (err) {}
      cf.reset();
      if (msg) { msg.textContent = "Message saved in this browser. This demo does not send email — to reach the business, use the postal address shown on the contact page."; msg.className = "form-msg is-on"; }
      toast("Message saved — this demo does not send email");
    });

    $$("[data-feedback]").forEach(function (b) {
      b.addEventListener("click", function () {
        $$("[data-feedback]").forEach(function (x) { x.disabled = true; });
        toast(b.getAttribute("data-feedback") === "yes" ? "Glad it helped" : "Thanks — we'll improve it");
      });
    });

    // Reorder buttons anywhere
    document.addEventListener("click", function (e) {
      var r = e.target.closest("[data-reorder]");
      if (!r) return;
      var o = getOrders().filter(function (x) { return x.id === r.getAttribute("data-reorder"); })[0];
      if (!o) return;
      o.items.forEach(function (l) {
        var p = byId(l.id); if (!p) return;
        var v = variantOf(p, l.vid);
        if (!v || v.stock <= 0) return;
        var line = cart.filter(function (c) { return lineKey(c.id, c.vid) === lineKey(l.id, v.vid); })[0];
        if (line) line.qty = Math.min(line.qty + l.qty, v.stock);
        else cart.push({ id: l.id, vid: v.vid, qty: Math.min(l.qty, v.stock) });
      });
      saveCart(); renderCart(); toast("Added to your bag"); openCart();
    });

    document.addEventListener("click", function (e) {
      var rm = e.target.closest("[data-remove-address]");
      if (!rm) return;
      var u = currentUser(); if (!u) return;
      var i = Number(rm.getAttribute("data-remove-address"));
      u.addresses.splice(i, 1); saveUser(u); renderAccount();
    });
  }

  /* ============================================================
     Compare page
     ============================================================ */
  function typeLabels(p) {
    var meta = CATEGORY_META[p.cats[0]];
    if (!meta) return "";
    return p.types.map(function (key) {
      var t = meta.types.filter(function (x) { return x.key === key; })[0];
      return t ? t.label : key.replace(/-/g, " ");
    }).filter(Boolean).join(", ");
  }

  function renderComparePage() {
    var host = $("#compare-body");
    if (!host) return;
    var ids = compareIds();
    var empty = $("#compare-empty"), wrap = $("#compare-wrap");
    $$("[data-compare-count]").forEach(function (el) { el.textContent = ids.length; });
    if (!ids.length) {
      if (empty) empty.hidden = false;
      if (wrap) wrap.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = false;

    var head = $("#compare-head");
    if (head) head.innerHTML = '<tr><th class="compare-table__corner"><span>Compare</span><small>' + ids.length + " of 4</small></th>" + ids.map(function (id) {
      var p = byId(id); if (!p) return "";
      var info = priceInfo(p);
      return '<th><div class="compare-product">' +
        '<button type="button" class="compare-product__remove" data-compare-remove="' + p.id + '" aria-label="Remove ' + p.name + '">×</button>' +
        '<a class="compare-product__media" href="' + productHref(p) + '"><img src="/assets/img/' + p.img + '.svg" alt=""></a>' +
        '<a class="compare-product__name" href="' + productHref(p) + '">' + esc(p.name) + "</a>" +
        '<span class="price">' + (info.from ? "From " : "") + money(info.price) + "</span>" +
        (p.variable
          ? '<button class="btn btn--ghost btn--sm" type="button" data-choose="' + p.id + '">Choose options</button>'
          : '<button class="btn btn--sm" type="button" data-add="' + p.id + '">Add to cart</button>') +
        "</div></th>";
    }).join("") + "</tr>";

    var rows = [
      ["Price", function (p) {
        var i = priceInfo(p);
        return (i.from ? "From " : "") + money(i.price) + (i.was ? ' <del>' + money(i.was) + "</del>" : "");
      }],
      ["Rating", function (p) { return stars(p.rating) + ' <span class="compare-muted">' + p.rating + " · " + p.reviews + " reviews</span>"; }],
      ["Category", function (p) { return CAT_LABELS[p.cats[0]] || "—"; }],
      ["Type", function (p) { return typeLabels(p) || "—"; }],
      ["Options", function (p) {
        return p.variable ? p.variants.filter(inStock).length + " in stock of " + p.variants.length + " options" : "One size";
      }],
      ["Sizes", function (p) {
        if (p.variable && p.options[0] && p.options[0].type === "size") {
          return p.variants.map(function (v) { return v.label; }).join(", ");
        }
        return p.size || "—";
      }],
      ["Stock", function (p) {
        if (!p.totalStock) return '<span class="compare-out">Sold out</span>';
        return p.totalStock <= 12 ? '<span class="compare-low">Only ' + p.totalStock + " left</span>" : '<span class="compare-in">In stock</span>';
      }],
      ["Key benefit", function (p) { return esc(p.desc); }],
      ["Shades", function (p) {
        var g = null;
        p.options.forEach(function (x) { if (x.type === "shade") g = x; });
        if (!g) return "—";
        return '<span class="compare-shades">' + g.values.map(function (v) {
          return '<span class="compare-swatch" style="background:' + v.swatch + '" title="' + esc(v.label) + '"><span class="sr-only">' + esc(v.label) + "</span></span>";
        }).join("") + "</span>";
      }],
      ["SKU", function (p) { var v = defaultVariant(p); return v ? v.sku : "—"; }]
    ];
    host.innerHTML = rows.map(function (row) {
      return "<tr><th>" + row[0] + "</th>" + ids.map(function (id) {
        var p = byId(id); return '<td>' + (p ? row[1](p) : "—") + "</td>";
      }).join("") + "</tr>";
    }).join("");
  }

  function initComparePage() {
    if (!$("#compare-page")) return;
    var sug = $("#compare-suggest");
    if (sug) {
      sug.innerHTML = PRODUCTS.slice().sort(function (a, b) { return b.sold - a.sold; })
        .slice(0, 5).map(cardHTML).join("");
    }
    renderComparePage();
    var clear = $("#compare-clear");
    if (clear) clear.addEventListener("click", function () {
      writeIdList(COMPARE_KEY, []);
      $$("[data-compare]").forEach(function (b) { b.classList.remove("is-on"); b.setAttribute("aria-pressed", "false"); });
      renderComparePage();
      toast("Compare cleared");
    });
  }

  function initNotFound() {
    var grid = $("#notfound-grid");
    if (!grid) return;
    grid.innerHTML = PRODUCTS.slice().sort(function (a, b) { return b.sold - a.sold; })
      .slice(0, 5).map(cardHTML).join("");
  }

  /* ============================================================
     Floating actions + WhatsApp chat
     ============================================================ */
  function initFloating() {
    var top = $("#back-to-top");
    if (top) {
      var onScroll = function () { top.classList.toggle("is-visible", window.scrollY > 520); };
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
    }

  }

  /* ============================================================
     Store locator, loyalty, ingredients, gift cards
     ============================================================ */
  function initStores() {
    var search = $("#store-search");
    if (!search) return;
    var cards = $$("[data-store]");
    var count = $("#store-count");
    function apply() {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var hay = (card.getAttribute("data-store") || "").toLowerCase();
        var show = !q || hay.indexOf(q) > -1;
        card.hidden = !show;
        if (show) shown++;
      });
      if (count) count.textContent = shown + (shown === 1 ? " store" : " stores") + (q ? " matching “" + search.value.trim() + "”" : " island-wide");
      var empty = $("#store-empty");
      if (empty) empty.hidden = shown > 0;
    }
    search.addEventListener("input", apply);
    apply();
  }

  function initLoyalty() {
    var form = $("#loyalty-form");
    if (!form) return;
    var saved = localStorage.getItem("iconic-loyalty");
    var status = $("#loyalty-status");
    if (saved && status) { status.hidden = false; status.textContent = "You're on the list as " + saved + " · 250 welcome points added."; }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (form.email.value || "").trim();
      if (!validEmail(email)) { toast("Enter a valid email address"); form.email.focus(); return; }
      try { localStorage.setItem("iconic-loyalty", email); } catch (err) {}
      form.reset();
      if (status) { status.hidden = false; status.textContent = "You're on the list as " + email + " · 250 welcome points added."; }
      toast("Welcome to the glow club");
    });
  }

  function initIngredients() {
    var search = $("#ingredient-search");
    if (!search) return;
    var cards = $$(".ingredient-card");
    var count = $("#ingredient-count");
    function apply() {
      var q = search.value.trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var show = !q || card.textContent.toLowerCase().indexOf(q) > -1;
        card.hidden = !show;
        if (show) shown++;
      });
      if (count) count.textContent = shown + " ingredient" + (shown === 1 ? "" : "s");
      var empty = $("#ingredient-empty");
      if (empty) empty.hidden = shown > 0;
    }
    search.addEventListener("input", apply);
    apply();
  }

  function initGiftCards() {
    var form = $("#gift-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var to = (form.recipient.value || "").trim();
      var msg = (form.message.value || "").trim();
      if (!validEmail(to)) { toast("Add a valid recipient email"); form.recipient.focus(); return; }
      try { localStorage.setItem("iconic-gift", JSON.stringify({ to: to, message: msg })); } catch (err) {}
      toast("Gift details saved — add a card to your bag");
    });
  }

  /* ---------- Full cart page ---------- */
  function renderCartPage() {
    var host = $("#cart-page-items");
    if (!host) return;
    var empty = $("#cart-page-empty"), wrap = $("#cart-page-wrap");
    if (!cart.length) {
      if (empty) empty.hidden = false;
      if (wrap) wrap.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = false;
    host.innerHTML = cart.map(function (l) {
      var p = lineProduct(l), v = lineVariant(l); if (!p || !v) return "";
      var key = lineKey(p.id, v.vid);
      return '<article class="cart-line" data-line="' + key + '">' +
        '<a class="cart-line__media" href="' + productHref(p) + '">' + imgTag(v.img, p.name) + "</a>" +
        '<div class="cart-line__body">' +
          '<p class="cart-line__brand">' + esc(brandName(p.brand)) + "</p>" +
          '<h2 class="cart-line__title"><a href="' + productHref(p) + '">' + esc(p.name) + "</a></h2>" +
          '<p class="cart-line__meta">' + esc(p.variable ? v.label : p.size) + " · " + esc(v.sku) + "</p>" +
          '<div class="cart-line__row">' +
            '<div class="qty"><button type="button" data-dec="' + key + '" aria-label="Decrease quantity">−</button><span>' + l.qty + '</span><button type="button" data-inc="' + key + '" aria-label="Increase quantity">+</button></div>' +
            '<span class="cart-line__price">' + money(v.price * l.qty) + "</span>" +
          "</div>" +
          '<button type="button" class="cart-line__remove" data-remove="' + key + '">Remove</button>' +
        "</div></article>";
    }).join("");
    var t = checkoutTotals();
    var sub = $("[data-cart-subtotal]"); if (sub) sub.textContent = money(t.subtotal);
    var ship = $("[data-cart-shipping]"); if (ship) ship.textContent = t.shipping ? money(t.shipping) : "Free";
    var tot = $("[data-cart-grand]"); if (tot) tot.textContent = money(t.subtotal + t.shipping);
    var remaining = Math.max(0, FREE_SHIPPING - t.subtotal);
    var bar = $("#cart-page-bar");
    if (bar) bar.style.width = Math.min(100, (t.subtotal / FREE_SHIPPING) * 100) + "%";
    var msg = $("#cart-page-ship");
    if (msg) msg.innerHTML = remaining > 0
      ? "You're <b>" + money(remaining) + "</b> away from free standard shipping."
      : "<b>Free standard shipping unlocked.</b>";
  }
  function initCartPage() {
    if (!$("#cart-page-items")) return;
    renderCartPage();
    document.addEventListener("click", function (e) {
      if (!e.target.closest("#cart-page")) return;
      renderCartPage();
    });
  }

  /* ---------- Boot ---------- */
  function boot() {
    renderGrids();
    renderHomeRows();
    renderOffers();
    renderCart();
    initHeader();
    initHero();
    initCarousels();
    initTabs();
    initCountdowns();
    initFilterToggles();
    initShop();
    initCategoryPage();
    renderBrandsPage();
    initBrandPage();
    initDealsPage();
    initPDP();
    renderMini();
    initPopup();
    initMisc();
    refreshAccountUI();
    initCheckoutLinks();
    initCheckout();
    initConfirmation();
    initCartPage();
    initAccount();
    initWishlistPage();
    initTrack();
    initContentForms();
    initComparePage();
    initNotFound();
    initFloating();
    initStores();
    initLoyalty();
    initIngredients();
    initGiftCards();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
