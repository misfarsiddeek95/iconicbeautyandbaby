import { brandProducts, brands, products, totalStock } from "@/lib/site";
import BrandsExplorer, { type BrandItem } from "./BrandsExplorer";

export default function BrandsBrowse() {
  const list: BrandItem[] = brands
    .map((brand) => {
      const items = brandProducts(brand.name);
      return {
        id: brand.id,
        name: brand.name,
        tag: brand.tag,
        count: brand.count,
        inStock: items.filter((product) => totalStock(product) > 0).length,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const popular = [...list].sort((a, b) => b.count - a.count).slice(0, 8);
  const heroBrands = popular.slice(0, 6);

  return (
    <main id="main-content" className="brands-page">
      <div className="container">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span>/</span>
          <span className="is-current">Brands</span>
        </nav>

        <section className="brands-hero" aria-labelledby="brands-title">
          <div className="brands-hero__copy">
            <p className="eyebrow">The brand directory</p>
            <h1 id="brands-title">Shop by brand</h1>
            <p className="brands-hero__lead">
              Every brand on the shelf, in one place. Search the directory, jump to a letter,
              or start with a popular name, then see the full range, sizes and options on each
              brand page.
            </p>
            <div className="brands-hero__stats">
              <div>
                <b>{brands.length}</b>
                <span>brands</span>
              </div>
              <div>
                <b>{products.length}</b>
                <span>products</span>
              </div>
              <div>
                <b>7</b>
                <span>days open</span>
              </div>
            </div>
          </div>
          <div className="brands-hero__art" aria-hidden="true">
            {heroBrands.map((brand) => (
              <span className="brands-hero__logo" key={brand.id}>
                <img
                  src={`/assets/img/brand-${brand.id}.svg`}
                  alt=""
                  width={180}
                  height={180}
                  loading="eager"
                  decoding="async"
                />
              </span>
            ))}
          </div>
        </section>

        <section className="brands-popular" aria-labelledby="popular-brands-title">
          <h2 className="brands-popular__label" id="popular-brands-title">
            Popular right now
          </h2>
          <div className="brands-popular__chips">
            {popular.map((brand) => (
              <a className="brand-chip" href={`/brand-${brand.id}`} key={brand.id}>
                {brand.name}
                <span>{brand.count}</span>
              </a>
            ))}
          </div>
        </section>

        <BrandsExplorer brands={list} />
      </div>

      <section className="features" aria-label="Store facts">
        <div className="container features__inner">
          <div className="feature">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 21s7-5.8 7-11a7 7 0 1 0-14 0c0 5.2 7 11 7 11z" />
              <circle cx={12} cy={10} r="2.6" />
            </svg>
            <div>
              <h3>Visit our store</h3>
              <p>No 118, Justice Akbar Mawatha, Colombo 02</p>
              <a className="feature__link" href="/stores">
                Directions &amp; hours
              </a>
            </div>
          </div>
          <div className="feature">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx={12} cy={12} r={9} />
              <path d="M12 7.5V12l3 2" />
            </svg>
            <div>
              <h3>Open 7 days</h3>
              <p>8.00am–9.30pm · Friday from 1.30pm</p>
              <a className="feature__link" href="/stores">
                See opening hours
              </a>
            </div>
          </div>
          <div className="feature">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7.5h11v8H3z" />
              <path d="M14 10.5h4l3 3v2h-7z" />
              <circle cx={7} cy={17} r="1.8" />
              <circle cx="17.5" cy={17} r="1.8" />
            </svg>
            <div>
              <h3>Island-wide delivery</h3>
              <p>Delivered across Sri Lanka</p>
              <a className="feature__link" href="/shipping-returns">
                Delivery &amp; returns
              </a>
            </div>
          </div>
          <div className="feature">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3A2.5 2.5 0 0 1 18 20C10.3 20 4 13.7 4 6a2.5 2.5 0 0 1 2.5-2.5z" />
            </svg>
            <div>
              <h3>
                <a href="tel:+94776290490">077 629 0490</a>
              </h3>
              <p>Call or WhatsApp · 077 629 0490</p>
              <a
                className="feature__link"
                href="https://wa.me/94776290490"
                target="_blank"
                rel="noopener"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
