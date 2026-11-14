import type { Product } from "@/lib/site";
import { money, relatedProducts, totalStock } from "@/lib/site";

/**
 * Product detail page.
 *
 * The markup mirrors the pages the static build produced for every one of the
 * 798 products. React renders the crawlable copy (title, price, benefits,
 * description, specification, delivery notes and related links); the shared
 * vanilla `app.js` then takes over the gallery, variant picker, reviews and
 * cart buttons using the same element ids as before.
 */
export default function ProductView({ product }: { product: Product }) {
  const prices = product.variants.map((v) => Number(v.price));
  const lo = Math.min(...prices);
  const hi = Math.max(...prices);
  const hasWas = product.variants.some((v) => Number(v.was ?? 0) > 0);
  const wasLo = hasWas
    ? Math.min(...product.variants.map((v) => Number(v.was || v.price)))
    : 0;
  const discount = wasLo > lo ? Math.round((1 - lo / wasLo) * 100) : 0;
  const stock = totalStock(product);
  const benefits = product.content?.benefits ?? [];
  const descLong = product.desc_long ?? [];
  const related = relatedProducts(product, 12);

  const name = product.name;
  const brand = product.brand || "Iconic";
  const catLabel = product.cat_label || "Beauty";
  const size = product.size || "See pack";
  const skuText = product.variants.map((v) => v.sku ?? "").join(", ");
  const minPriceLabel = (hi !== lo ? "From " : "") + money(lo);
  const shipNote = `${name} from ${brand} ships from our Colombo 02 store to any address in Sri Lanka. Delivery options and rates for ${name} are confirmed at checkout when the live store opens; this demo uses sample rates.`;
  const returnsNote = `Returns for ${name} from ${brand} are handled by our Colombo 02 team. The full returns policy for ${name} is being finalised, so please contact us before sending anything back.`;

  return (
    <main id="main-content">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <a href="/shop">Shop</a>
          <span>/</span>
          <a href={`/categories/${product.cat}`} id="pdp-cat-link">
            <span id="pdp-cat-crumb">{catLabel}</span>
          </a>
          <span>/</span>
          <span className="is-current" id="pdp-crumb">
            Product
          </span>
        </nav>

        <div className="pdp" id="pdp" data-product-id={product.id}>
          <div className="gallery">
            <div className="gallery__thumbs" id="pdp-thumbs">
              <button className="thumb is-on" type="button" aria-label="View image 1">
                <img
                  src={`/assets/img/${product.img}.svg`}
                  alt=""
                  width={600}
                  height={600}
                  loading="lazy"
                  decoding="async"
                />
              </button>
            </div>
            <div className="gallery__main">
              <img
                id="pdp-main-img"
                src={`/assets/img/${product.img}.svg`}
                alt={name}
                width={600}
                height={600}
                loading="eager"
                fetchPriority="high"
                decoding="async"
              />
              <button className="gallery__zoom" type="button" aria-label="Zoom image">
                <svg viewBox="0 0 24 24">
                  <circle cx={11} cy={11} r={7} />
                  <path d="M20 20l-3.6-3.6M11 8v6M8 11h6" />
                </svg>
              </button>
            </div>
          </div>

          <div
            className="gallery-lightbox"
            id="gallery-lightbox"
            hidden
            role="dialog"
            aria-modal="true"
            aria-label="Product image"
          >
            <button
              className="gallery-lightbox__close"
              id="gallery-lightbox-close"
              data-close-lightbox
              aria-label="Close image"
              type="button"
            >
              ×
            </button>
            <img
              id="gallery-lightbox-img"
              src="/assets/img/dropper-amber.svg"
              alt=""
              width={600}
              height={600}
              loading="lazy"
              decoding="async"
            />
          </div>

          <div className="pdp__info">
            <p className="pdp__brand">
              Brand:{" "}
              <a id="pdp-brand-link" href="/brands">
                <b id="pdp-brand">{brand}</b>
              </a>{" "}
              · <span id="pdp-size">{size}</span>
            </p>
            <h1 className="pdp__title" id="pdp-title">
              {name}
            </h1>
            <div className="pdp__rating" id="pdp-rating" />
            <div className="pdp__price">
              <b id="pdp-price">{minPriceLabel}</b>
              <del id="pdp-was" hidden={!discount}>
                {discount ? money(wasLo) : "Rs 0"}
              </del>
              <span className="pdp__save" id="pdp-save" hidden={!discount}>
                Save {discount}%
              </span>
            </div>
            <div className="pdp__stockrow">
              <span className="pdp__stock" id="pdp-stock">
                {stock > 0 ? "In stock" : "Sold out"}
              </span>
              <span className="pdp__sku" id="pdp-sku">
                SKU: —
              </span>
            </div>
            <p className="pdp__sold" id="pdp-sold" />
            <ul className="pdp__list" id="pdp-benefits">
              {benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
            <div className="pdp-options" id="pdp-options" />
            <div className="pdp__buy">
              <div className="qty">
                <button type="button" id="pdp-dec" aria-label="Decrease quantity">
                  −
                </button>
                <span id="pdp-qty-val">1</span>
                <button type="button" id="pdp-inc" aria-label="Increase quantity">
                  +
                </button>
              </div>
              <button className="btn" id="pdp-add" type="button">
                Add to cart
              </button>
            </div>
            <div className="pdp__buy-2">
              <button className="btn btn--dark" id="pdp-buy" type="button">
                Buy it now
              </button>
            </div>
            <div className="backstock" id="pdp-backstock" hidden>
              <p>
                <b>This option is sold out.</b> Leave your email and we&apos;ll tell
                you when it is back. This demo stores the request in this browser
                only.
              </p>
              <form id="backstock-form" className="backstock__form" noValidate>
                <label className="field field--inline">
                  <span className="field__label sr-only">Email address</span>
                  <input
                    className="input"
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>
                <button className="btn btn--ghost" type="submit">
                  Notify me
                </button>
              </form>
              <p className="form-msg" id="backstock-msg" role="status" />
            </div>
            <div className="pdp__links">
              <button
                type="button"
                className="pdp__link"
                id="pdp-compare"
                aria-pressed="false"
              >
                <svg viewBox="0 0 24 24">
                  <path d="M4 7h16M4 12h16M4 17h10" />
                </svg>
                Compare
              </button>
              <button type="button" className="pdp__link" data-wish={product.id}>
                <svg viewBox="0 0 24 24">
                  <path d="M12 20s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 7.5 3.4c0 5-7.5 9.6-7.5 9.6z" />
                </svg>
                Wishlist
              </button>
              <button type="button" className="pdp__link" id="pdp-share">
                <svg viewBox="0 0 24 24">
                  <circle cx={18} cy={5} r={2.5} />
                  <circle cx={6} cy={12} r={2.5} />
                  <circle cx={18} cy={19} r={2.5} />
                  <path d="M8.2 10.8l7.6-4.6M8.2 13.2l7.6 4.6" />
                </svg>
                Share
              </button>
              <a className="pdp__link" href="/compare">
                Compare list <span data-compare-count>0</span>
              </a>
            </div>
            <div className="pdp__meta">
              <div id="pdp-cosmeta" className="pdp-cosmeta" />
              <p>
                <svg viewBox="0 0 24 24">
                  <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
                  <circle cx={12} cy={12} r={3} />
                </svg>
                <span>In stock — see the stock count on this page</span>
              </p>
              <p>
                <svg viewBox="0 0 24 24">
                  <rect x={2.5} y={6} width={19} height={13} rx={2} />
                  <path d="M2.5 11h19" />
                </svg>
                <span>Delivery options shown at checkout</span>
              </p>
              <p>
                <svg viewBox="0 0 24 24">
                  <path d="M3 8h11v8H3z" />
                  <path d="M14 11h4l3 3v2h-7z" />
                  <circle cx={7} cy={17.5} r={1.6} />
                  <circle cx={17.5} cy={17.5} r={1.6} />
                </svg>
                <span>Delivery across Sri Lanka</span>
              </p>
            </div>
            <div className="pdp__trust">
              <div>
                <svg viewBox="0 0 24 24">
                  <path d="M3 8h11v8H3z" />
                  <path d="M14 11h4l3 3v2h-7z" />
                  <circle cx={7} cy={17.5} r={1.6} />
                  <circle cx={17.5} cy={17.5} r={1.6} />
                </svg>
                Delivery across Sri Lanka
              </div>
            </div>
          </div>

          <aside className="pdp__aside">
            <div className="aside-products">
              <h2>You might also like</h2>
              <div className="aside-products__list" id="aside-list" />
            </div>
          </aside>
        </div>

        <section className="pdp-tabs">
          <div className="pdp-tabs__nav" role="tablist">
            <button className="is-active" data-pdp-tab="desc">
              Description
            </button>
            <button data-pdp-tab="ing">Details</button>
            <button data-pdp-tab="rev">Reviews</button>
            <button data-pdp-tab="ship">Shipping &amp; returns</button>
          </div>

          <div className="pdp-tab-panel" data-pdp-panel="desc">
            <div id="pdp-desc-long">
              {descLong.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </div>

          <div className="pdp-tab-panel" data-pdp-panel="ing" hidden>
            <table className="spec-table">
              <tbody id="pdp-spec">
                <tr>
                  <th>Brand</th>
                  <td>{brand}</td>
                </tr>
                <tr>
                  <th>Category</th>
                  <td>{catLabel}</td>
                </tr>
                <tr>
                  <th>Size</th>
                  <td>{size}</td>
                </tr>
                <tr>
                  <th>SKU</th>
                  <td>{skuText}</td>
                </tr>
              </tbody>
            </table>
            <div className="pdp-warning" id="pdp-warning-box" hidden>
              <h4>Warnings &amp; safe use</h4>
              <p id="pdp-warning" />
            </div>
          </div>

          <div className="pdp-tab-panel" data-pdp-panel="how" hidden>
            <p id="pdp-how" />
            <h4>Good to know</h4>
            <ul id="pdp-good" />
            <div className="pdp-warning pdp-warning--inline" id="pdp-warning-box-2">
              <h4>Warnings &amp; safe use</h4>
              <p id="pdp-warning-2" />
            </div>
          </div>

          <div className="pdp-tab-panel" data-pdp-panel="rev" hidden>
            <div className="reviews-layout">
              <div>
                <div className="reviews-head">
                  <div id="pdp-review-avg" className="reviews-avg" />
                  <p id="pdp-review-count" className="reviews-count">
                    0 reviews
                  </p>
                </div>
                <div id="pdp-reviews" className="review-list" />
              </div>
              <aside className="review-form-wrap">
                <h4>Write a review</h4>
                <p className="review-form__lead">
                  Used this formula? Tell the next person what to expect.
                </p>
                <form id="review-form" className="review-form" noValidate>
                  <label className="field">
                    <span className="field__label">Your name</span>
                    <input
                      className="input"
                      name="reviewer"
                      type="text"
                      placeholder="e.g. Sam R."
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">Rating</span>
                    <select className="select" name="rating" defaultValue="5">
                      <option value="5">★★★★★ — Love it</option>
                      <option value="4">★★★★☆ — Good</option>
                      <option value="3">★★★☆☆ — Okay</option>
                      <option value="2">★★☆☆☆ — Not for me</option>
                      <option value="1">★☆☆☆☆ — Disappointed</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field__label">Your review</span>
                    <textarea
                      className="input"
                      name="body"
                      rows={4}
                      placeholder="Texture, results, who you'd recommend it to…"
                      required
                      defaultValue=""
                    />
                  </label>
                  <p className="review-msg" id="review-msg" />
                  <button className="btn btn--block" type="submit">
                    Publish review
                  </button>
                  <p className="review-form__fine">
                    Reviews are stored in this browser only — this is a prototype.
                  </p>
                </form>
              </aside>
            </div>
          </div>

          <div className="pdp-tab-panel" data-pdp-panel="ship" hidden>
            <p id="pdp-ship-note">{shipNote}</p>
            <h4>Returns</h4>
            <p id="pdp-returns-note">{returnsNote}</p>
          </div>
        </section>

        <section className="section section--tight">
          <div className="section-head">
            <h2 className="section-head__title">You may also like</h2>
            <a className="link-underline" href="/shop">
              Shop all
            </a>
          </div>
          <div className="pcarousel" id="pdp-related" />
        </section>

        <section className="section section--tight" id="recent-section" hidden>
          <div className="section-head">
            <h2 className="section-head__title">Recently viewed</h2>
            <a className="link-underline" href="/shop">
              Keep browsing
            </a>
          </div>
          <div className="pcarousel" id="recent-grid" />
        </section>
      </div>
      <div
        className="sticky-atc"
        id="sticky-atc"
        role="region"
        aria-label="Add to cart"
      >
        <div className="sticky-atc__info">
          <span className="sticky-atc__name" id="sticky-atc-name" />
          <b className="sticky-atc__price" id="sticky-atc-price" />
        </div>
        <button className="btn" type="button" id="sticky-atc-btn">
          Add to cart
        </button>
      </div>
      {related.length > 0 && (
        <section className="section seo-more" aria-labelledby="seo-more-title">
          <div className="container">
            <div className="seo-more__panel">
              <header className="seo-more__head">
                <div>
                  <p className="eyebrow">Keep exploring</p>
                  <h2 id="seo-more-title">More in {catLabel}</h2>
                  <p className="seo-more__lead">
                    A few more picks from the same shelf, with the price you pay in store.
                  </p>
                </div>
                <a className="btn btn--ghost btn--sm" href={`/categories/${product.cat}`}>
                  View all {catLabel}
                </a>
              </header>
              <ul className="seo-more__grid">
                {related.map((item) => (
                  <li key={item.id}>
                    <a className="seo-more__link" href={`/products/${item.id}`}>
                      <span className="seo-more__name">{item.name}</span>
                      <span className="seo-more__price">{money(item.price)}</span>
                      <span className="seo-more__arrow" aria-hidden="true">
                        →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
