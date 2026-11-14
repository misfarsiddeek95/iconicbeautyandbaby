import type { Brand } from "@/lib/site";

/**
 * Brand landing page shell, matching `brand-<id>.html` from the static build.
 * `app.js` fills the grid, category filters and the "other brands" row from the
 * catalogue as soon as the page boots; the copy below is server-rendered so the
 * page remains useful (and indexable) before JavaScript runs.
 */
export default function BrandView({ brand }: { brand: Brand }) {
  return (
    <main id="main-content" data-brand-page={brand.id}>
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <a href="/brands">Brands</a>
          <span>/</span>
          <span className="is-current" id="brand-crumb">
            {brand.name}
          </span>
        </nav>

        <section className="brand-hero">
          <span className="brand-hero__logo">
            <img
              id="brand-logo"
              src={`/assets/img/${brand.img}.svg`}
              alt={brand.name}
              width={200}
              height={200}
              loading="lazy"
              decoding="async"
            />
          </span>
          <div>
            <h1 id="brand-name">{brand.name}</h1>
            <p className="brand-hero__tagline" id="brand-tag">
              {brand.tag}
            </p>
            <p className="brand-hero__blurb" id="brand-blurb">
              {brand.blurb}
            </p>
          </div>
        </section>
      </div>

      <div className="container shop-layout">
        <aside className="filters" aria-label="Filters">
          <div className="filters__head">
            <span>Filters</span>
            <button
              type="button"
              className="filters__toggle"
              data-toggle-filters
              aria-expanded="false"
              aria-controls="brand-filters-body"
            >
              Show
            </button>
          </div>
          <div className="filters__body" id="brand-filters-body">
            <details className="filter-block" open>
              <summary>Category</summary>
              <div className="filter-scroll" id="brand-cat-filters" />
            </details>
            <details className="filter-block" open>
              <summary>Price</summary>
              <div className="filter-block__body">
                <label className="check">
                  <input type="radio" name="brand-price" defaultValue="all" defaultChecked />{" "}
                  All prices
                </label>
                <label className="check">
                  <input type="radio" name="brand-price" defaultValue="u1000" /> Under
                  Rs 1,000
                </label>
                <label className="check">
                  <input type="radio" name="brand-price" defaultValue="1000-3000" /> Rs
                  1,000 – 3,000
                </label>
                <label className="check">
                  <input type="radio" name="brand-price" defaultValue="3000-6000" /> Rs
                  3,000 – 6,000
                </label>
                <label className="check">
                  <input type="radio" name="brand-price" defaultValue="6000p" /> Rs
                  6,000 and up
                </label>
              </div>
            </details>
            <details className="filter-block" open>
              <summary>Size</summary>
              <div className="filter-block__body">
                <div className="chip-row" role="group" aria-label="Size">
                  <button
                    className="chip"
                    type="button"
                    data-size-chip="small"
                    aria-pressed="false"
                  >
                    Under 30 ml
                  </button>
                  <button
                    className="chip"
                    type="button"
                    data-size-chip="medium"
                    aria-pressed="false"
                  >
                    30–60 ml
                  </button>
                  <button
                    className="chip"
                    type="button"
                    data-size-chip="large"
                    aria-pressed="false"
                  >
                    100 ml+
                  </button>
                </div>
              </div>
            </details>
            <details className="filter-block" open>
              <summary>Availability</summary>
              <div className="filter-block__body">
                <label className="check">
                  <input type="checkbox" id="brand-instock" /> In stock only
                </label>
              </div>
            </details>
            <button
              className="btn btn--ghost btn--sm"
              type="button"
              id="brand-clear"
            >
              Clear all filters
            </button>
          </div>
        </aside>

        <div>
          <div className="toolbar">
            <p className="toolbar__count" id="brand-count">
              Showing {brand.count} products
            </p>
            <div className="toolbar__right">
              <label className="sr-only" htmlFor="brand-sort">
                Sort by
              </label>
              <select className="select" id="brand-sort" defaultValue="default">
                <option value="default">Default sorting</option>
                <option value="low">Price: low to high</option>
                <option value="high">Price: high to low</option>
                <option value="rating">Top rated</option>
                <option value="discount">Biggest saving</option>
              </select>
            </div>
          </div>

          <h2 className="sr-only">Products by brand</h2>
          <div className="shop-grid" id="brand-grid" />

          <section className="section section--tight">
            <div className="section-head">
              <h2 className="section-head__title">Explore other brands</h2>
              <a className="link-underline" href="/brands">
                All brands
              </a>
            </div>
            <div className="brand-others" id="brand-others" />
          </section>
        </div>
      </div>
    </main>
  );
}
